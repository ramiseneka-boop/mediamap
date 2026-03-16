'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface MediaResource {
  id: number
  name: string
  platform: string
  username: string
  subscribers: number
  cost_post: number
  sell_post: number
  cost_story: number
  sell_story: number
  views?: number
  is_active: boolean
  city: { name: string } | null
  category: { name: string; icon: string } | null
}

type Platform = 'youtube' | 'instagram' | 'tiktok'

const TABS: { value: Platform; label: string; icon: string; gradient: string; accent: string; ring: string }[] = [
  { value: 'youtube', label: 'YouTube', icon: '▶️', gradient: 'from-red-500 to-red-700', accent: 'bg-red-500', ring: 'ring-red-500' },
  { value: 'instagram', label: 'Instagram', icon: '📸', gradient: 'from-pink-500 to-purple-600', accent: 'bg-pink-500', ring: 'ring-pink-500' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵', gradient: 'from-gray-700 to-cyan-600', accent: 'bg-cyan-500', ring: 'ring-cyan-500' },
]

const BUSINESS_NICHES = [
  { label: 'Рестораны и кафе', icon: '🍽️', categories: ['Еда', 'Рестораны', 'Кафе', 'Доставка еды'] },
  { label: 'Салоны красоты', icon: '💇', categories: ['Красота', 'Салоны', 'Косметология', 'Уход'] },
  { label: 'Фитнес и спорт', icon: '💪', categories: ['Фитнес', 'Спорт', 'Здоровье', 'ЗОЖ'] },
  { label: 'Медицина', icon: '🏥', categories: ['Медицина', 'Здоровье', 'Клиники'] },
  { label: 'Образование', icon: '📚', categories: ['Образование', 'Курсы', 'Обучение'] },
  { label: 'IT и технологии', icon: '💻', categories: ['IT', 'Технологии', 'Разработка', 'Digital'] },
  { label: 'Недвижимость', icon: '🏠', categories: ['Недвижимость', 'Жилье', 'Аренда'] },
  { label: 'Авто', icon: '🚗', categories: ['Авто', 'Машины', 'Транспорт'] },
  { label: 'Мода и одежда', icon: '👗', categories: ['Мода', 'Одежда', 'Стиль', 'Fashion'] },
  { label: 'Развлечения', icon: '🎉', categories: ['Развлечения', 'Досуг', 'Афиша', 'События'] },
  { label: 'Финансы', icon: '💰', categories: ['Финансы', 'Бизнес', 'Инвестиции', 'Банки'] },
  { label: 'Путешествия', icon: '✈️', categories: ['Путешествия', 'Туризм', 'Отдых'] },
]

const AVATAR_COLORS = [
  'from-red-500 to-orange-500', 'from-blue-500 to-purple-500', 'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500', 'from-yellow-500 to-amber-500', 'from-indigo-500 to-blue-500',
  'from-purple-500 to-pink-500', 'from-cyan-500 to-blue-500',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getProfileUrl(platform: string, username: string) {
  if (platform === 'youtube') return `https://youtube.com/@${username}`
  if (platform === 'tiktok') return `https://tiktok.com/@${username}`
  return `https://instagram.com/${username}`
}

/* ── Multi-select dropdown ── */
function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  const toggle = (val: string) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-left text-white flex items-center justify-between hover:border-gray-600 transition">
        <span className={selected.length ? 'text-white' : 'text-gray-400'}>
          {selected.length ? `Выбрано: ${selected.length}` : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input type="text" placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="overflow-y-auto max-h-48 px-1 pb-2">
            {filtered.length === 0 && <div className="text-gray-500 text-sm px-3 py-2">Не найдено</div>}
            {filtered.map(o => (
              <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/50 rounded cursor-pointer text-sm">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="accent-cyan-500 rounded" />
                <span className="text-gray-200">{o}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full text-xs text-gray-400 hover:text-cyan-400 py-1.5 border-t border-gray-700">Сбросить всё</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Range slider ── */
function RangeSlider({ min, max, valueMin, valueMax, onChange, formatLabel }: {
  min: number; max: number; valueMin: number; valueMax: number; onChange: (min: number, max: number) => void; formatLabel: (n: number) => string
}) {
  const pctMin = ((valueMin - min) / (max - min)) * 100
  const pctMax = ((valueMax - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-2"><span>{formatLabel(valueMin)}</span><span>{formatLabel(valueMax)}</span></div>
      <div className="relative h-2 bg-gray-700 rounded-full">
        <div className="absolute h-2 bg-cyan-500 rounded-full" style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }} />
        <input type="range" min={min} max={max} value={valueMin} onChange={e => { const v = Number(e.target.value); if (v <= valueMax) onChange(v, valueMax) }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer" style={{ top: 0, left: 0 }} />
        <input type="range" min={min} max={max} value={valueMax} onChange={e => { const v = Number(e.target.value); if (v >= valueMin) onChange(valueMin, v) }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer" style={{ top: 0, left: 0 }} />
      </div>
    </div>
  )
}

const formatNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

const PAGE_SIZE = 30

export default function BloggersPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const [activeTab, setActiveTab] = useState<Platform>('youtube')
  const [data, setData] = useState<Record<Platform, MediaResource[]>>({ youtube: [], instagram: [], tiktok: [] })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [subsMin, setSubsMin] = useState(0)
  const [subsMax, setSubsMax] = useState(5000000)
  const [filterTab, setFilterTab] = useState<'filters' | 'business'>('filters')
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)

  // View & sort
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [sortBy, setSortBy] = useState<'subscribers' | 'name' | 'sell_post'>('subscribers')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Selection (per platform)
  const [selected, setSelected] = useState<Record<Platform, Set<number>>>({ youtube: new Set(), instagram: new Set(), tiktok: new Set() })

  useEffect(() => { loadData() }, [])
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [activeTab, search, selectedCities, selectedCategories, subsMin, subsMax, selectedNiche])

  async function loadData() {
    setLoading(true)
    const [yt, tt] = await Promise.all([
      supabase.from('media_resources').select('*, city:cities(name), category:categories(name, icon)').eq('platform', 'youtube').order('subscribers', { ascending: false }),
      supabase.from('media_resources').select('*, city:cities(name), category:categories(name, icon)').eq('platform', 'tiktok').order('subscribers', { ascending: false }),
    ])
    setData({ youtube: yt.data || [], instagram: [], tiktok: tt.data || [] })
    setLoading(false)
  }

  const currentResources = data[activeTab]

  const usedCities = useMemo(() => [...new Set(currentResources.map(r => r.city?.name).filter(Boolean))] as string[], [currentResources])
  const usedCategories = useMemo(() => [...new Set(currentResources.map(r => r.category?.name).filter(Boolean))] as string[], [currentResources])

  const getNicheMatch = useCallback((niche: typeof BUSINESS_NICHES[0]) => {
    return currentResources.filter(r => {
      const cat = r.category?.name?.toLowerCase() || ''
      return niche.categories.some(c => cat.includes(c.toLowerCase()))
    })
  }, [currentResources])

  const filtered = useMemo(() => currentResources
    .filter(r => {
      if (filterTab === 'business' && selectedNiche) {
        const niche = BUSINESS_NICHES.find(n => n.label === selectedNiche)
        if (niche) {
          const cat = r.category?.name?.toLowerCase() || ''
          if (!niche.categories.some(c => cat.includes(c.toLowerCase()))) return false
        }
      }
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.username?.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedCities.length && (!r.city?.name || !selectedCities.includes(r.city.name))) return false
      if (selectedCategories.length && (!r.category?.name || !selectedCategories.includes(r.category.name))) return false
      if (r.subscribers < subsMin || r.subscribers > subsMax) return false
      return true
    })
    .sort((a, b) => {
      let av: any, bv: any
      if (sortBy === 'name') { av = a.name; bv = b.name }
      else if (sortBy === 'sell_post') { av = a.sell_post || 0; bv = b.sell_post || 0 }
      else { av = a.subscribers || 0; bv = b.subscribers || 0 }
      if (sortDir === 'asc') return av > bv ? 1 : -1
      return av < bv ? 1 : -1
    }), [currentResources, search, selectedCities, selectedCategories, subsMin, subsMax, sortBy, sortDir, filterTab, selectedNiche])

  const visible = filtered.slice(0, visibleCount)

  const totalSubs = filtered.reduce((s, r) => s + (r.subscribers || 0), 0)
  const totalViews = filtered.reduce((s, r) => s + (r.views || 0), 0)
  const uniqueCities = new Set(filtered.map(r => r.city?.name).filter(Boolean)).size

  // Stats per tab
  const tabCounts = useMemo(() => ({
    youtube: data.youtube.length,
    instagram: 0,
    tiktok: data.tiktok.length,
  }), [data])

  const totalAll = tabCounts.youtube + tabCounts.tiktok

  // Selection helpers
  const currentSelected = selected[activeTab]
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev[activeTab])
      if (s.has(id)) s.delete(id); else s.add(id)
      return { ...prev, [activeTab]: s }
    })
  }
  const allSelectedItems = useMemo(() => {
    const items: MediaResource[] = []
    for (const p of ['youtube', 'instagram', 'tiktok'] as Platform[]) {
      for (const r of data[p]) { if (selected[p].has(r.id)) items.push(r) }
    }
    return items
  }, [selected, data])

  const clearSelection = () => setSelected({ youtube: new Set(), instagram: new Set(), tiktok: new Set() })

  const exportCSV = () => {
    const rows = [['Платформа', 'Имя', 'Handle', 'Город', 'Категория', 'Подписчики', 'Просмотры'].join(',')]
    for (const r of allSelectedItems) {
      rows.push([r.platform, r.name, r.username, r.city?.name || '', r.category?.name || '', r.subscribers, r.views || 0].join(','))
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bloggers_selection.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }
  const sortIcon = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const hasActiveFilters = search || selectedCities.length || selectedCategories.length || subsMin > 0 || subsMax < 5000000 || selectedNiche
  const resetFilters = () => { setSearch(''); setSelectedCities([]); setSelectedCategories([]); setSubsMin(0); setSubsMax(5000000); setSelectedNiche(null) }

  const tab = TABS.find(t => t.value === activeTab)!

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/pabliks')} className="text-gray-400 hover:text-white transition text-lg">←</button>
        <span className="text-3xl">🎬</span>
        <div>
          <h1 className="text-2xl font-bold">Реклама у Блогеров</h1>
          <p className="text-gray-400 text-sm">{loading ? 'Загрузка...' : `${totalAll} блогеров на 2 платформах`}</p>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => {
          const isActive = activeTab === t.value
          const count = tabCounts[t.value]
          return (
            <button key={t.value} onClick={() => setActiveTab(t.value)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}>
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? `bg-gradient-to-r ${t.gradient} text-white` : 'bg-gray-700 text-gray-400'}`}>
                {count}
              </span>
              {isActive && <div className={`absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r ${t.gradient} rounded-full`} />}
            </button>
          )
        })}
      </div>

      {/* Instagram placeholder */}
      {activeTab === 'instagram' ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-xl font-bold mb-2">Instagram блогеры</h2>
          <p className="text-gray-400">Скоро появится — мы работаем над добавлением Instagram блогеров</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Блогеров', value: filtered.length, icon: '👤' },
              { label: 'Городов', value: uniqueCities, icon: '🏙' },
              { label: 'Подписчики', value: formatNum(totalSubs), icon: '👥' },
              { label: 'Ср. просмотры', value: totalViews > 0 ? formatNum(Math.round(totalViews / (filtered.length || 1))) : '—', icon: '👁' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="text-gray-400 text-xs mb-1">{s.icon} {s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 mb-6 overflow-visible">
            <div className={`bg-gradient-to-r ${tab.gradient} px-6 py-5 rounded-t-xl`}>
              <h2 className="text-xl font-bold text-white">Найдите идеального блогера для вашего бренда</h2>
              <p className="text-white/70 text-sm mt-1">Подберите блогеров по городу, тематике и аудитории</p>
            </div>

            <div className="flex border-b border-gray-800">
              <button onClick={() => { setFilterTab('filters'); setSelectedNiche(null) }}
                className={`px-6 py-3 text-sm font-semibold tracking-wide transition ${filterTab === 'filters' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}>
                ПОДБОРКА БЛОГЕРОВ
              </button>
              <button onClick={() => setFilterTab('business')}
                className={`px-6 py-3 text-sm font-semibold tracking-wide transition ${filterTab === 'business' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}>
                ПОДБОРКА ПО ВИДУ ДЕЯТЕЛЬНОСТИ
              </button>
            </div>

            <div className="p-6">
              {filterTab === 'filters' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Города</label>
                      <MultiSelect options={usedCities.sort()} selected={selectedCities} onChange={setSelectedCities} placeholder="Выберите города" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Тематика</label>
                      <MultiSelect options={usedCategories.sort()} selected={selectedCategories} onChange={setSelectedCategories} placeholder="Выберите тематику" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Подписчики</label>
                      <RangeSlider min={0} max={5000000} valueMin={subsMin} valueMax={subsMax} onChange={(min, max) => { setSubsMin(min); setSubsMax(max) }} formatLabel={formatNum} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Поиск по имени / хэндлу</label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Имя блогера..." value={search} onChange={e => setSearch(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition" />
                      </div>
                    </div>
                    <div />
                    <div className="flex gap-2">
                      <button className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg py-2.5 px-4 transition text-sm">
                        🔍 Подобрать блогеров
                      </button>
                      {hasActiveFilters && (
                        <button onClick={resetFilters} className="text-gray-400 hover:text-cyan-400 text-sm px-3 py-2.5 border border-gray-700 rounded-lg transition">✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 text-sm mb-4">Выберите вашу нишу — мы подберём релевантных блогеров автоматически</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {BUSINESS_NICHES.map(niche => {
                      const count = getNicheMatch(niche).length
                      const isActive = selectedNiche === niche.label
                      return (
                        <button key={niche.label} onClick={() => setSelectedNiche(isActive ? null : niche.label)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition text-center ${
                            isActive ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}>
                          <span className="text-2xl">{niche.icon}</span>
                          <span className="text-xs font-medium leading-tight">{niche.label}</span>
                          <span className="text-[10px] text-gray-500">{count} блогеров</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-400">{filtered.length} блогеров</div>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
              <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 text-sm rounded-md transition ${viewMode === 'cards' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>🃏 Карточки</button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-sm rounded-md transition ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>📊 Таблица</button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-12">Загрузка...</div>
          ) : viewMode === 'cards' ? (
            /* Card view */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(r => {
                const isSelected = currentSelected.has(r.id)
                return (
                  <div key={r.id}
                    className={`group relative bg-gray-800/50 border rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer ${
                      isSelected ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 hover:border-gray-600'
                    }`}
                    onClick={() => toggleSelect(r.id)}>
                    {/* Platform badge */}
                    <div className="absolute top-3 right-3 text-lg">{tab.icon}</div>
                    {/* Checkbox */}
                    <div className="absolute top-3 left-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition ${
                        isSelected ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-gray-600 group-hover:border-gray-400'
                      }`}>{isSelected && '✓'}</div>
                    </div>
                    {/* Avatar */}
                    <div className="flex flex-col items-center mt-4 mb-3">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(r.username || r.name)} flex items-center justify-center text-2xl font-bold text-white mb-2`}>
                        {(r.username || r.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="font-bold text-center">{r.name}</div>
                      {r.username && (
                        <a href={getProfileUrl(activeTab, r.username)} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-gray-500 text-xs hover:text-cyan-400 transition">@{r.username}</a>
                      )}
                    </div>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                      {r.city?.name && <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full">📍 {r.city.name}</span>}
                      {r.category && <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full">{r.category.icon} {r.category.name}</span>}
                    </div>
                    {/* Stats */}
                    <div className="flex justify-center gap-6 text-center">
                      <div>
                        <div className="text-lg font-bold">{formatNum(r.subscribers)}</div>
                        <div className="text-[10px] text-gray-500">подписчиков</div>
                      </div>
                      {(r.views || 0) > 0 && (
                        <div>
                          <div className="text-lg font-bold">{formatNum(r.views || 0)}</div>
                          <div className="text-[10px] text-gray-500">просмотров</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Table view */
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-left">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>Имя{sortIcon('name')}</th>
                    <th className="py-3 px-4">Handle</th>
                    <th className="py-3 px-4">Город</th>
                    <th className="py-3 px-4">Категория</th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('subscribers')}>Подписчики{sortIcon('subscribers')}</th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('sell_post')}>Пост ₸{sortIcon('sell_post')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(r => {
                    const isSelected = currentSelected.has(r.id)
                    return (
                      <tr key={r.id} className={`border-t border-gray-800/50 hover:bg-gray-900/40 transition cursor-pointer ${isSelected ? 'bg-cyan-500/10' : ''}`}
                        onClick={() => toggleSelect(r.id)}>
                        <td className="py-3 px-4">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                            isSelected ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-gray-600'
                          }`}>{isSelected && '✓'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium">{r.name}</td>
                        <td className="py-3 px-4">
                          {r.username && <a href={getProfileUrl(activeTab, r.username)} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()} className="text-gray-500 text-xs hover:text-cyan-400">@{r.username}</a>}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{r.city?.name || '—'}</td>
                        <td className="py-3 px-4 text-gray-300">{r.category ? `${r.category.icon} ${r.category.name}` : '—'}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatNum(r.subscribers)}</td>
                        <td className="py-3 px-4 text-right">{r.sell_post?.toLocaleString() || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="text-center text-gray-500 py-12">Ничего не найдено по фильтрам</div>}
            </div>
          )}

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div className="text-center mt-6">
              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm transition">
                Показать ещё ({filtered.length - visibleCount} осталось)
              </button>
            </div>
          )}
        </>
      )}

      {/* Selection panel */}
      {allSelectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 px-6 py-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 text-sm">
              <span className="font-semibold">Выбрано: <span className="text-cyan-400">{allSelectedItems.length}</span> блогеров</span>
              <span className="text-gray-400">Подписчики: <span className="text-white font-medium">{formatNum(allSelectedItems.reduce((s, r) => s + (r.subscribers || 0), 0))}</span></span>
              <span className="text-gray-400">Просмотры: <span className="text-white font-medium">{formatNum(allSelectedItems.reduce((s, r) => s + (r.views || 0), 0))}</span></span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg py-2 px-4 text-sm transition">📋 Экспорт подборки</button>
              <button onClick={clearSelection} className="text-gray-400 hover:text-white text-sm px-3 py-2 border border-gray-700 rounded-lg transition">✕ Сбросить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
