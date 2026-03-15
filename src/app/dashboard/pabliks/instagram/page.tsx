'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

/* ───── types ───── */
interface Pablik {
  id: number
  username: string
  subscribers: number
  cost_post: number
  sell_post: number
  cityName: string
  catName: string
  catIcon: string
  custom?: boolean
}
interface SavedSelection { name: string; usernames: string[]; mode: 'client'|'full'; date: string }

/* ───── constants ───── */
const MAIN_CITIES = ['Алматы','Астана','Шымкент','Караганда','Уральск','Павлодар','Петропавловск','Семей','Актобе','Атырау','Усть-Каменогорск','Кокшетау','Актау','Костанай','Тараз','Жезказган','Кызылорда','Талдыкорган','Крупные (РК)','Регионы']
const BUDGET_PRESETS = [{l:'300К',v:300000},{l:'500К',v:500000},{l:'1М',v:1000000},{l:'2М',v:2000000},{l:'5М',v:5000000}]
const PAGE_SIZE = 100

const CITY_COORDS: Record<string,[number,number]> = {
  'Алматы':[820,380],'Астана':[600,200],'Шымкент':[620,430],'Караганда':[650,250],
  'Уральск':[150,200],'Павлодар':[700,170],'Петропавловск':[580,120],'Семей':[780,220],
  'Актобе':[300,250],'Атырау':[130,300],'Усть-Каменогорск':[830,220],'Кокшетау':[560,160],
  'Актау':[80,370],'Костанай':[380,160],'Тараз':[660,400],'Жезказган':[500,300],
  'Кызылорда':[420,380],'Талдыкорган':[810,330]
}

const KZ_OUTLINE = "M 50,180 L 80,120 L 200,80 L 350,70 L 500,90 L 600,80 L 750,100 L 880,130 L 950,180 L 960,250 L 920,320 L 870,380 L 820,420 L 700,460 L 580,470 L 450,440 L 350,420 L 250,380 L 150,350 L 80,310 L 50,250 Z"

const fmt = (n: number) => n.toLocaleString('ru-RU')
const fmtK = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return n.toString()
}
const getReach = (p: Pablik) => {
  if (p.subscribers <= 0) return { min: 0, max: 0, avg: 0 }
  const min = Math.round(p.subscribers * 0.03)
  const max = Math.round(p.subscribers * 0.07)
  const avg = Math.round(p.subscribers * 0.05)
  return { min, max, avg }
}
const fmtReach = (p: Pablik) => { const r = getReach(p); return r.avg > 0 ? fmtK(r.min) + '–' + fmtK(r.max) : '—' }

/* ═══════════════════ COMPONENT ═══════════════════ */
export default function InstagramCatalogPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const [pabliks, setPabliks] = useState<Pablik[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<{name:string;icon:string}[]>([])
  const [loading, setLoading] = useState(true)

  const [selCities, setSelCities] = useState<Set<string>>(new Set())
  const [selCats, setSelCats] = useState<Set<string>>(new Set())
  const [minSubs, setMinSubs] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10_000_000)
  const [budget, setBudget] = useState(10_000_000)
  const [igSearch, setIgSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [showMoreCities, setShowMoreCities] = useState(false)
  const [minReach, setMinReach] = useState(0)

  const [mode, setMode] = useState<'client'|'full'>('full')
  const [viewMode, setViewMode] = useState<'table'|'cards'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [showCount, setShowCount] = useState(PAGE_SIZE)
  const [sortCol, setSortCol] = useState<string>('s')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [hoveredCity, setHoveredCity] = useState<string|null>(null)
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([])
  const [apIg, setApIg] = useState(''); const [apCity, setApCity] = useState(''); const [apCat, setApCat] = useState('')
  const [apSubs, setApSubs] = useState(''); const [apCost, setApCost] = useState(''); const [apPrice, setApPrice] = useState('')

  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const showToast = (msg: string) => { setToast(msg); if(toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(()=>setToast(''), 3000) }

  // Default to cards on mobile
  useEffect(() => {
    if (window.innerWidth < 640) setViewMode('cards')
  }, [])

  /* ═══ load ═══ */
  useEffect(() => {
    (async () => {
      const [{ data: media }, { data: citiesData }, { data: catsData }] = await Promise.all([
        supabase.from('media_resources').select('id, username, subscribers, cost_post, sell_post, city:cities(name), category:categories(name, icon)').eq('platform','instagram').order('subscribers',{ascending:false}),
        supabase.from('cities').select('name').order('name'),
        supabase.from('categories').select('name, icon').order('name'),
      ])
      const rows: Pablik[] = (media||[]).map((r:any)=>({ id:r.id, username:r.username||'', subscribers:r.subscribers||0, cost_post:r.cost_post||0, sell_post:r.sell_post||0, cityName:r.city?.name||'', catName:r.category?.name||'', catIcon:r.category?.icon||'' }))
      try { const custom:Pablik[] = JSON.parse(localStorage.getItem('pabliki_custom_ig')||'[]'); for(const cp of custom) if(!rows.find(r=>r.username===cp.username)) rows.push({...cp,custom:true}) } catch{}
      setPabliks(rows)
      setAllCities((citiesData||[]).map((c:any)=>c.name))
      setAllCategories((catsData||[]).map((c:any)=>({name:c.name,icon:c.icon||''})))
      try { setSavedSelections(JSON.parse(localStorage.getItem('pabliki_saved_ig')||'[]')) } catch{}
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ═══ filtering ═══ */
  const getFiltered = useCallback(() => pabliks.filter(p => {
    if(selCities.size>0 && !selCities.has(p.cityName)) return false
    if(selCats.size>0 && !selCats.has(p.catName)) return false
    if(p.subscribers<minSubs) return false
    if(maxPrice<10_000_000 && p.sell_post>maxPrice) return false
    if(igSearch && !p.username.toLowerCase().includes(igSearch.toLowerCase().replace('@',''))) return false
    if(showSelectedOnly && !selected.has(p.username)) return false
    if(minReach > 0) { const r = getReach(p); if(r.avg < minReach) return false }
    return true
  }), [pabliks,selCities,selCats,minSubs,maxPrice,igSearch,showSelectedOnly,selected,minReach])

  const filtered = getFiltered()
  const sorted = [...filtered].sort((a,b) => {
    let av:any, bv:any
    switch(sortCol){
      case 'c': av=a.cityName;bv=b.cityName;break; case 'ig': av=a.username;bv=b.username;break
      case 't': av=a.catName;bv=b.catName;break; case 's': av=a.subscribers;bv=b.subscribers;break
      case 'co': av=a.cost_post;bv=b.cost_post;break; case 'p': av=a.sell_post;bv=b.sell_post;break
      case 'm': av=a.sell_post-a.cost_post;bv=b.sell_post-b.cost_post;break
      case 'mp': av=a.sell_post>0?(a.sell_post-a.cost_post)/a.sell_post:0;bv=b.sell_post>0?(b.sell_post-b.cost_post)/b.sell_post:0;break
      case 'reach': av=getReach(a).avg;bv=getReach(b).avg;break
      default: av=a.subscribers;bv=b.subscribers
    }
    if(typeof av==='string') return sortDir==='asc'?av.localeCompare(bv,'ru'):bv.localeCompare(av,'ru')
    return sortDir==='asc'?av-bv:bv-av
  })
  const shown = sorted.slice(0,showCount)
  const hasMore = showCount < sorted.length

  /* selection stats */
  const allSel = pabliks.filter(p=>selected.has(p.username))
  const totalSubs = allSel.reduce((s,p)=>s+p.subscribers,0)
  const totalSelReach = allSel.reduce((s,p)=>s+getReach(p).avg,0)
  const totalPrice = allSel.reduce((s,p)=>s+p.sell_post,0)
  const totalCost = allSel.reduce((s,p)=>s+p.cost_post,0)
  const totalMarginPct = totalPrice>0?Math.round((totalPrice-totalCost)/totalPrice*100):0

  /* dashboard stats */
  const uniqueCities = new Set(pabliks.map(p=>p.cityName).filter(Boolean))
  const totalAllSubs = pabliks.reduce((s,p)=>s+p.subscribers,0)
  const pablicsWithSubs = pabliks.filter(p => p.subscribers > 0 && p.sell_post > 0)
  const totalReach = pabliks.reduce((s,p)=>s+getReach(p).avg,0)

  /* city counts for map */
  const cityCounts: Record<string,number> = {}
  pabliks.forEach(p => { if(p.cityName) cityCounts[p.cityName] = (cityCounts[p.cityName]||0)+1 })
  const maxCityCount = Math.max(...Object.values(cityCounts), 1)

  /* helpers */
  const toggleSelect = (ig:string) => setSelected(prev=>{const s=new Set(prev);s.has(ig)?s.delete(ig):s.add(ig);return s})
  const toggleSort = (col:string) => { if(sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortCol(col);setSortDir('desc')} }
  const sortArrow = (col:string) => sortCol===col?(sortDir==='asc'?' ↑':' ↓'):''
  const toggleCity = (c:string) => { setSelCities(prev=>{const s=new Set(prev);s.has(c)?s.delete(c):s.add(c);return s}); setShowCount(PAGE_SIZE) }
  const toggleCat = (c:string) => { setSelCats(prev=>{const s=new Set(prev);s.has(c)?s.delete(c):s.add(c);return s}); setShowCount(PAGE_SIZE) }
  const selectAllFiltered = () => {
    const all = filtered.every(p=>selected.has(p.username))&&filtered.length>0
    setSelected(prev=>{const s=new Set(prev);if(all)filtered.forEach(p=>s.delete(p.username));else filtered.forEach(p=>s.add(p.username));return s})
  }
  const autoSelectByBudget = (b:number) => {
    setBudget(b); if(b>=10_000_000) return
    const f = getFiltered(); const ns = new Set<string>(); let t=0
    for(const p of f) if(t+p.sell_post<=b){ns.add(p.username);t+=p.sell_post}
    setSelected(ns); showToast(`✅ ${ns.size} пабликов · ${fmt(t)}₸`)
  }

  /* preset selections */
  const presetAlmaty = () => {
    const s = new Set<string>()
    pabliks.filter(p=>p.cityName==='Алматы').forEach(p=>s.add(p.username))
    setSelected(s); showToast(`🏙 Алматы: ${s.size} пабликов`)
  }
  const presetTop50 = () => {
    const s = new Set<string>()
    const top = [...pabliks].sort((a,b)=>b.subscribers-a.subscribers).slice(0,50)
    top.forEach(p=>s.add(p.username))
    setSelected(s); showToast(`🔝 Топ-50 выбрано`)
  }
  const presetBudget500 = () => {
    const s = new Set<string>(); let t=0
    const sorted500 = [...pabliks].sort((a,b)=>a.sell_post-b.sell_post)
    for(const p of sorted500) if(t+p.sell_post<=500000){s.add(p.username);t+=p.sell_post}
    setSelected(s); showToast(`💰 ${s.size} пабликов · ${fmt(t)}₸`)
  }
  const presetAllRegions = () => {
    const s = new Set<string>(); const seen = new Set<string>()
    const byCity = [...pabliks].sort((a,b)=>b.subscribers-a.subscribers)
    for(const p of byCity) if(p.cityName && !seen.has(p.cityName)){seen.add(p.cityName);s.add(p.username)}
    setSelected(s); showToast(`🌍 ${s.size} городов`)
  }

  const addCustomPablik = () => {
    const ig=apIg.trim().replace('@','').toLowerCase()
    if(!ig){showToast('Введите Instagram');return} if(!apCity){showToast('Введите город');return}
    if(!apSubs||parseInt(apSubs)<=0){showToast('Введите подписчиков');return} if(!apPrice||parseInt(apPrice)<=0){showToast('Введите цену');return}
    if(pabliks.find(p=>p.username===ig)){showToast('⚠️ @'+ig+' уже в базе');return}
    const np:Pablik = {id:Date.now(),username:ig,cityName:apCity,catName:apCat||'Общие',catIcon:'📱',subscribers:parseInt(apSubs),cost_post:parseInt(apCost)||0,sell_post:parseInt(apPrice),custom:true}
    setPabliks(prev=>[...prev,np])
    try{const c=JSON.parse(localStorage.getItem('pabliki_custom_ig')||'[]');c.push(np);localStorage.setItem('pabliki_custom_ig',JSON.stringify(c))}catch{}
    setShowAddModal(false);setApIg('');setApCity('');setApCat('');setApSubs('');setApCost('');setApPrice('');showToast('✅ @'+ig+' добавлен!')
  }
  const deleteCustomPablik = (ig:string) => {
    setPabliks(prev=>prev.filter(p=>p.username!==ig));setSelected(prev=>{const s=new Set(prev);s.delete(ig);return s})
    try{const c=JSON.parse(localStorage.getItem('pabliki_custom_ig')||'[]').filter((p:any)=>p.username!==ig);localStorage.setItem('pabliki_custom_ig',JSON.stringify(c))}catch{}
    showToast('🗑 @'+ig+' удалён')
  }
  const saveSelection = () => {
    const name=prompt('Название подборки:');if(!name) return
    const sel:SavedSelection={name,usernames:[...selected],mode,date:new Date().toLocaleDateString('ru-RU')}
    const list=[...savedSelections,sel];setSavedSelections(list);localStorage.setItem('pabliki_saved_ig',JSON.stringify(list));showToast('💾 '+name)
  }
  const loadSelection = (sel:SavedSelection) => {setSelected(new Set(sel.usernames));setMode(sel.mode);setShowSavedModal(false);showToast('📂 '+sel.name)}
  const deleteSelection = (i:number) => {const list=savedSelections.filter((_,j)=>j!==i);setSavedSelections(list);localStorage.setItem('pabliki_saved_ig',JSON.stringify(list))}

  /* Excel export */
  const exportExcel = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const isC = mode==='client'
    const BOM = '\uFEFF'
    const sep = ';'
    const headers = ['№','Город','Instagram','Категория','Подписчики','Охват (прогноз)',...(isC?[]:['Себестоимость']),'Цена',...(isC?[]:['Маржа','Маржа %'])]
    const rows = allSel.map((p,i)=>{
      const mPct = p.sell_post>0?Math.round((p.sell_post-p.cost_post)/p.sell_post*100):0
      return [i+1,p.cityName,'@'+p.username,p.catName,p.subscribers,fmtReach(p),...(isC?[]:[p.cost_post]),p.sell_post,...(isC?[]:[p.sell_post-p.cost_post,mPct+'%'])]
    })
    const totals = ['','ИТОГО','','',totalSubs,...(isC?[]:[totalCost]),totalPrice,'',...(isC?[]:[totalPrice-totalCost,totalMarginPct+'%'])]
    const csv = BOM + [headers,...rows,totals].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(sep)).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='mediaplan-pabliki-'+new Date().toISOString().slice(0,10)+'.csv'; a.click()
    URL.revokeObjectURL(url); showToast('📊 Excel скачан')
  }

  /* PDF */
  const exportPDF = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const isC = mode==='client'; const date = new Date().toLocaleDateString('ru-RU')
    const rows = allSel.map((p,i)=>{
      const m=p.sell_post>0?Math.round((p.sell_post-p.cost_post)/p.sell_post*100):0; const mT=p.sell_post-p.cost_post
      const mc = m>=50?'#16a34a':m>=30?'#ca8a04':'#dc2626'
      return `<tr style="border-bottom:1px solid #e8edf3"><td style="padding:10px 12px;color:#94a3b8;font-size:12px">${i+1}</td><td style="padding:10px 12px;font-weight:600;color:#1e293b">${p.cityName}</td><td style="padding:10px 12px"><a href="https://instagram.com/${p.username}" target="_blank" style="color:#0ea5e9;text-decoration:none;font-weight:500">@${p.username}</a></td><td style="padding:10px 12px;font-size:12px;color:#64748b">${p.catName}</td><td style="padding:10px 12px;text-align:right;font-weight:500">${fmt(p.subscribers)}</td><td style="padding:10px 12px;text-align:right;color:#0ea5e9;font-weight:500">${fmtReach(p)}</td>${!isC?`<td style="padding:10px 12px;text-align:right;color:#64748b">${fmt(p.cost_post)}₸</td>`:''}
      <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(p.sell_post)}₸</td>${!isC?`<td style="padding:10px 12px;text-align:right;font-weight:600;color:${mc}">${fmt(mT)}₸</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:${mc}">${m}%</td>`:''}</tr>`
    }).join('')
    const orient = isC?'portrait':'landscape'
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;background:#fff;font-size:12px}.top-bar{position:sticky;top:0;z-index:100;display:flex;gap:8px;padding:12px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.top-bar button{padding:10px 20px;background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s}.top-bar button:hover{background:#0284c7}.top-bar button:nth-child(2){background:#8b5cf6}.top-bar button:nth-child(3){background:#10b981}@media print{.top-bar{display:none}}.page{max-width:100%;margin:0 auto;padding:24px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#fff;border-bottom:2px solid #0ea5e9;padding:10px 12px;background:linear-gradient(135deg,#0ea5e9,#3b82f6)}@media print{body{font-size:10px}}</style></head><body>
    <div class="top-bar"><button onclick="window.close()">← Закрыть</button><button onclick="sharePdf()">📤 Скачать PDF</button><button onclick="window.print()">🖨 Печать</button></div>
    <div class="page" id="pdfContent">
    <div style="background:linear-gradient(135deg,#0ea5e9,#3b82f6);border-radius:16px;padding:24px 32px;margin-bottom:24px;text-align:center;color:#fff">
      <img src="/logo-pabliki-light.png" style="height:40px;margin-bottom:8px;filter:brightness(10)" onerror="this.outerHTML='<div style=\\'font-size:28px;font-weight:800;letter-spacing:2px\\'>PABLIKI.KZ</div>'">
      <div style="font-size:14px;opacity:0.85;margin-top:6px">${isC?'Медиаплан':'Внутренний медиаплан'} от ${date}</div>
    </div>
    <div style="display:flex;justify-content:center;gap:16px;margin:20px 0;flex-wrap:wrap">
      ${[
        {label:'пабликов',value:String(allSel.length)},
        {label:'аудитория',value:fmtK(totalSubs)},
        {label:'охват (прогноз)',value:fmtK(totalSelReach)},
        {label:'стоимость',value:fmt(totalPrice)+'₸'},
        ...(isC?[]:[{label:'маржа',value:fmt(totalPrice-totalCost)+'₸ ('+totalMarginPct+'%)'}])
      ].map(s=>`<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:2px solid #bae6fd;border-radius:12px;padding:16px;text-align:center"><div style="font-size:24px;font-weight:800;color:#0369a1">${s.value}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">${s.label}</div></div>`).join('')}
    </div>
    <table><thead><tr><th>№</th><th>Город</th><th>Instagram</th><th>Категория</th><th style="text-align:right">Подписчики</th><th style="text-align:right">Охват</th>${!isC?'<th style="text-align:right">Себест.</th>':''}<th style="text-align:right">Цена</th>${!isC?'<th style="text-align:right">Маржа</th><th style="text-align:right">%</th>':''}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="6" style="padding:12px;font-weight:700;border-top:2px solid #0ea5e9">ИТОГО</td>${!isC?`<td style="padding:12px;text-align:right;font-weight:700;border-top:2px solid #0ea5e9">${fmt(totalCost)}₸</td>`:''}
    <td style="padding:12px;text-align:right;font-weight:800;color:#0ea5e9;border-top:2px solid #0ea5e9">${fmt(totalPrice)}₸</td>${!isC?`<td style="padding:12px;text-align:right;font-weight:800;color:#10b981;border-top:2px solid #0ea5e9">${fmt(totalPrice-totalCost)}₸</td><td style="padding:12px;text-align:right;font-weight:800;color:#10b981;border-top:2px solid #0ea5e9">${totalMarginPct}%</td>`:''}</tr></tfoot></table>
    <div style="text-align:center;margin-top:32px;padding:20px;border-top:2px solid #e2e8f0">
      <div style="font-size:13px;font-weight:700;color:#0ea5e9;margin-bottom:4px">PABLIKI.KZ</div>
      <div style="font-size:11px;color:#64748b">+7 777 069 82 92 · WhatsApp</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Реклама в Instagram пабликах Казахстана</div>
    </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
    <script>function sharePdf(){var el=document.getElementById("pdfContent");var f="mediaplan-pabliki-"+new Date().toISOString().slice(0,10)+".pdf";if(typeof html2pdf==="undefined"){window.print();return}html2pdf().set({margin:[8,4,8,4],filename:f,image:{type:"jpeg",quality:0.95},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"${orient}"}}).from(el).outputPdf("blob").then(function(b){var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download=f;a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}).catch(function(){window.print()})}<\/script></body></html>`
    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()} else showToast('Разрешите всплывающие окна')
  }

  const shareSel = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const text = `Медиаплан Pabliki.kz\n${allSel.length} пабликов · ${fmtK(totalSubs)} подп. · ${fmt(totalPrice)}₸\n\n`+allSel.map((p,i)=>`${i+1}. ${p.cityName} — @${p.username} (${fmtK(p.subscribers)}) — ${fmt(p.sell_post)}₸`).join('\n')+`\n\nИтого: ${fmt(totalPrice)}₸\npabliki.kz`
    navigator.clipboard.writeText(text).then(()=>showToast('📋 Скопировано!')).catch(()=>showToast('Ошибка'))
  }

  /* city chips */
  const usedSet = new Set(pabliks.map(p=>p.cityName))
  const mainCF = citySearch ? [...usedSet].filter(c=>c.toLowerCase().includes(citySearch.toLowerCase())).sort((a,b)=>a.localeCompare(b,'ru')) : MAIN_CITIES.filter(c=>usedSet.has(c))
  const otherC = citySearch ? [] : [...usedSet].filter(c=>!MAIN_CITIES.includes(c)).sort((a,b)=>a.localeCompare(b,'ru'))
  const mColor = (pct:number) => pct>=50?'text-emerald-400':pct>=30?'text-yellow-400':'text-red-400'

  /* compare */
  const canCompare = allSel.length >= 2 && allSel.length <= 3

  /* ── Chip ── */
  const Chip = ({active,onClick,children,accent=false}:{active:boolean;onClick:()=>void;children:React.ReactNode;accent?:boolean}) => (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
      active
        ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/25'
        : accent
          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25'
          : 'bg-gray-800/80 text-gray-300 border-gray-700/50 hover:bg-gray-700 hover:text-white hover:border-gray-600'
    }`}>
      {children}
    </button>
  )

  /* ══════════════ RENDER ══════════════ */
  if(loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"/><div className="text-gray-400 text-sm">Загрузка пабликов...</div></div>
    </div>
  )

  return (
    <div className="max-w-full pb-32">
      {/* Animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleCheck { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .anim-fade-in-up { animation: fadeInUp 0.4s ease-out both; }
        .anim-fade-in { animation: fadeIn 0.3s ease-out both; }
        .anim-scale-check { animation: scaleCheck 0.25s ease-out; }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { box-shadow: 0 0 20px rgba(14,165,233,0.15); transform: translateY(-2px); }
        .row-appear { animation: fadeIn 0.3s ease-out both; }
      `}</style>

      {/* Toast */}
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sky-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-sky-500/30 text-sm font-semibold anim-fade-in">{toast}</div>}

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-1">
          <button onClick={()=>router.push('/dashboard/pabliks')} className="w-10 h-10 rounded-xl bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition text-lg border border-gray-700/50">←</button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-pabliki-dark.png" alt="Pabliki.KZ" className="h-8 sm:h-9" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
            </div>
            <p className="text-gray-400 text-sm">Создай медиаплан из <span className="text-sky-400 font-semibold">{pabliks.length}</span> пабликов</p>
          </div>
          <button onClick={()=>setShowAddModal(true)} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-400/30">
            + Добавить паблик
          </button>
        </div>
      </div>

      {/* ── Mini Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Всего пабликов', value: pabliks.length, icon: '📊' },
          { label: 'Городов', value: uniqueCities.size, icon: '🏙️' },
          { label: 'Суммарная аудитория', value: fmtK(totalAllSubs), icon: '👥' },
          { label: 'Прогноз охвата', value: fmtK(totalReach), icon: '👁' },
        ].map((card, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl bg-gray-900/60 border border-sky-500/20 p-4 sm:p-5 backdrop-blur anim-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-blue-500/5 pointer-events-none" />
            <div className="relative">
              <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{card.value}</div>
              <div className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">{card.icon} {card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Saved ── */}
      {savedSelections.length>0 && (
        <button onClick={()=>setShowSavedModal(true)} className="mb-5 flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-500/20 hover:border-sky-500/40">
          <span>📂</span> Сохранённые подборки <span className="bg-sky-500/20 px-2 py-0.5 rounded-full text-xs">{savedSelections.length}</span>
        </button>
      )}

      {/* ── Mode + View toggle ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-0.5 p-1 bg-gray-900/80 rounded-2xl w-fit border border-gray-800/50">
          <button onClick={()=>setMode('client')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode==='client'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>
            👤 Для клиента
          </button>
          <button onClick={()=>setMode('full')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode==='full'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>
            📊 Полная
          </button>
        </div>
        <div className="flex gap-0.5 p-1 bg-gray-900/80 rounded-2xl w-fit border border-gray-800/50">
          <button onClick={()=>setViewMode('table')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode==='table'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>
            📊 Таблица
          </button>
          <button onClick={()=>setViewMode('cards')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode==='cards'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>
            🃏 Карточки
          </button>
        </div>
      </div>

      {/* ── Kazakhstan Map ── */}
      <div className="mb-5">
        <button onClick={()=>setShowMap(!showMap)} className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition mb-3 bg-gray-900/40 px-4 py-2.5 rounded-xl border border-gray-800/50 hover:border-gray-700">
          🗺️ Карта Казахстана {showMap ? '▲' : '▼'}
        </button>
        {showMap && (
          <div className="bg-gray-900/40 rounded-2xl p-4 border border-gray-800/50 anim-fade-in">
            <svg viewBox="0 0 1000 500" className="w-full max-h-[300px]">
              <path d={KZ_OUTLINE} fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" strokeWidth="2" />
              {Object.entries(CITY_COORDS).map(([city, [cx, cy]]) => {
                const count = cityCounts[city] || 0
                const r = Math.max(6, Math.min(22, (count / maxCityCount) * 22))
                const opacity = count > 0 ? 0.4 + (count / maxCityCount) * 0.6 : 0.2
                return (
                  <g key={city} className="cursor-pointer" onClick={() => { toggleCity(city); setShowCount(PAGE_SIZE) }} onMouseEnter={() => setHoveredCity(city)} onMouseLeave={() => setHoveredCity(null)}>
                    <circle cx={cx} cy={cy} r={r} fill={`rgba(14,165,233,${opacity})`} stroke="rgba(14,165,233,0.8)" strokeWidth="1.5" className="transition-all duration-300 hover:stroke-white" />
                    {count > 0 && <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="central" className="fill-white text-[8px] font-bold pointer-events-none select-none">{count}</text>}
                    {hoveredCity === city && (
                      <g>
                        <rect x={cx - 50} y={cy - 30} width="100" height="22" rx="6" fill="rgba(0,0,0,0.85)" />
                        <text x={cx} y={cy - 16} textAnchor="middle" className="fill-white text-[10px] font-medium">{city}: {count}</text>
                      </g>
                    )}
                    {hoveredCity !== city && <text x={cx} y={cy + r + 12} textAnchor="middle" className="fill-gray-500 text-[9px] select-none pointer-events-none">{city}</text>}
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      {/* ── City filter ── */}
      <div className="mb-5 bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50">
        <h4 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
          🏙️ Город {selCities.size>0 && <span className="text-sky-400 font-normal text-xs bg-sky-500/15 px-2.5 py-0.5 rounded-full">{selCities.size} выбрано</span>}
        </h4>
        <input type="text" placeholder="🔍 Поиск города..." value={citySearch} onChange={e=>setCitySearch(e.target.value)}
          className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white mb-3 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder-gray-500 transition-all" />
        <div className="flex flex-wrap gap-2">
          <Chip active={selCities.size===0} onClick={()=>{setSelCities(new Set());setCitySearch('');setShowCount(PAGE_SIZE)}}>Все города</Chip>
          {mainCF.map(c=><Chip key={c} active={selCities.has(c)} onClick={()=>toggleCity(c)}>{c}</Chip>)}
          {!citySearch && otherC.length>0 && <>
            <Chip active={false} accent onClick={()=>setShowMoreCities(!showMoreCities)}>Ещё регионы ({otherC.length}) {showMoreCities?'▲':'▼'}</Chip>
            {showMoreCities && otherC.map(c=><Chip key={c} active={selCities.has(c)} onClick={()=>toggleCity(c)}>{c}</Chip>)}
          </>}
        </div>
      </div>

      {/* ── Category ── */}
      <div className="mb-5 bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50">
        <h4 className="text-sm font-bold text-gray-200 mb-3">📂 Категория</h4>
        <div className="flex flex-wrap gap-2">
          <Chip active={selCats.size===0} onClick={()=>setSelCats(new Set())}>Все категории</Chip>
          {allCategories.map(c=><Chip key={c.name} active={selCats.has(c.name)} onClick={()=>toggleCat(c.name)}>{c.icon} {c.name}</Chip>)}
        </div>
      </div>

      {/* ── Sliders ── */}
      <div className="mb-5 bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50 space-y-5">
        <div>
          <div className="flex justify-between text-xs mb-2"><span className="text-gray-400 font-medium">Мин. подписчики</span><span className="text-white font-bold bg-gray-800 px-2.5 py-0.5 rounded-lg">{fmt(minSubs)}</span></div>
          <input type="range" min={0} max={500000} step={5000} value={minSubs} onChange={e=>{setMinSubs(+e.target.value);setShowCount(PAGE_SIZE)}}
            className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-sky-500/40 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-400" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-2"><span className="text-gray-400 font-medium">Макс. цена за 1 паблик</span><span className="text-white font-bold bg-gray-800 px-2.5 py-0.5 rounded-lg">{maxPrice>=10_000_000?'∞':fmt(maxPrice)+'₸'}</span></div>
          <input type="range" min={5000} max={10_000_000} step={5000} value={maxPrice} onChange={e=>{setMaxPrice(+e.target.value);setShowCount(PAGE_SIZE)}}
            className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-sky-500/40 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-400" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-2"><span className="text-gray-400 font-medium">👁 Мин. охват (прогноз 3-7%)</span><span className="text-white font-bold bg-gray-800 px-2.5 py-0.5 rounded-lg">{minReach<=0?'Все':fmtK(minReach)}</span></div>
          <input type="range" min={0} max={50000} step={500} value={minReach} onChange={e=>{setMinReach(+e.target.value);setShowCount(PAGE_SIZE)}}
            className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-sky-500/40 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-400" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-2"><span className="text-gray-400 font-medium">💰 Общий бюджет</span><span className="text-white font-bold bg-gray-800 px-2.5 py-0.5 rounded-lg">{budget>=10_000_000?'∞':fmt(budget)+'₸'}</span></div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {BUDGET_PRESETS.map(bp=>(
              <button key={bp.v} onClick={()=>autoSelectByBudget(bp.v)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/30 hover:border-sky-500/50 transition-all">
                {bp.l}
              </button>
            ))}
          </div>
          <input type="range" min={100000} max={10_000_000} step={50000} value={budget} onChange={e=>autoSelectByBudget(+e.target.value)}
            className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-sky-500/40 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-400" />
        </div>
      </div>

      {/* ── Search ── */}
      <input type="text" placeholder="🔍 Поиск по @instagram..." value={igSearch} onChange={e=>{setIgSearch(e.target.value);setShowCount(PAGE_SIZE)}}
        className="w-full bg-gray-900/60 border border-gray-800/50 rounded-2xl px-5 py-3 text-sm text-white mb-5 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder-gray-500 transition-all" />

      {/* ── Quick presets ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={presetAlmaty} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🏙 Вся Алматы</button>
        <button onClick={presetTop50} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🔝 Топ-50 по охвату</button>
        <button onClick={presetBudget500} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">💰 До 500К₸</button>
        <button onClick={presetAllRegions} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🌍 Все регионы</button>
      </div>

      {/* ── Count & toggles ── */}
      <div className="flex items-center justify-center gap-3 flex-wrap mb-5 text-sm">
        <span className="text-gray-400">Найдено: <strong className="text-white">{filtered.length}</strong></span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">Выбрано: <strong className="text-sky-400">{allSel.length}</strong></span>
        <Chip active={filtered.length>0&&filtered.every(p=>selected.has(p.username))} onClick={selectAllFiltered}>
          {filtered.length>0&&filtered.every(p=>selected.has(p.username))?'✕ Снять все':'☑ Выбрать все'}
        </Chip>
        <Chip active={showSelectedOnly} onClick={()=>{setShowSelectedOnly(!showSelectedOnly);setShowCount(PAGE_SIZE)}}>
          {showSelectedOnly?'👁 Все':'👁 Выбранные'}
        </Chip>
        {canCompare && (
          <button onClick={()=>setShowCompareModal(true)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all">
            ⚖️ Сравнить ({allSel.length})
          </button>
        )}
      </div>

      {/* ── Selection summary ── */}
      {allSel.length>0 && (
        <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 rounded-2xl p-5 mb-5 border border-sky-500/25 backdrop-blur anim-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center sm:text-left">
              <div className="text-gray-400 text-xs font-medium mb-0.5">Пабликов</div>
              <div className="text-2xl font-bold text-white">{allSel.length}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-gray-400 text-xs font-medium mb-0.5">Аудитория</div>
              <div className="text-2xl font-bold text-white">{fmtK(totalSubs)}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-gray-400 text-xs font-medium mb-0.5">👁 Охват</div>
              <div className="text-2xl font-bold text-sky-300">{fmtK(totalSelReach)}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-gray-400 text-xs font-medium mb-0.5">Стоимость</div>
              <div className="text-2xl font-bold text-sky-400">{fmt(totalPrice)}₸</div>
            </div>
            {mode==='full' && <>
              <div className="text-center sm:text-left">
                <div className="text-gray-400 text-xs font-medium mb-0.5">Себестоимость</div>
                <div className="text-lg font-bold text-gray-300">{fmt(totalCost)}₸</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-gray-400 text-xs font-medium mb-0.5">Маржа</div>
                <div className="text-lg font-bold text-emerald-400">{fmt(totalPrice-totalCost)}₸</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-gray-400 text-xs font-medium mb-0.5">Маржинальность</div>
                <div className="text-lg font-bold text-emerald-400">{totalMarginPct}%</div>
              </div>
            </>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportPDF} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/25">📄 PDF</button>
            <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25">📊 Excel</button>
            <button onClick={shareSel} className="bg-gray-800/80 hover:bg-gray-700 text-white text-sm px-5 py-2.5 rounded-xl transition-all border border-gray-700/50">📤 Отправить</button>
            <button onClick={saveSelection} className="bg-gray-800/80 hover:bg-gray-700 text-white text-sm px-5 py-2.5 rounded-xl transition-all border border-gray-700/50">💾 Сохранить</button>
            <button onClick={()=>setSelected(new Set())} className="bg-gray-800/80 hover:bg-gray-700 text-gray-400 text-sm px-5 py-2.5 rounded-xl transition-all border border-gray-700/50">✕ Сбросить</button>
          </div>
        </div>
      )}

      {/* ── Cards View ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((p, idx) => {
            const checked = selected.has(p.username)
            const mPct = p.sell_post>0?Math.round((p.sell_post-p.cost_post)/p.sell_post*100):0
            return (
              <div key={p.username}
                className={`rounded-2xl border p-4 cursor-pointer card-hover anim-fade-in-up ${checked ? 'bg-sky-500/10 border-sky-500/30' : 'bg-gray-900/40 border-gray-800/50 hover:border-gray-700'}`}
                style={{ animationDelay: `${idx * 30}ms` }}
                onClick={() => toggleSelect(p.username)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      className="text-sky-400 hover:text-sky-300 font-semibold text-sm truncate block">@{p.username}</a>
                    <div className="text-xs text-gray-500 mt-0.5">{p.cityName} · {p.catIcon} {p.catName}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all ${checked ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30 anim-scale-check' : 'border-gray-600'}`}>
                    {checked && '✓'}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold text-white">{fmtK(p.subscribers)} <span className="text-xs text-gray-500 font-normal">подп.</span></div>
                    <div className="text-sm font-semibold text-white mt-0.5">{fmt(p.sell_post)}₸</div>
                    <div className="text-[10px] text-sky-400/70 mt-0.5">👁 Охват: {fmtReach(p)}</div>
                  </div>
                  {mode === 'full' && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{fmt(p.cost_post)}₸ себест.</div>
                      <div className={`text-sm font-bold ${mColor(mPct)}`}>{mPct}%</div>
                    </div>
                  )}
                </div>
                {p.custom && <button onClick={e => { e.stopPropagation(); deleteCustomPablik(p.username) }} className="mt-2 text-red-500/50 hover:text-red-400 text-[10px]">✕ удалить</button>}
              </div>
            )
          })}
          {shown.length === 0 && <div className="col-span-full text-center text-gray-500 py-16 text-sm">{pabliks.length === 0 ? 'Нет пабликов' : 'Ничего не найдено по фильтрам'}</div>}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="overflow-x-auto rounded-2xl border border-gray-800/50 bg-gray-900/30">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-900/90 to-gray-900/70 text-gray-400 text-left border-b border-gray-800/80">
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3 cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide" onClick={()=>toggleSort('c')}>Город{sortArrow('c')}</th>
                <th className="py-3 px-3 cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide" onClick={()=>toggleSort('ig')}>Instagram{sortArrow('ig')}</th>
                <th className="py-3 px-3 cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" onClick={()=>toggleSort('t')}>Кат.{sortArrow('t')}</th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide" onClick={()=>toggleSort('s')}>Подп.{sortArrow('s')}</th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" onClick={()=>toggleSort('reach')}>Охват{sortArrow('reach')}</th>
                {mode==='full' && <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" onClick={()=>toggleSort('co')}>Себест.{sortArrow('co')}</th>}
                <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide" onClick={()=>toggleSort('p')}>Цена{sortArrow('p')}</th>
                {mode==='full' && <>
                  <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide hidden md:table-cell" onClick={()=>toggleSort('m')}>Маржа{sortArrow('m')}</th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:text-sky-400 transition font-semibold text-xs uppercase tracking-wide" onClick={()=>toggleSort('mp')}>%{sortArrow('mp')}</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {shown.map((p, idx) => {
                const checked = selected.has(p.username)
                const mPct = p.sell_post>0?Math.round((p.sell_post-p.cost_post)/p.sell_post*100):0
                const mT = p.sell_post-p.cost_post
                return (
                  <tr key={p.username} className={`border-t border-gray-800/30 transition-all cursor-pointer row-appear ${checked?'bg-sky-500/8 hover:bg-sky-500/12':'hover:bg-gray-800/40'}`} style={{ animationDelay: `${idx * 15}ms` }} onClick={()=>toggleSelect(p.username)}>
                    <td className="py-2.5 px-3">
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center text-xs transition-all ${checked?'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30 anim-scale-check':'border-gray-600 hover:border-gray-400'}`}>
                        {checked && '✓'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-300 whitespace-nowrap text-xs font-medium">{p.cityName}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                        className="text-sky-400 hover:text-sky-300 transition font-medium">@{p.username}</a>
                      {p.custom && <button onClick={e=>{e.stopPropagation();deleteCustomPablik(p.username)}} className="ml-1.5 text-red-500/50 hover:text-red-400 text-[10px]">✕</button>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px] whitespace-nowrap hidden sm:table-cell">{p.catIcon} {p.catName}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">{fmtK(p.subscribers)}</td>
                    <td className="py-2.5 px-3 text-right text-sky-400/80 text-xs hidden sm:table-cell font-medium">{fmtReach(p)}</td>
                    {mode==='full' && <td className="py-2.5 px-3 text-right text-gray-500 hidden sm:table-cell">{fmt(p.cost_post)}₸{p.cost_post===0&&' ⚠️'}</td>}
                    <td className="py-2.5 px-3 text-right font-semibold text-white">{fmt(p.sell_post)}₸</td>
                    {mode==='full' && <>
                      <td className={`py-2.5 px-3 text-right font-semibold hidden md:table-cell ${mColor(mPct)}`}>{fmt(mT)}₸</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${mColor(mPct)}`}>{mPct}%</td>
                    </>}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length===0 && <div className="text-center text-gray-500 py-16 text-sm">{pabliks.length===0?'Нет пабликов':'Ничего не найдено по фильтрам'}</div>}
        </div>
      )}

      {/* Show more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button onClick={()=>setShowCount(c=>c+PAGE_SIZE)} className="w-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 font-semibold text-sm px-6 py-3.5 rounded-2xl transition-all border border-sky-500/25 hover:border-sky-500/40">
            Показать ещё (+{Math.min(PAGE_SIZE,sorted.length-showCount)})
          </button>
          <div className="text-xs text-gray-600 mt-2">Показано {showCount} из {sorted.length}</div>
        </div>
      )}

      {/* ═══ Compare Modal ═══ */}
      {showCompareModal && canCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowCompareModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-2xl mx-4 border border-gray-800/80 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-5">⚖️ Сравнение пабликов</h3>
            <div className={`grid gap-4 ${allSel.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {allSel.map(p => {
                const mPct = p.sell_post>0?Math.round((p.sell_post-p.cost_post)/p.sell_post*100):0
                const reach = getReach(p)
                const maxS = Math.max(...allSel.map(x=>x.subscribers))
                const maxP = Math.max(...allSel.map(x=>x.sell_post))
                const maxR = Math.max(...allSel.map(x=>getReach(x).avg))
                return (
                  <div key={p.username} className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700/30">
                    <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer" className="text-sky-400 font-semibold text-sm hover:text-sky-300">@{p.username}</a>
                    <div className="text-xs text-gray-500 mb-3">{p.cityName}</div>
                    {[
                      { label: 'Подписчики', value: fmtK(p.subscribers), pct: p.subscribers/maxS*100 },
                      { label: 'Цена', value: fmt(p.sell_post)+'₸', pct: p.sell_post/maxP*100 },
                      { label: 'Охват', value: fmtReach(p), pct: maxR>0?reach.avg/maxR*100:0 },
                      ...(mode==='full'?[{ label: 'Маржа', value: mPct+'%', pct: mPct }]:[]),
                    ].map((row,i) => (
                      <div key={i} className="mb-2">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5"><span>{row.label}</span><span className="font-bold text-white">{row.value}</span></div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${row.pct}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <button onClick={()=>setShowCompareModal(false)} className="w-full mt-5 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Закрыть</button>
          </div>
        </div>
      )}

      {/* ═══ Add Modal ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowAddModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-md mx-4 space-y-3 border border-gray-800/80 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">+ Добавить паблик</h3>
            {[
              {ph:'Instagram (без @)',v:apIg,set:setApIg},
              {ph:'Город',v:apCity,set:setApCity,list:'cityListAdd2'},
              {ph:'Подписчики',v:apSubs,set:setApSubs,type:'number'},
              {ph:'Себестоимость (₸)',v:apCost,set:setApCost,type:'number'},
              {ph:'Цена клиенту (₸)',v:apPrice,set:setApPrice,type:'number'},
            ].map((f,i)=>(
              <input key={i} placeholder={f.ph} value={f.v} onChange={e=>f.set(e.target.value)} type={f.type||'text'} list={f.list}
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder-gray-500" />
            ))}
            <datalist id="cityListAdd2">{allCities.map(c=><option key={c} value={c}/>)}</datalist>
            <select value={apCat} onChange={e=>setApCat(e.target.value)} className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white">
              <option value="">Категория</option>{allCategories.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <div className="flex gap-2 pt-3">
              <button onClick={addCustomPablik} className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/25">Добавить</button>
              <button onClick={()=>setShowAddModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Saved Modal ═══ */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowSavedModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-md mx-4 border border-gray-800/80 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">📂 Сохранённые подборки</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {savedSelections.map((sel,i)=>(
                <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all">
                  <button onClick={()=>loadSelection(sel)} className="text-left flex-1">
                    <div className="text-sm font-semibold text-white">{sel.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{sel.usernames.length} пабликов · {sel.date}</div>
                  </button>
                  <button onClick={()=>deleteSelection(i)} className="text-red-500/50 hover:text-red-400 text-sm ml-3 p-1">🗑</button>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowSavedModal(false)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}
