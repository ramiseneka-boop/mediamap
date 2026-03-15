'use client'

import { useEffect, useState } from 'react'
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
  '2gis': { label: '2GIS реклама', icon: '📍' },
  outdoor: { label: 'Наружная реклама', icon: '🏙' },
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
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState<'subscribers' | 'sell_post' | 'name'>('subscribers')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    loadData()
  }, [platform])

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

  const filtered = resources
    .filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.username?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCity && r.city?.name !== filterCity) return false
      if (filterCategory && r.category?.name !== filterCategory) return false
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

  // Unique cities/categories from loaded resources for smarter filters
  const usedCities = [...new Set(resources.map(r => r.city?.name).filter(Boolean))].sort()
  const usedCategories = [...new Set(resources.map(r => r.category?.name).filter(Boolean))].sort()

  const totalSubs = filtered.reduce((s, r) => s + (r.subscribers || 0), 0)

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="🔍 Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 w-full sm:w-64"
        />
        <select
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все города</option>
          {usedCities.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все категории</option>
          {usedCategories.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
        {(search || filterCity || filterCategory) && (
          <button
            onClick={() => { setSearch(''); setFilterCity(''); setFilterCategory('') }}
            className="text-sm text-gray-400 hover:text-amber-400 transition"
          >
            ✕ Сбросить
          </button>
        )}
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
                        href={`https://instagram.com/${r.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 text-xs hover:text-amber-400 transition"
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
