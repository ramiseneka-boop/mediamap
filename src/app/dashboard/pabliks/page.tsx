'use client'

import { useEffect, useState } from 'react'
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
  category: { name: string, icon: string } | null
}

const PLATFORMS = [
  { value: '', label: 'Все платформы' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'telegram', label: '✈️ Telegram' },
  { value: 'youtube', label: '▶️ YouTube' },
  { value: 'tiktok', label: '🎵 TikTok' },
  { value: '2gis', label: '📍 2GIS' },
  { value: 'outdoor', label: '🏙 Наружная' },
]

export default function MediaPage() {
  const [resources, setResources] = useState<MediaResource[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: media }, { data: citiesData }, { data: catsData }] = await Promise.all([
      supabase.from('media_resources').select('*, city:cities(name), category:categories(name, icon)').order('subscribers', { ascending: false }),
      supabase.from('cities').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setResources(media || [])
    setCities(citiesData || [])
    setCategories(catsData || [])
    setLoading(false)
  }

  const filtered = resources.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.username?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCity && r.city?.name !== filterCity) return false
    if (filterPlatform && r.platform !== filterPlatform) return false
    if (filterCategory && r.category?.name !== filterCategory) return false
    return true
  })

  const formatNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n.toString()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Медиа-ресурсы</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
        >
          + Добавить
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 w-full sm:w-auto"
        />
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все города</option>
          {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все категории</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>Найдено: <b className="text-white">{filtered.length}</b></span>
        <span>Подписчики: <b className="text-white">{formatNum(filtered.reduce((s, r) => s + r.subscribers, 0))}</b></span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="py-3 px-3">Название</th>
                <th className="py-3 px-3">Платформа</th>
                <th className="py-3 px-3">Город</th>
                <th className="py-3 px-3">Категория</th>
                <th className="py-3 px-3 text-right">Подписчики</th>
                <th className="py-3 px-3 text-right">Пост ₸</th>
                <th className="py-3 px-3 text-right">Сторис ₸</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition">
                  <td className="py-3 px-3">
                    <div className="font-medium">{r.name}</div>
                    {r.username && <div className="text-gray-500 text-xs">@{r.username}</div>}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                      {PLATFORMS.find(p => p.value === r.platform)?.label || r.platform}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-300">{r.city?.name || '—'}</td>
                  <td className="py-3 px-3 text-gray-300">{r.category ? `${r.category.icon} ${r.category.name}` : '—'}</td>
                  <td className="py-3 px-3 text-right">{formatNum(r.subscribers)}</td>
                  <td className="py-3 px-3 text-right">
                    <div>{r.sell_post?.toLocaleString() || '—'}</div>
                    <div className="text-gray-600 text-xs">себ: {r.cost_post?.toLocaleString() || '—'}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div>{r.sell_story?.toLocaleString() || '—'}</div>
                    <div className="text-gray-600 text-xs">себ: {r.cost_story?.toLocaleString() || '—'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              {resources.length === 0 ? 'Нет медиа-ресурсов. Добавьте первый!' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
