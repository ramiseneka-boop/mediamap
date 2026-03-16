'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  is_active: boolean
  city: { name: string } | null
  category: { name: string; icon: string } | null
}

const PLATFORM_META: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram Паблики', icon: '📸' },
  telegram: { label: 'Telegram каналы', icon: '✈️' },
  youtube: { label: 'YouTube', icon: '▶️' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  whatsapp: { label: 'WhatsApp рассылка', icon: '💬' },
  outdoor: { label: 'Наружная реклама', icon: '🏙' },
}

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

/* ── Multi-select dropdown component ── */
function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-left text-white flex items-center justify-between hover:border-gray-600 transition"
      >
        <span className={selected.length ? 'text-white' : 'text-gray-400'}>
          {selected.length ? `Выбрано: ${selected.length}` : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              placeholder="Поиск..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="overflow-y-auto max-h-48 px-1 pb-2">
            {filtered.length === 0 && <div className="text-gray-500 text-sm px-3 py-2">Не найдено</div>}
            {filtered.map(o => (
              <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/50 rounded cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={() => toggle(o)}
                  className="accent-cyan-500 rounded"
                />
                <span className="text-gray-200">{o}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-xs text-gray-400 hover:text-cyan-400 py-1.5 border-t border-gray-700"
            >
              Сбросить всё
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Range slider component ── */
function RangeSlider({ min, max, valueMin, valueMax, onChange, formatLabel }: {
  min: number; max: number
  valueMin: number; valueMax: number
  onChange: (min: number, max: number) => void
  formatLabel: (n: number) => string
}) {
  const pctMin = ((valueMin - min) / (max - min)) * 100
  const pctMax = ((valueMax - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>{formatLabel(valueMin)}</span>
        <span>{formatLabel(valueMax)}</span>
      </div>
      <div className="relative h-2 bg-gray-700 rounded-full">
        <div
          className="absolute h-2 bg-cyan-500 rounded-full"
          style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
        />
        <input
          type="range"
          min={min} max={max}
          value={valueMin}
          onChange={e => {
            const v = Number(e.target.value)
            if (v <= valueMax) onChange(v, valueMax)
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer"
          style={{ top: 0, left: 0 }}
        />
        <input
          type="range"
          min={min} max={max}
          value={valueMax}
          onChange={e => {
            const v = Number(e.target.value)
            if (v >= valueMin) onChange(valueMin, v)
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer"
          style={{ top: 0, left: 0 }}
        />
      </div>
    </div>
  )
}

export default function PlatformCatalogPage() {
  const params = useParams()
  const router = useRouter()
  const platform = params.platform as string
  const meta = PLATFORM_META[platform] || { label: platform, icon: '📡' }

  const [resources, setResources] = useState<MediaResource[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [subsMin, setSubsMin] = useState(1000)
  const [subsMax, setSubsMax] = useState(5000000)
  const [viewsMin, setViewsMin] = useState(0)
  const [viewsMax, setViewsMax] = useState(1000000)
  const [activeTab, setActiveTab] = useState<'channels' | 'business'>('channels')
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const [filtersApplied, setFiltersApplied] = useState(false)

  // Sort
  const [sortBy, setSortBy] = useState<'subscribers' | 'sell_post' | 'name'>('subscribers')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const supabase = createSupabaseBrowser()

  useEffect(() => { loadData() }, [platform])

  async function loadData() {
    setLoading(true)
    const [{ data: media }, { data: citiesData }, { data: catsData }] = await Promise.all([
      supabase
        .from('media_resources')
        .select('*, city:cities(name), category:categories(name, icon)')
        .eq('platform', platform)
        .order('subscribers', { ascending: false }),
      supabase.from('cities').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setResources(media || [])
    setCities(citiesData || [])
    setCategories(catsData || [])
    setLoading(false)
  }

  const usedCities = [...new Set(resources.map(r => r.city?.name).filter(Boolean))] as string[]
  const usedCategories = [...new Set(resources.map(r => r.category?.name).filter(Boolean))] as string[]

  // Business niche matching
  const getNicheMatch = useCallback((niche: typeof BUSINESS_NICHES[0]) => {
    return resources.filter(r => {
      const cat = r.category?.name?.toLowerCase() || ''
      return niche.categories.some(c => cat.includes(c.toLowerCase()))
    })
  }, [resources])

  const filtered = resources
    .filter(r => {
      if (activeTab === 'business' && selectedNiche) {
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
    })

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
    return n.toString()
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sortIcon = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const totalSubs = filtered.reduce((s, r) => s + (r.subscribers || 0), 0)

  const resetFilters = () => {
    setSearch('')
    setSelectedCities([])
    setSelectedCategories([])
    setSubsMin(1000)
    setSubsMax(5000000)
    setViewsMin(0)
    setViewsMax(1000000)
    setSelectedNiche(null)
    setFiltersApplied(false)
  }

  const hasActiveFilters = search || selectedCities.length || selectedCategories.length || subsMin > 1000 || subsMax < 5000000 || selectedNiche

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard/pabliks')}
          className="text-gray-400 hover:text-white transition text-lg"
        >
          ←
        </button>
        <span className="text-3xl">{meta.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{meta.label}</h1>
          <p className="text-gray-400 text-sm">
            {loading ? 'Загрузка...' : `${filtered.length} из ${resources.length} · ${formatNum(totalSubs)} подписчиков`}
          </p>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 mb-6 overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white">Найдите лучшие каналы для размещения</h2>
          <p className="text-cyan-100 text-sm mt-1">Выберите подходящие каналы из нашей базы для эффективного продвижения вашего бренда</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => { setActiveTab('channels'); setSelectedNiche(null) }}
            className={`px-6 py-3 text-sm font-semibold tracking-wide transition ${activeTab === 'channels' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}
          >
            ПОДБОРКА КАНАЛОВ
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`px-6 py-3 text-sm font-semibold tracking-wide transition ${activeTab === 'business' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}
          >
            ПОДБОРКА ПО ВИДУ ДЕЯТЕЛЬНОСТИ
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'channels' ? (
            <div className="space-y-5">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Города</label>
                  <MultiSelect
                    options={usedCities.sort()}
                    selected={selectedCities}
                    onChange={setSelectedCities}
                    placeholder="Выберите города"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Тематика каналов</label>
                  <MultiSelect
                    options={usedCategories.sort()}
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="Выберите тематику"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Количество подписчиков</label>
                  <RangeSlider
                    min={1000} max={5000000}
                    valueMin={subsMin} valueMax={subsMax}
                    onChange={(min, max) => { setSubsMin(min); setSubsMax(max) }}
                    formatLabel={formatNum}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Поиск по названию</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      placeholder="Название канала..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Средние просмотры</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="От"
                      value={viewsMin || ''}
                      onChange={e => setViewsMin(Number(e.target.value) || 0)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                    <input
                      type="number"
                      placeholder="До"
                      value={viewsMax || ''}
                      onChange={e => setViewsMax(Number(e.target.value) || 1000000)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltersApplied(true)}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg py-2.5 px-4 transition text-sm"
                  >
                    🔍 Подобрать каналы
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="text-gray-400 hover:text-cyan-400 text-sm px-3 py-2.5 border border-gray-700 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Business niche tab */
            <div>
              <p className="text-gray-400 text-sm mb-4">Выберите вашу нишу — мы подберём релевантные каналы автоматически</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {BUSINESS_NICHES.map(niche => {
                  const count = getNicheMatch(niche).length
                  const isActive = selectedNiche === niche.label
                  return (
                    <button
                      key={niche.label}
                      onClick={() => setSelectedNiche(isActive ? null : niche.label)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition text-center ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800/80'
                      }`}
                    >
                      <span className="text-2xl">{niche.icon}</span>
                      <span className="text-xs font-medium leading-tight">{niche.label}</span>
                      <span className="text-[10px] text-gray-500">{count} каналов</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/50 text-gray-400 text-left">
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                  Название{sortIcon('name')}
                </th>
                <th className="py-3 px-4">Город</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('subscribers')}>
                  Подписчики{sortIcon('subscribers')}
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('sell_post')}>
                  Пост ₸{sortIcon('sell_post')}
                </th>
                <th className="py-3 px-4 text-right">Сторис ₸</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-gray-800/50 hover:bg-gray-900/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-medium">{r.name}</div>
                    {r.username && (
                      <a
                        href={platform === 'telegram' ? `https://t.me/${r.username}` : platform === 'instagram' ? `https://instagram.com/${r.username}` : `#`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 text-xs hover:text-cyan-400 transition"
                      >
                        @{r.username}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{r.city?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-300">
                    {r.category ? `${r.category.icon} ${r.category.name}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{formatNum(r.subscribers)}</td>
                  <td className="py-3 px-4 text-right">
                    <div>{r.sell_post?.toLocaleString() || '—'}</div>
                    <div className="text-gray-600 text-xs">себ: {r.cost_post?.toLocaleString() || '—'}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div>{r.sell_story?.toLocaleString() || '—'}</div>
                    <div className="text-gray-600 text-xs">себ: {r.cost_story?.toLocaleString() || '—'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              {resources.length === 0 ? 'Пока нет ресурсов на этой платформе' : 'Ничего не найдено по фильтрам'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
