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
  avatarUrl?: string
}
interface SavedSelection { name: string; usernames: string[]; mode: 'client'|'full'; date: string }
interface HistoryEntry { name: string; client: string; usernames: string[]; mode: 'client'|'full'; package: string; totalPrice: number; date: string; status: 'draft'|'sent'|'accepted'|'paid' }

/* ───── constants ───── */
const MAIN_CITIES = ['Алматы','Астана','Шымкент','Караганда','Уральск','Павлодар','Петропавловск','Семей','Актобе','Атырау','Усть-Каменогорск','Кокшетау','Актау','Костанай','Тараз','Жезказган','Кызылорда','Талдыкорган','Крупные (РК)','Регионы']
const BUDGET_PRESETS = [{l:'300К',v:300000},{l:'500К',v:500000},{l:'1М',v:1000000},{l:'2М',v:2000000},{l:'5М',v:5000000}]
const PAGE_SIZE = 100

const PACKAGES = [
  { key: 'post', label: 'Пост', mult: 1 },
  { key: 'post_stories', label: 'Пост + Сторис', mult: 1.6 },
  { key: '3posts', label: '3 поста', mult: 2.7 },
  { key: 'week', label: 'Неделя', mult: 5 },
] as const
type PackageKey = typeof PACKAGES[number]['key']

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'bg-gray-500/20 text-gray-400' },
  sent: { label: 'Отправлено', color: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Принято', color: 'bg-emerald-500/20 text-emerald-400' },
  paid: { label: 'Оплачено', color: 'bg-sky-500/20 text-sky-400' },
}

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
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([])
  const [selectionHistory, setSelectionHistory] = useState<HistoryEntry[]>([])
  const [apIg, setApIg] = useState(''); const [apCity, setApCity] = useState(''); const [apCat, setApCat] = useState('')
  const [apSubs, setApSubs] = useState(''); const [apCost, setApCost] = useState(''); const [apPrice, setApPrice] = useState('')

  // PDF modal state
  const [pdfClientName, setPdfClientName] = useState('')
  const [pdfMode, setPdfMode] = useState<'client'|'full'>('full')

  // Package state
  const [activePackage, setActivePackage] = useState<PackageKey>('post')
  const pkgMult = PACKAGES.find(p => p.key === activePackage)?.mult ?? 1
  const pkgLabel = PACKAGES.find(p => p.key === activePackage)?.label ?? 'Пост'

  // Save dialog for duplicate
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDialogName, setSaveDialogName] = useState('')

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
        supabase.from('media_resources').select('id, username, subscribers, cost_post, sell_post, metadata, city:cities(name), category:categories(name, icon)').eq('platform','instagram').order('subscribers',{ascending:false}),
        supabase.from('cities').select('name').order('name'),
        supabase.from('categories').select('name, icon').order('name'),
      ])
      const rows: Pablik[] = (media||[]).map((r:any)=>({ id:r.id, username:r.username||'', subscribers:r.subscribers||0, cost_post:r.cost_post||0, sell_post:r.sell_post||0, cityName:r.city?.name||'', catName:r.category?.name||'', catIcon:r.category?.icon||'', avatarUrl:`/api/avatar/${r.username||''}` }))
      try { const custom:Pablik[] = JSON.parse(localStorage.getItem('pabliki_custom_ig')||'[]'); for(const cp of custom) if(!rows.find(r=>r.username===cp.username)) rows.push({...cp,custom:true}) } catch{}
      setPabliks(rows)
      setAllCities((citiesData||[]).map((c:any)=>c.name))
      setAllCategories((catsData||[]).map((c:any)=>({name:c.name,icon:c.icon||''})))
      try { setSavedSelections(JSON.parse(localStorage.getItem('pabliki_saved_ig')||'[]')) } catch{}
      try { setSelectionHistory(JSON.parse(localStorage.getItem('pabliki_selection_history')||'[]')) } catch{}
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ═══ price helper with package multiplier ═══ */
  const getPrice = (p: Pablik) => Math.round(p.sell_post * pkgMult)
  const getCost = (p: Pablik) => Math.round(p.cost_post * pkgMult)

  /* ═══ filtering ═══ */
  const getFiltered = useCallback(() => pabliks.filter(p => {
    if(selCities.size>0 && !selCities.has(p.cityName)) return false
    if(selCats.size>0 && !selCats.has(p.catName)) return false
    if(p.subscribers<minSubs) return false
    if(maxPrice<10_000_000 && getPrice(p)>maxPrice) return false
    if(igSearch && !p.username.toLowerCase().includes(igSearch.toLowerCase().replace('@',''))) return false
    if(showSelectedOnly && !selected.has(p.username)) return false
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pabliks,selCities,selCats,minSubs,maxPrice,igSearch,showSelectedOnly,selected,pkgMult])

  const filtered = getFiltered()
  const sorted = [...filtered].sort((a,b) => {
    const aS = selected.has(a.username) ? 1 : 0
    const bS = selected.has(b.username) ? 1 : 0
    if (aS !== bS) return bS - aS

    let av:any, bv:any
    switch(sortCol){
      case 'c': av=a.cityName;bv=b.cityName;break; case 'ig': av=a.username;bv=b.username;break
      case 't': av=a.catName;bv=b.catName;break; case 's': av=a.subscribers;bv=b.subscribers;break
      case 'co': av=getCost(a);bv=getCost(b);break; case 'p': av=getPrice(a);bv=getPrice(b);break
      case 'm': av=getPrice(a)-getCost(a);bv=getPrice(b)-getCost(b);break
      case 'mp': av=getPrice(a)>0?(getPrice(a)-getCost(a))/getPrice(a):0;bv=getPrice(b)>0?(getPrice(b)-getCost(b))/getPrice(b):0;break
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
  const totalPrice = allSel.reduce((s,p)=>s+getPrice(p),0)
  const totalCost = allSel.reduce((s,p)=>s+getCost(p),0)
  const totalMarginPct = totalPrice>0?Math.round((totalPrice-totalCost)/totalPrice*100):0

  /* dashboard stats */
  const uniqueCities = new Set(pabliks.map(p=>p.cityName).filter(Boolean))
  const totalAllSubs = pabliks.reduce((s,p)=>s+p.subscribers,0)
  const totalReach = pabliks.reduce((s,p)=>s+getReach(p).avg,0)

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
    for(const p of f) if(t+getPrice(p)<=b){ns.add(p.username);t+=getPrice(p)}
    setSelected(ns); showToast(`✅ ${ns.size} пабликов · ${fmt(t)}₸`)
  }

  /* preset selections */
  const presetCity = (cityName: string) => {
    const s = new Set<string>()
    pabliks.filter(p=>p.cityName===cityName).forEach(p=>s.add(p.username))
    setSelected(s); showToast(`🏙 ${cityName}: ${s.size} пабликов`)
  }
  const presetCities = (cities: string[]) => {
    const s = new Set<string>()
    pabliks.filter(p=>cities.includes(p.cityName)).forEach(p=>s.add(p.username))
    setSelected(s); showToast(`🏙 ${cities.join(' + ')}: ${s.size} пабликов`)
  }
  const presetTop5Cities = () => {
    const cityCount: Record<string, number> = {}
    pabliks.forEach(p => { if(p.cityName) cityCount[p.cityName] = (cityCount[p.cityName]||0) + 1 })
    const top5 = Object.entries(cityCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0])
    presetCities(top5)
  }
  const presetTop50 = () => {
    const s = new Set<string>()
    const top = [...pabliks].sort((a,b)=>b.subscribers-a.subscribers).slice(0,50)
    top.forEach(p=>s.add(p.username))
    setSelected(s); showToast(`🔝 Топ-50 выбрано`)
  }
  const presetBudget500 = () => {
    const s = new Set<string>(); let t=0
    const sorted500 = [...pabliks].sort((a,b)=>getPrice(a)-getPrice(b))
    for(const p of sorted500) if(t+getPrice(p)<=500000){s.add(p.username);t+=getPrice(p)}
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

  const doSaveSelection = (name: string) => {
    const sel:SavedSelection={name,usernames:[...selected],mode,date:new Date().toLocaleDateString('ru-RU')}
    const list=[...savedSelections,sel];setSavedSelections(list);localStorage.setItem('pabliki_saved_ig',JSON.stringify(list));showToast('💾 '+name)
  }
  const saveSelection = () => {
    const name=prompt('Название подборки:');if(!name) return
    doSaveSelection(name)
  }
  const loadSelection = (sel:SavedSelection) => {setSelected(new Set(sel.usernames));setMode(sel.mode);setShowSavedModal(false);showToast('📂 '+sel.name)}
  const deleteSelection = (i:number) => {const list=savedSelections.filter((_,j)=>j!==i);setSavedSelections(list);localStorage.setItem('pabliki_saved_ig',JSON.stringify(list))}
  const duplicateSelection = (sel: SavedSelection) => {
    loadSelection(sel)
    setShowSavedModal(false)
    setSaveDialogName(sel.name + ' — копия')
    setShowSaveDialog(true)
  }

  /* history */
  const saveToHistory = (name: string, client: string) => {
    const entry: HistoryEntry = {
      name, client, usernames: [...selected], mode, package: pkgLabel,
      totalPrice, date: new Date().toISOString(), status: 'draft'
    }
    const hist = [entry, ...selectionHistory]
    setSelectionHistory(hist)
    localStorage.setItem('pabliki_selection_history', JSON.stringify(hist))
  }
  const updateHistoryStatus = (idx: number, status: HistoryEntry['status']) => {
    const hist = [...selectionHistory]
    hist[idx] = { ...hist[idx], status }
    setSelectionHistory(hist)
    localStorage.setItem('pabliki_selection_history', JSON.stringify(hist))
  }
  const deleteHistoryEntry = (idx: number) => {
    const hist = selectionHistory.filter((_, i) => i !== idx)
    setSelectionHistory(hist)
    localStorage.setItem('pabliki_selection_history', JSON.stringify(hist))
  }

  /* Excel export */
  const exportExcel = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const isC = mode==='client'
    const BOM = '\uFEFF'
    const sep = ';'
    const headers = ['№','Город','Instagram','Категория','Подписчики','Охват (прогноз)',...(isC?[]:['Себестоимость']),'Цена ('+pkgLabel+')',...(isC?[]:['Маржа','Маржа %'])]
    const rows = allSel.map((p,i)=>{
      const price = getPrice(p); const cost = getCost(p)
      const mPct = price>0?Math.round((price-cost)/price*100):0
      return [i+1,p.cityName,'@'+p.username,p.catName,p.subscribers,fmtReach(p),...(isC?[]:[cost]),price,...(isC?[]:[price-cost,mPct+'%'])]
    })
    const totals = ['','ИТОГО','','',totalSubs,...(isC?[]:[totalCost]),totalPrice,'',...(isC?[]:[totalPrice-totalCost,totalMarginPct+'%'])]
    const csv = BOM + [headers,...rows,totals].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(sep)).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='mediaplan-pabliki-'+new Date().toISOString().slice(0,10)+'.csv'; a.click()
    URL.revokeObjectURL(url); showToast('📊 Excel скачан')
  }

  /* PDF - now triggered from modal */
  const doExportPDF = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const isC = pdfMode==='client'; const date = new Date().toLocaleDateString('ru-RU')
    const clientLine = pdfClientName.trim() ? `<div style="font-size:13px;opacity:0.9;margin-top:4px">Подготовлено для <strong>${pdfClientName.trim()}</strong></div>` : ''
    const waCount = allSel.length
    const waLink = `https://wa.me/77770698292?text=${encodeURIComponent('Здравствуйте! Интересует медиаплан на ' + waCount + ' пабликов')}`
    const rows = allSel.map((p,i)=>{
      const price = getPrice(p); const cost = getCost(p)
      const m=price>0?Math.round((price-cost)/price*100):0; const mT=price-cost
      const mc = m>=50?'#16a34a':m>=30?'#ca8a04':'#dc2626'
      return `<tr style="border-bottom:1px solid #e8edf3"><td style="padding:10px 12px;color:#94a3b8;font-size:12px">${i+1}</td><td style="padding:10px 12px;font-weight:600;color:#1e293b">${p.cityName}</td><td style="padding:10px 12px"><a href="https://instagram.com/${p.username}" target="_blank" style="color:#0ea5e9;text-decoration:none;font-weight:500">@${p.username}</a></td><td style="padding:10px 12px;font-size:12px;color:#64748b">${p.catName}</td><td style="padding:10px 12px;text-align:right;font-weight:500">${fmt(p.subscribers)}</td><td style="padding:10px 12px;text-align:right;color:#0ea5e9;font-weight:500">${fmtReach(p)}</td>${!isC?`<td style="padding:10px 12px;text-align:right;color:#64748b">${fmt(cost)}₸</td>`:''}
      <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(price)}₸</td>${!isC?`<td style="padding:10px 12px;text-align:right;font-weight:600;color:${mc}">${fmt(mT)}₸</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:${mc}">${m}%</td>`:''}</tr>`
    }).join('')
    const orient = isC?'portrait':'landscape'
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;background:#fff;font-size:12px}.top-bar{position:sticky;top:0;z-index:100;display:flex;gap:8px;padding:12px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.top-bar button{padding:10px 20px;background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s}.top-bar button:hover{background:#0284c7}.top-bar button:nth-child(2){background:#8b5cf6}.top-bar button:nth-child(3){background:#10b981}@media print{.top-bar{display:none}}.page{max-width:100%;margin:0 auto;padding:24px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#fff;border-bottom:2px solid #0ea5e9;padding:10px 12px;background:linear-gradient(135deg,#0ea5e9,#3b82f6)}@media print{body{font-size:10px}}</style></head><body>
    <div class="top-bar"><button onclick="window.close()">← Закрыть</button><button onclick="sharePdf()">📤 Скачать PDF</button><button onclick="window.print()">🖨 Печать</button></div>
    <div class="page" id="pdfContent">
    <div style="background:linear-gradient(135deg,#0ea5e9,#3b82f6);border-radius:16px;padding:24px 32px;margin-bottom:24px;text-align:center;color:#fff">
      <img src="/logo-pabliki-light.png" style="height:40px;margin-bottom:8px;filter:brightness(10)" onerror="this.outerHTML='<div style=\\'font-size:28px;font-weight:800;letter-spacing:2px\\'>PABLIKI.KZ</div>'">
      <div style="font-size:14px;opacity:0.85;margin-top:6px">${isC?'Медиаплан':'Внутренний медиаплан'} от ${date} · ${pkgLabel}</div>
      ${clientLine}
    </div>
    <div style="display:flex;justify-content:center;gap:16px;margin:20px 0;flex-wrap:wrap">
      ${[
        {label:'пабликов',value:String(allSel.length)},
        {label:'аудитория',value:fmtK(totalSubs)},
        {label:'охват (прогноз)',value:fmtK(totalSelReach)},
        {label:'стоимость ('+pkgLabel+')',value:fmt(totalPrice)+'₸'},
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
      <a href="${waLink}" target="_blank" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#25D366;color:#fff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600">💬 Написать в WhatsApp</a>
    </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
    <script>function sharePdf(){var el=document.getElementById("pdfContent");var f="mediaplan-pabliki-"+new Date().toISOString().slice(0,10)+".pdf";if(typeof html2pdf==="undefined"){window.print();return}html2pdf().set({margin:[8,4,8,4],filename:f,image:{type:"jpeg",quality:0.95},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"${orient}"}}).from(el).outputPdf("blob").then(function(b){var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download=f;a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}).catch(function(){window.print()})}<\/script></body></html>`
    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()} else showToast('Разрешите всплывающие окна')
    setShowPdfModal(false)
    // Save to history
    saveToHistory(pdfClientName.trim() || 'Медиаплан ' + new Date().toLocaleDateString('ru-RU'), pdfClientName.trim())
  }

  const openPdfModal = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    setPdfMode(mode)
    setPdfClientName('')
    setShowPdfModal(true)
  }

  const shareSel = () => {
    if(!allSel.length){showToast('Выберите паблики');return}
    const text = `Медиаплан Pabliki.kz (${pkgLabel})\n${allSel.length} пабликов · ${fmtK(totalSubs)} подп. · ${fmt(totalPrice)}₸\n\n`+allSel.map((p,i)=>`${i+1}. ${p.cityName} — @${p.username} (${fmtK(p.subscribers)}) — ${fmt(getPrice(p))}₸`).join('\n')+`\n\nИтого: ${fmt(totalPrice)}₸\npabliki.kz`
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
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100%); } }
        .anim-fade-in-up { animation: fadeInUp 0.4s ease-out both; }
        .anim-fade-in { animation: fadeIn 0.3s ease-out both; }
        .anim-scale-check { animation: scaleCheck 0.25s ease-out; }
        .anim-slide-up { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
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

      {/* ── Saved + History ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {savedSelections.length>0 && (
          <button onClick={()=>setShowSavedModal(true)} className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-500/20 hover:border-sky-500/40">
            <span>📂</span> Подборки <span className="bg-sky-500/20 px-2 py-0.5 rounded-full text-xs">{savedSelections.length}</span>
          </button>
        )}
        <button onClick={()=>setShowHistoryModal(true)} className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-500/20 hover:border-sky-500/40">
          <span>📋</span> История {selectionHistory.length > 0 && <span className="bg-sky-500/20 px-2 py-0.5 rounded-full text-xs">{selectionHistory.length}</span>}
        </button>
      </div>

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

      {/* ── Package toggle ── */}
      <div className="mb-5 bg-gray-900/40 rounded-2xl p-4 border border-gray-800/50">
        <h4 className="text-sm font-bold text-gray-200 mb-3">📦 Пакет размещения</h4>
        <div className="flex gap-0.5 p-1 bg-gray-900/80 rounded-2xl w-fit border border-gray-800/50 flex-wrap">
          {PACKAGES.map(pkg => (
            <button key={pkg.key} onClick={()=>setActivePackage(pkg.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activePackage===pkg.key?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>
              {pkg.label} {pkg.mult > 1 && <span className="text-[10px] opacity-70">×{pkg.mult}</span>}
            </button>
          ))}
        </div>
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

      {/* ── Quick presets (multi-city) ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={()=>presetCity('Алматы')} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🏙 Алматы</button>
        <button onClick={()=>presetCity('Астана')} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🏙 Астана</button>
        <button onClick={()=>presetCities(['Алматы','Астана'])} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🏙 Алматы + Астана</button>
        <button onClick={presetTop5Cities} className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 hover:from-sky-500/25 hover:to-blue-500/25 transition-all">🏙 Топ-5 городов</button>
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

      {/* ── Cards View ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((p, idx) => {
            const checked = selected.has(p.username)
            const price = getPrice(p); const cost = getCost(p)
            const mPct = price>0?Math.round((price-cost)/price*100):0
            return (
              <div key={p.username}
                className={`rounded-2xl border p-4 cursor-pointer card-hover anim-fade-in-up ${checked ? 'bg-sky-500/10 border-sky-500/30' : 'bg-gray-900/40 border-gray-800/50 hover:border-gray-700'}`}
                style={{ animationDelay: `${idx * 30}ms` }}
                onClick={() => toggleSelect(p.username)}>
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt={p.username} className={`w-11 h-11 rounded-full flex-shrink-0 object-cover border-2 ${checked ? 'border-sky-500/50 ring-2 ring-sky-500/30' : 'border-gray-700/50'}`}
                      onError={(e) => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                  ) : null}
                  <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold border-2 ${checked ? 'border-sky-500/50 ring-2 ring-sky-500/30' : 'border-gray-700/50'} ${p.avatarUrl ? 'hidden' : ''}`}
                    style={{background: `linear-gradient(135deg, hsl(${p.username.charCodeAt(0)*7%360},60%,25%), hsl(${(p.username.charCodeAt(1)||0)*11%360},50%,20%))`}}>
                    <span className="text-white/90">{p.username.charAt(0).toUpperCase()}</span>
                  </div>
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
                    <div className="text-sm font-semibold text-white mt-0.5">{fmt(price)}₸</div>
                    <div className="text-[10px] text-sky-400/70 mt-0.5">👁 Охват: {fmtReach(p)}</div>
                  </div>
                  {mode === 'full' && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{fmt(cost)}₸ себест.</div>
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
                const price = getPrice(p); const cost = getCost(p)
                const mPct = price>0?Math.round((price-cost)/price*100):0
                const mT = price-cost
                return (
                  <tr key={p.username} className={`border-t border-gray-800/30 transition-all cursor-pointer row-appear ${checked?'bg-sky-500/8 hover:bg-sky-500/12':'hover:bg-gray-800/40'}`} style={{ animationDelay: `${idx * 15}ms` }} onClick={()=>toggleSelect(p.username)}>
                    <td className="py-2.5 px-3">
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center text-xs transition-all ${checked?'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30 anim-scale-check':'border-gray-600 hover:border-gray-400'}`}>
                        {checked && '✓'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-300 whitespace-nowrap text-xs font-medium">{p.cityName}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.username} className={`w-7 h-7 rounded-full flex-shrink-0 object-cover border ${checked ? 'border-sky-500/50 ring-2 ring-sky-500/30' : 'border-gray-700/50'}`}
                            onError={(e) => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                        ) : null}
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border border-gray-700/50 ${p.avatarUrl ? 'hidden' : ''}`}
                          style={{background: `linear-gradient(135deg, hsl(${p.username.charCodeAt(0)*7%360},60%,25%), hsl(${(p.username.charCodeAt(1)||0)*11%360},50%,20%))`}}>
                          <span className="text-white/90">{p.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                            className="text-sky-400 hover:text-sky-300 transition font-medium">@{p.username}</a>
                          {p.custom && <button onClick={e=>{e.stopPropagation();deleteCustomPablik(p.username)}} className="ml-1.5 text-red-500/50 hover:text-red-400 text-[10px]">✕</button>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px] whitespace-nowrap hidden sm:table-cell">{p.catIcon} {p.catName}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">{fmtK(p.subscribers)}</td>
                    <td className="py-2.5 px-3 text-right text-sky-400/80 text-xs hidden sm:table-cell font-medium">{fmtReach(p)}</td>
                    {mode==='full' && <td className="py-2.5 px-3 text-right text-gray-500 hidden sm:table-cell">{fmt(cost)}₸{cost===0&&' ⚠️'}</td>}
                    <td className="py-2.5 px-3 text-right font-semibold text-white">{fmt(price)}₸</td>
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

      {/* ═══ STICKY BOTTOM BAR ═══ */}
      {allSel.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 anim-slide-up">
          <div className="bg-gray-900/95 backdrop-blur-xl border-t border-sky-500/30 shadow-2xl shadow-black/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 text-sm min-w-0">
                <span className="text-white font-bold whitespace-nowrap">Выбрано: {allSel.length} пабликов</span>
                <span className="text-gray-500 hidden sm:inline">·</span>
                <span className="text-sky-400 font-semibold hidden sm:inline">{fmtK(totalSelReach)} охват</span>
                <span className="text-gray-500 hidden sm:inline">·</span>
                <span className="text-sky-300 font-bold">{fmt(totalPrice)}₸</span>
                {pkgMult > 1 && <span className="text-gray-500 text-xs">({pkgLabel})</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <button onClick={openPdfModal} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all shadow-lg shadow-sky-500/25">📄 PDF</button>
                <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/25">📊 Excel</button>
                <button onClick={shareSel} className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-4 py-2 rounded-xl transition-all border border-gray-700/50">📤 Отправить</button>
                <button onClick={saveSelection} className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-4 py-2 rounded-xl transition-all border border-gray-700/50">💾 Сохранить</button>
                <button onClick={()=>setSelected(new Set())} className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs sm:text-sm px-3 py-2 rounded-xl transition-all border border-gray-700/50">✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PDF Modal ═══ */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowPdfModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-md mx-4 border border-gray-800/80 shadow-2xl space-y-4" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">📄 Экспорт PDF</h3>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Название компании клиента (необязательно)</label>
              <input type="text" placeholder="Например: ТОО «Компания»" value={pdfClientName} onChange={e=>setPdfClientName(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">Режим</label>
              <div className="flex gap-0.5 p-1 bg-gray-800/80 rounded-2xl border border-gray-700/50">
                <button onClick={()=>setPdfMode('client')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pdfMode==='client'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>👤 Для клиента</button>
                <button onClick={()=>setPdfMode('full')} className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pdfMode==='full'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-gray-400 hover:text-white'}`}>📊 Полная</button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={doExportPDF} className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/25">📄 Скачать PDF</button>
              <button onClick={()=>setShowPdfModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ History Modal ═══ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowHistoryModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-lg mx-4 border border-gray-800/80 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">📋 История подборок</h3>
            {selectionHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">Нет сохранённых подборок</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectionHistory.map((entry, i) => {
                  const badge = STATUS_BADGES[entry.status] || STATUS_BADGES.draft
                  return (
                    <div key={i} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{entry.name}</div>
                          {entry.client && <div className="text-xs text-gray-400 mt-0.5">Клиент: {entry.client}</div>}
                          <div className="text-xs text-gray-500 mt-0.5">{entry.usernames.length} пабликов · {entry.package} · {fmt(entry.totalPrice)}₸ · {new Date(entry.date).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${badge.color}`}>{badge.label}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {(['draft','sent','accepted','paid'] as const).map(st => (
                          <button key={st} onClick={()=>updateHistoryStatus(i, st)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${entry.status===st?'bg-sky-500/20 text-sky-400 border border-sky-500/30':'bg-gray-700/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'}`}>
                            {STATUS_BADGES[st].label}
                          </button>
                        ))}
                        <button onClick={()=>{ setSelected(new Set(entry.usernames)); setShowHistoryModal(false); showToast('📂 Загружено') }}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 transition-all">Загрузить</button>
                        <button onClick={()=>deleteHistoryEntry(i)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold text-red-500/50 hover:text-red-400 transition-all">🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={()=>setShowHistoryModal(false)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Закрыть</button>
          </div>
        </div>
      )}

      {/* ═══ Compare Modal ═══ */}
      {showCompareModal && canCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowCompareModal(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-2xl mx-4 border border-gray-800/80 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-5">⚖️ Сравнение пабликов</h3>
            <div className={`grid gap-4 ${allSel.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {allSel.map(p => {
                const price = getPrice(p); const cost = getCost(p)
                const mPct = price>0?Math.round((price-cost)/price*100):0
                const reach = getReach(p)
                const maxS = Math.max(...allSel.map(x=>x.subscribers))
                const maxP = Math.max(...allSel.map(x=>getPrice(x)))
                const maxR = Math.max(...allSel.map(x=>getReach(x).avg))
                return (
                  <div key={p.username} className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700/30">
                    <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer" className="text-sky-400 font-semibold text-sm hover:text-sky-300">@{p.username}</a>
                    <div className="text-xs text-gray-500 mb-3">{p.cityName}</div>
                    {[
                      { label: 'Подписчики', value: fmtK(p.subscribers), pct: p.subscribers/maxS*100 },
                      { label: 'Цена', value: fmt(price)+'₸', pct: price/maxP*100 },
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
                <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all gap-2">
                  <button onClick={()=>loadSelection(sel)} className="text-left flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{sel.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{sel.usernames.length} пабликов · {sel.date}</div>
                  </button>
                  <button onClick={()=>duplicateSelection(sel)} className="text-sky-400 hover:text-sky-300 text-sm p-1 flex-shrink-0" title="Дублировать">📋</button>
                  <button onClick={()=>deleteSelection(i)} className="text-red-500/50 hover:text-red-400 text-sm p-1 flex-shrink-0">🗑</button>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowSavedModal(false)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Закрыть</button>
          </div>
        </div>
      )}

      {/* ═══ Save Dialog (for duplicate) ═══ */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm anim-fade-in" onClick={()=>setShowSaveDialog(false)}>
          <div className="bg-gray-900 rounded-3xl p-7 w-full max-w-sm mx-4 border border-gray-800/80 shadow-2xl space-y-4" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">💾 Сохранить подборку</h3>
            <input type="text" value={saveDialogName} onChange={e=>setSaveDialogName(e.target.value)} placeholder="Название подборки"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder-gray-500" />
            <div className="flex gap-2">
              <button onClick={()=>{if(saveDialogName.trim()){doSaveSelection(saveDialogName.trim());setShowSaveDialog(false)}}} className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/25">💾 Сохранить</button>
              <button onClick={()=>setShowSaveDialog(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-all border border-gray-700/50">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
