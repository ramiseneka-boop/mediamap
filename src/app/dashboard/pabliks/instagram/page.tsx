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

interface SavedSelection {
  name: string
  usernames: string[]
  mode: 'client' | 'full'
  date: string
}

/* ───── constants ───── */
const MAIN_CITIES = ['Алматы','Астана','Шымкент','Караганда','Уральск','Павлодар','Петропавловск','Семей','Актобе','Атырау','Усть-Каменогорск','Кокшетау','Актау','Костанай','Тараз','Жезказган','Кызылорда','Талдыкорган']
const BUDGET_PRESETS = [{l:'300К',v:300000},{l:'500К',v:500000},{l:'1М',v:1000000},{l:'2М',v:2000000},{l:'5М',v:5000000}]
const PAGE_SIZE = 100

const fmt = (n: number) => n.toLocaleString('ru-RU')
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return n.toString()
}

/* ═══════════════════════════════════════════════ */
export default function InstagramCatalogPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  /* ── data ── */
  const [pabliks, setPabliks] = useState<Pablik[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<{name:string;icon:string}[]>([])
  const [loading, setLoading] = useState(true)

  /* ── filters ── */
  const [selCities, setSelCities] = useState<Set<string>>(new Set())
  const [selCats, setSelCats] = useState<Set<string>>(new Set())
  const [minSubs, setMinSubs] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10_000_000)
  const [budget, setBudget] = useState(10_000_000)
  const [igSearch, setIgSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [showMoreCities, setShowMoreCities] = useState(false)

  /* ── view ── */
  const [mode, setMode] = useState<'client'|'full'>('full')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [showCount, setShowCount] = useState(PAGE_SIZE)
  const [sortCol, setSortCol] = useState<string>('s')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  /* ── modals ── */
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([])

  /* ── add pablik form ── */
  const [apIg, setApIg] = useState('')
  const [apCity, setApCity] = useState('')
  const [apCat, setApCat] = useState('')
  const [apSubs, setApSubs] = useState('')
  const [apCost, setApCost] = useState('')
  const [apPrice, setApPrice] = useState('')

  /* ── toast ── */
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  /* ═══ load data ═══ */
  useEffect(() => {
    (async () => {
      const [{ data: media }, { data: citiesData }, { data: catsData }] = await Promise.all([
        supabase
          .from('media_resources')
          .select('id, username, subscribers, cost_post, sell_post, city:cities(name), category:categories(name, icon)')
          .eq('platform', 'instagram')
          .order('subscribers', { ascending: false }),
        supabase.from('cities').select('name').order('name'),
        supabase.from('categories').select('name, icon').order('name'),
      ])
      const rows: Pablik[] = (media || []).map((r: any) => ({
        id: r.id,
        username: r.username || '',
        subscribers: r.subscribers || 0,
        cost_post: r.cost_post || 0,
        sell_post: r.sell_post || 0,
        cityName: r.city?.name || '',
        catName: r.category?.name || '',
        catIcon: r.category?.icon || '',
      }))
      // merge custom pabliks from localStorage
      try {
        const custom: Pablik[] = JSON.parse(localStorage.getItem('pabliki_custom_ig') || '[]')
        for (const cp of custom) {
          if (!rows.find(r => r.username === cp.username)) {
            rows.push({ ...cp, custom: true })
          }
        }
      } catch {}
      setPabliks(rows)
      setAllCities((citiesData || []).map((c: any) => c.name))
      setAllCategories((catsData || []).map((c: any) => ({ name: c.name, icon: c.icon || '' })))
      // load saved selections
      try { setSavedSelections(JSON.parse(localStorage.getItem('pabliki_saved_ig') || '[]')) } catch {}
      setLoading(false)
    })()
  }, [])

  /* ═══ filtering ═══ */
  const getFiltered = useCallback(() => {
    return pabliks.filter(p => {
      if (selCities.size > 0 && !selCities.has(p.cityName)) return false
      if (selCats.size > 0 && !selCats.has(p.catName)) return false
      if (p.subscribers < minSubs) return false
      if (maxPrice < 10_000_000 && p.sell_post > maxPrice) return false
      if (igSearch && !p.username.toLowerCase().includes(igSearch.toLowerCase().replace('@', ''))) return false
      if (showSelectedOnly && !selected.has(p.username)) return false
      return true
    })
  }, [pabliks, selCities, selCats, minSubs, maxPrice, igSearch, showSelectedOnly, selected])

  const filtered = getFiltered()

  /* sorting */
  const sorted = [...filtered].sort((a, b) => {
    let av: any, bv: any
    switch (sortCol) {
      case 'c': av = a.cityName; bv = b.cityName; break
      case 'ig': av = a.username; bv = b.username; break
      case 't': av = a.catName; bv = b.catName; break
      case 's': av = a.subscribers; bv = b.subscribers; break
      case 'co': av = a.cost_post; bv = b.cost_post; break
      case 'p': av = a.sell_post; bv = b.sell_post; break
      case 'm': av = a.sell_post - a.cost_post; bv = b.sell_post - b.cost_post; break
      case 'mp': av = a.sell_post > 0 ? (a.sell_post - a.cost_post)/a.sell_post : 0; bv = b.sell_post > 0 ? (b.sell_post - b.cost_post)/b.sell_post : 0; break
      default: av = a.subscribers; bv = b.subscribers
    }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv, 'ru') : bv.localeCompare(av, 'ru')
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const shown = sorted.slice(0, showCount)
  const hasMore = showCount < sorted.length

  /* ═══ selection helpers ═══ */
  const allSelected = pabliks.filter(p => selected.has(p.username))
  const totalSubs = allSelected.reduce((s, p) => s + p.subscribers, 0)
  const totalPrice = allSelected.reduce((s, p) => s + p.sell_post, 0)
  const totalCost = allSelected.reduce((s, p) => s + p.cost_post, 0)
  const totalMarginPct = totalPrice > 0 ? Math.round((totalPrice - totalCost) / totalPrice * 100) : 0

  const toggleSelect = (ig: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(ig)) s.delete(ig); else s.add(ig)
      return s
    })
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortArrow = (col: string) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const toggleCity = (c: string) => {
    setSelCities(prev => {
      const s = new Set(prev)
      if (s.has(c)) s.delete(c); else s.add(c)
      return s
    })
    setShowCount(PAGE_SIZE)
  }

  const toggleCat = (c: string) => {
    setSelCats(prev => {
      const s = new Set(prev)
      if (s.has(c)) s.delete(c); else s.add(c)
      return s
    })
    setShowCount(PAGE_SIZE)
  }

  const selectAllFiltered = () => {
    const allChecked = filtered.every(p => selected.has(p.username)) && filtered.length > 0
    setSelected(prev => {
      const s = new Set(prev)
      if (allChecked) filtered.forEach(p => s.delete(p.username))
      else filtered.forEach(p => s.add(p.username))
      return s
    })
  }

  const autoSelectByBudget = (b: number) => {
    setBudget(b)
    if (b >= 10_000_000) return
    const f = getFiltered()
    const newSel = new Set<string>()
    let total = 0
    for (const p of f) {
      if (total + p.sell_post <= b) { newSel.add(p.username); total += p.sell_post }
    }
    setSelected(newSel)
    showToast(`✅ Выбрано ${newSel.size} пабликов на ${fmt(total)}₸`)
  }

  /* ═══ add custom pablik ═══ */
  const addCustomPablik = () => {
    const ig = apIg.trim().replace('@', '').toLowerCase()
    if (!ig) { showToast('Введите Instagram'); return }
    if (!apCity) { showToast('Введите город'); return }
    if (!apSubs || parseInt(apSubs) <= 0) { showToast('Введите подписчиков'); return }
    if (!apPrice || parseInt(apPrice) <= 0) { showToast('Введите цену'); return }
    if (pabliks.find(p => p.username === ig)) { showToast('⚠️ @' + ig + ' уже в базе'); return }
    const newP: Pablik = {
      id: Date.now(),
      username: ig,
      cityName: apCity,
      catName: apCat || 'Общие',
      catIcon: '📱',
      subscribers: parseInt(apSubs),
      cost_post: parseInt(apCost) || 0,
      sell_post: parseInt(apPrice),
      custom: true,
    }
    setPabliks(prev => [...prev, newP])
    try {
      const custom = JSON.parse(localStorage.getItem('pabliki_custom_ig') || '[]')
      custom.push(newP)
      localStorage.setItem('pabliki_custom_ig', JSON.stringify(custom))
    } catch {}
    setShowAddModal(false)
    setApIg(''); setApCity(''); setApCat(''); setApSubs(''); setApCost(''); setApPrice('')
    showToast('✅ @' + ig + ' добавлен!')
  }

  const deleteCustomPablik = (ig: string) => {
    setPabliks(prev => prev.filter(p => p.username !== ig))
    setSelected(prev => { const s = new Set(prev); s.delete(ig); return s })
    try {
      const custom = JSON.parse(localStorage.getItem('pabliki_custom_ig') || '[]').filter((p: any) => p.username !== ig)
      localStorage.setItem('pabliki_custom_ig', JSON.stringify(custom))
    } catch {}
    showToast('🗑 @' + ig + ' удалён')
  }

  /* ═══ saved selections ═══ */
  const saveSelection = () => {
    const name = prompt('Название подборки:')
    if (!name) return
    const sel: SavedSelection = { name, usernames: [...selected], mode, date: new Date().toLocaleDateString('ru-RU') }
    const list = [...savedSelections, sel]
    setSavedSelections(list)
    localStorage.setItem('pabliki_saved_ig', JSON.stringify(list))
    showToast('💾 Сохранено: ' + name)
  }

  const loadSelection = (sel: SavedSelection) => {
    setSelected(new Set(sel.usernames))
    setMode(sel.mode)
    setShowSavedModal(false)
    showToast('📂 Загружено: ' + sel.name)
  }

  const deleteSelection = (idx: number) => {
    const list = savedSelections.filter((_, i) => i !== idx)
    setSavedSelections(list)
    localStorage.setItem('pabliki_saved_ig', JSON.stringify(list))
  }

  /* ═══ PDF export ═══ */
  const exportPDF = () => {
    if (allSelected.length === 0) { showToast('Выберите паблики'); return }
    const isClient = mode === 'client'
    const date = new Date().toLocaleDateString('ru-RU')
    const ci: Record<string, string> = {}
    allCategories.forEach(c => { ci[c.name] = c.icon })

    const rows = allSelected.map((p, i) => {
      const margin = p.sell_post > 0 ? Math.round((p.sell_post - p.cost_post) / p.sell_post * 100) : 0
      const mT = p.sell_post - p.cost_post
      const mc = margin >= 50 ? '#16a34a' : margin >= 30 ? '#ca8a04' : '#dc2626'
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1f2937">${p.cityName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#2563eb;font-weight:500"><a href="https://instagram.com/${p.username}" target="_blank" style="color:#2563eb;text-decoration:none">@${p.username}</a></td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${ci[p.catName] || ''} ${p.catName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(p.subscribers)}</td>
        ${!isClient ? `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(p.cost_post)}₸</td>` : ''}
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(p.sell_post)}₸</td>
        ${!isClient ? `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${mc}">${fmt(mT)}₸</td><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:${mc}">${margin}%</td>` : ''}
      </tr>`
    }).join('')

    const orient = isClient ? 'portrait' : 'landscape'
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1f2937;background:#fff;font-size:11px}.btns{position:sticky;top:0;z-index:100;display:flex;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb}.btns button{padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}.btns button:nth-child(2){background:#8b5cf6}.btns button:nth-child(3){background:#16a34a}@media print{.btns{display:none}}.page{max-width:100%;margin:0 auto;padding:16px;overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:10px;white-space:nowrap}td,th{padding:6px 8px}th{text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#2563eb;border-bottom:2px solid #2563eb;background:#eff6ff}@media print{body{font-size:9px}table{font-size:9px}td,th{padding:4px 6px}.page{padding:8px}}</style></head><body>
    <div class="btns"><button onclick="window.close()">← Закрыть</button><button onclick="sharePdf()">📤 Поделиться</button><button onclick="window.print()">🖨 Печать</button></div>
    <div class="page" id="pdfContent">
      <div style="text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #2563eb">
        <div style="font-size:24px;font-weight:800;color:#2563eb;letter-spacing:2px">PABLIKI.KZ</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">${isClient ? 'Медиаплан' : 'Внутренний медиаплан'} от ${date}</div>
      </div>
      <div style="display:flex;justify-content:center;gap:24px;margin:16px 0">
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#2563eb">${allSelected.length}</div><div style="font-size:9px;color:#6b7280;text-transform:uppercase">пабликов</div></div>
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#2563eb">${fmt(totalSubs)}</div><div style="font-size:9px;color:#6b7280;text-transform:uppercase">аудитория</div></div>
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#2563eb">${fmt(totalPrice)}₸</div><div style="font-size:9px;color:#6b7280;text-transform:uppercase">стоимость</div></div>
      </div>
      <table><thead><tr><th>№</th><th>Город</th><th>Instagram</th><th>Кат.</th><th style="text-align:right">Подп.</th>${!isClient ? '<th style="text-align:right">Себест.</th>' : ''}<th style="text-align:right">Цена</th>${!isClient ? '<th style="text-align:right">Маржа</th><th style="text-align:right">%</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="padding:10px 8px;font-weight:700;border-top:2px solid #2563eb">ИТОГО</td><td style="padding:10px 8px;text-align:right;font-weight:700;border-top:2px solid #2563eb">${fmt(totalSubs)}</td>${!isClient ? `<td style="padding:10px 8px;text-align:right;font-weight:700;border-top:2px solid #2563eb">${fmt(totalCost)}₸</td>` : ''}<td style="padding:10px 8px;text-align:right;font-weight:800;color:#2563eb;border-top:2px solid #2563eb">${fmt(totalPrice)}₸</td>${!isClient ? `<td style="padding:10px 8px;text-align:right;font-weight:800;color:#16a34a;border-top:2px solid #2563eb">${fmt(totalPrice - totalCost)}₸</td><td style="padding:10px 8px;text-align:right;font-weight:800;color:#16a34a;border-top:2px solid #2563eb">${totalMarginPct}%</td>` : ''}</tr></tfoot></table>
      <div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af">pabliki.kz · +7 777 069 82 92 · WhatsApp</div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
    <script>function sharePdf(){var el=document.getElementById("pdfContent");var fname="mediaplan-pabliki-"+new Date().toISOString().slice(0,10)+".pdf";if(typeof html2pdf==="undefined"){window.print();return;}html2pdf().set({margin:[8,4,8,4],filename:fname,image:{type:"jpeg",quality:0.95},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"${orient}"}}).from(el).outputPdf("blob").then(function(blob){var file=new File([blob],fname,{type:"application/pdf"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({title:"Медиаплан Pabliki.kz",files:[file]}).catch(function(){});}else{var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=fname;a.click();URL.revokeObjectURL(url);}}).catch(function(){window.print();});}<\/script>
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
    else showToast('Разрешите всплывающие окна')
  }

  /* ═══ share (copy link with selection) ═══ */
  const shareSel = () => {
    if (allSelected.length === 0) { showToast('Выберите паблики'); return }
    const text = `Медиаплан Pabliki.kz\n${allSelected.length} пабликов · ${fmt(totalSubs)} подп. · ${fmt(totalPrice)}₸\n\n` +
      allSelected.map((p, i) => `${i + 1}. ${p.cityName} — @${p.username} (${fmtShort(p.subscribers)}) — ${fmt(p.sell_post)}₸`).join('\n') +
      `\n\nИтого: ${fmt(totalPrice)}₸\npabliki.kz`
    navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано!')).catch(() => showToast('Ошибка копирования'))
  }

  /* ═══ city chips logic ═══ */
  const usedCitiesSet = new Set(pabliks.map(p => p.cityName))
  const mainCitiesFiltered = citySearch
    ? [...usedCitiesSet].filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).sort((a, b) => a.localeCompare(b, 'ru'))
    : MAIN_CITIES.filter(c => usedCitiesSet.has(c))
  const otherCities = citySearch
    ? []
    : [...usedCitiesSet].filter(c => !MAIN_CITIES.includes(c)).sort((a, b) => a.localeCompare(b, 'ru'))

  /* ═══ margin helpers ═══ */
  const marginColor = (pct: number) => pct >= 50 ? 'text-green-400' : pct >= 30 ? 'text-yellow-400' : 'text-red-400'

  /* ═══ chip component ═══ */
  const Chip = ({ active, onClick, children, className = '' }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${active ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} ${className}`}
    >
      {children}
    </button>
  )

  /* ═══════════ RENDER ═══════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📸</div>
          <div className="text-gray-400">Загрузка пабликов...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full pb-32">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push('/dashboard/pabliks')} className="text-gray-400 hover:text-white transition text-xl">←</button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-amber-500">📸 PABLIKI.KZ</h1>
            <p className="text-gray-400 text-sm">Создай медиаплан из {pabliks.length} пабликов</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="ml-auto bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-4 py-2 rounded-lg transition">
            ➕ Добавить
          </button>
        </div>
      </div>

      {/* ── Saved selections ── */}
      {savedSelections.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowSavedModal(true)} className="text-xs text-amber-400 hover:text-amber-300 transition">
            📂 Сохранённые подборки ({savedSelections.length})
          </button>
        </div>
      )}

      {/* ── Mode toggle ── */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-xl mb-5 w-fit">
        <button onClick={() => setMode('client')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'client' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
          👤 Для клиента
        </button>
        <button onClick={() => setMode('full')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'full' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
          📊 Полная
        </button>
      </div>

      {/* ── City filter ── */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          🏙️ Город {selCities.size > 0 && <span className="text-amber-500 font-normal text-xs">({selCities.size} выбрано)</span>}
        </h4>
        <input
          type="text"
          placeholder="🔍 Поиск города..."
          value={citySearch}
          onChange={e => setCitySearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-amber-500"
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={selCities.size === 0} onClick={() => { setSelCities(new Set()); setCitySearch(''); setShowCount(PAGE_SIZE) }}>Все города</Chip>
          {mainCitiesFiltered.map(c => (
            <Chip key={c} active={selCities.has(c)} onClick={() => toggleCity(c)}>{c}</Chip>
          ))}
          {!citySearch && otherCities.length > 0 && (
            <>
              <Chip active={false} onClick={() => setShowMoreCities(!showMoreCities)} className="bg-amber-500/20 text-amber-400">
                Ещё регионы ({otherCities.length}) {showMoreCities ? '▲' : '▼'}
              </Chip>
              {showMoreCities && otherCities.map(c => (
                <Chip key={c} active={selCities.has(c)} onClick={() => toggleCity(c)}>{c}</Chip>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">📂 Категория</h4>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={selCats.size === 0} onClick={() => setSelCats(new Set())}>Все</Chip>
          {allCategories.map(c => (
            <Chip key={c.name} active={selCats.has(c.name)} onClick={() => toggleCat(c.name)}>
              {c.icon} {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Sliders ── */}
      <div className="space-y-3 mb-4 bg-gray-900/50 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Мин. подписчики</span><span className="text-white font-medium">{fmt(minSubs)}</span>
          </div>
          <input type="range" min={0} max={500000} step={5000} value={minSubs}
            onChange={e => { setMinSubs(+e.target.value); setShowCount(PAGE_SIZE) }}
            className="w-full accent-amber-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Макс. цена за 1 паблик</span><span className="text-white font-medium">{maxPrice >= 10_000_000 ? '∞' : fmt(maxPrice) + '₸'}</span>
          </div>
          <input type="range" min={5000} max={10_000_000} step={5000} value={maxPrice}
            onChange={e => { setMaxPrice(+e.target.value); setShowCount(PAGE_SIZE) }}
            className="w-full accent-amber-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>💰 Общий бюджет</span><span className="text-white font-medium">{budget >= 10_000_000 ? '∞' : fmt(budget) + '₸'}</span>
          </div>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {BUDGET_PRESETS.map(bp => (
              <button key={bp.v} onClick={() => autoSelectByBudget(bp.v)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition">
                {bp.l}
              </button>
            ))}
          </div>
          <input type="range" min={100000} max={10_000_000} step={50000} value={budget}
            onChange={e => autoSelectByBudget(+e.target.value)}
            className="w-full accent-amber-500" />
        </div>
      </div>

      {/* ── Search by @instagram ── */}
      <input
        type="text"
        placeholder="🔍 Поиск по @instagram..."
        value={igSearch}
        onChange={e => { setIgSearch(e.target.value); setShowCount(PAGE_SIZE) }}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white mb-4 focus:outline-none focus:border-amber-500"
      />

      {/* ── Count & toggles ── */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-4 text-sm">
        <span className="text-gray-400">Найдено: <strong className="text-white">{filtered.length}</strong> · Выбрано: <strong className="text-amber-400">{allSelected.length}</strong></span>
        <Chip active={filtered.length > 0 && filtered.every(p => selected.has(p.username))} onClick={selectAllFiltered}>
          {filtered.length > 0 && filtered.every(p => selected.has(p.username)) ? '✕ Снять все' : '☑ Выбрать все'}
        </Chip>
        <Chip active={showSelectedOnly} onClick={() => { setShowSelectedOnly(!showSelectedOnly); setShowCount(PAGE_SIZE) }}>
          {showSelectedOnly ? '👁 Все' : '👁 Выбранные'}
        </Chip>
      </div>

      {/* ── Selection summary (sticky) ── */}
      {allSelected.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-amber-500/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
            <div><span className="text-gray-400 text-xs">Пабликов</span><div className="font-bold text-white">{allSelected.length}</div></div>
            <div><span className="text-gray-400 text-xs">Аудитория</span><div className="font-bold text-white">{fmt(totalSubs)}</div></div>
            <div><span className="text-gray-400 text-xs">Стоимость</span><div className="font-bold text-amber-400">{fmt(totalPrice)}₸</div></div>
            {mode === 'full' && <>
              <div><span className="text-gray-400 text-xs">Себестоимость</span><div className="font-bold text-white">{fmt(totalCost)}₸</div></div>
              <div><span className="text-gray-400 text-xs">Маржа</span><div className="font-bold text-green-400">{fmt(totalPrice - totalCost)}₸</div></div>
              <div><span className="text-gray-400 text-xs">Маржинальность</span><div className="font-bold text-green-400">{totalMarginPct}%</div></div>
            </>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportPDF} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-4 py-2 rounded-lg transition">📄 PDF</button>
            <button onClick={shareSel} className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg transition">📤 Отправить</button>
            <button onClick={saveSelection} className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg transition">💾 Сохранить</button>
            <button onClick={() => setSelected(new Set())} className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs px-4 py-2 rounded-lg transition">✕ Сбросить</button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-900/80 text-gray-400 text-left">
              <th className="py-2.5 px-2 w-8"></th>
              <th className="py-2.5 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort('c')}>Город{sortArrow('c')}</th>
              <th className="py-2.5 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort('ig')}>Instagram{sortArrow('ig')}</th>
              <th className="py-2.5 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort('t')}>Кат.{sortArrow('t')}</th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('s')}>Подп.{sortArrow('s')}</th>
              {mode === 'full' && <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('co')}>Себест.{sortArrow('co')}</th>}
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('p')}>Цена{sortArrow('p')}</th>
              {mode === 'full' && <>
                <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('m')}>Маржа{sortArrow('m')}</th>
                <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('mp')}>%{sortArrow('mp')}</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {shown.map(p => {
              const checked = selected.has(p.username)
              const mPct = p.sell_post > 0 ? Math.round((p.sell_post - p.cost_post) / p.sell_post * 100) : 0
              const mT = p.sell_post - p.cost_post
              return (
                <tr key={p.username} className={`border-t border-gray-800/50 transition cursor-pointer ${checked ? 'bg-amber-500/10' : 'hover:bg-gray-900/40'}`}
                  onClick={() => toggleSelect(p.username)}>
                  <td className="py-2 px-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition ${checked ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-600'}`}>
                      {checked && '✓'}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{p.cityName}</td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-amber-400 hover:text-amber-300 transition">
                      @{p.username}
                    </a>
                    {p.custom && (
                      <button onClick={e => { e.stopPropagation(); deleteCustomPablik(p.username) }}
                        className="ml-1 text-red-500/60 hover:text-red-400 text-[10px]">✕</button>
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-400 text-[10px] whitespace-nowrap">{p.catIcon} {p.catName}</td>
                  <td className="py-2 px-2 text-right font-medium text-white">{fmtShort(p.subscribers)}</td>
                  {mode === 'full' && <td className="py-2 px-2 text-right text-gray-400">{fmt(p.cost_post)}₸{p.cost_post === 0 && ' ⚠️'}</td>}
                  <td className="py-2 px-2 text-right font-medium text-white">{fmt(p.sell_post)}₸</td>
                  {mode === 'full' && <>
                    <td className={`py-2 px-2 text-right font-semibold ${marginColor(mPct)}`}>{fmt(mT)}₸</td>
                    <td className={`py-2 px-2 text-right font-bold ${marginColor(mPct)}`}>{mPct}%</td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            {pabliks.length === 0 ? 'Нет пабликов' : 'Ничего не найдено по фильтрам'}
          </div>
        )}
      </div>

      {/* ── Show more ── */}
      {hasMore && (
        <div className="mt-3 text-center">
          <button onClick={() => setShowCount(c => c + PAGE_SIZE)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-6 py-3 rounded-xl transition">
            Показать ещё (+{Math.min(PAGE_SIZE, sorted.length - showCount)})
          </button>
          <div className="text-xs text-gray-500 mt-1">Показано {showCount} из {sorted.length}</div>
        </div>
      )}

      {/* ═══ Add Pablik Modal ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">➕ Добавить паблик</h3>
            <input placeholder="Instagram (без @)" value={apIg} onChange={e => setApIg(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input placeholder="Город" value={apCity} onChange={e => setApCity(e.target.value)} list="cityListAdd"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <datalist id="cityListAdd">{allCities.map(c => <option key={c} value={c} />)}</datalist>
            <select value={apCat} onChange={e => setApCat(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Категория</option>
              {allCategories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <input placeholder="Подписчики" type="number" value={apSubs} onChange={e => setApSubs(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input placeholder="Себестоимость (₸)" type="number" value={apCost} onChange={e => setApCost(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input placeholder="Цена клиенту (₸)" type="number" value={apPrice} onChange={e => setApPrice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <div className="flex gap-2 pt-2">
              <button onClick={addCustomPablik} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg transition">Добавить</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg transition">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Saved Selections Modal ═══ */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSavedModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">📂 Сохранённые подборки</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {savedSelections.map((sel, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                  <button onClick={() => loadSelection(sel)} className="text-left flex-1">
                    <div className="text-sm font-medium text-white">{sel.name}</div>
                    <div className="text-xs text-gray-400">{sel.usernames.length} пабликов · {sel.date}</div>
                  </button>
                  <button onClick={() => deleteSelection(i)} className="text-red-500/60 hover:text-red-400 text-sm ml-2">🗑</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSavedModal(false)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg transition">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}
