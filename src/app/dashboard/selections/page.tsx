'use client'

import { useEffect, useState, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface Client {
  id: number
  company_name: string
}

interface MediaResource {
  id: number
  name: string
  username: string
  platform: string
  subscribers: number
  cost_post: number
  sell_post: number
  cost_story: number
  sell_story: number
  city: { name: string } | null
  category: { name: string } | null
}

interface SelectionItem {
  id?: number
  media_resource_id: number
  media?: MediaResource
  format: string
  cost: number
  price: number
}

interface Selection {
  id: number
  name: string
  status: string
  client_id: number | null
  client?: { company_name: string } | null
  total_cost: number
  total_price: number
  notes: string
  created_at: string
  items?: SelectionItem[]
}

const STATUSES = [
  { value: 'draft', label: 'Черновик', color: 'bg-gray-500' },
  { value: 'sent', label: 'Отправлено', color: 'bg-blue-500' },
  { value: 'approved', label: 'Одобрено', color: 'bg-green-500' },
  { value: 'rejected', label: 'Отклонено', color: 'bg-red-500' },
  { value: 'archived', label: 'Архив', color: 'bg-gray-700' },
]

const FORMATS = [
  { value: 'post', label: 'Пост' },
  { value: 'story', label: 'Сторис' },
  { value: 'post_story', label: 'Пост + Сторис' },
  { value: 'reels', label: 'Reels' },
]

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', telegram: '✈️', youtube: '▶️', tiktok: '🎵',
}

export default function SelectionsPage() {
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'create' | 'view'>('list')
  const [activeSelection, setActiveSelection] = useState<Selection | null>(null)

  // Create form
  const [formName, setFormName] = useState('')
  const [formClient, setFormClient] = useState<number | null>(null)
  const [formNotes, setFormNotes] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [items, setItems] = useState<SelectionItem[]>([])

  // Media picker
  const [showPicker, setShowPicker] = useState(false)
  const [mediaList, setMediaList] = useState<MediaResource[]>([])
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaPlatform, setMediaPlatform] = useState('')
  const [mediaLoading, setMediaLoading] = useState(false)

  const supabase = createSupabaseBrowser()

  useEffect(() => { loadSelections(); loadClients() }, [])

  async function loadSelections() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('selections')
        .select('*, client:clients(company_name)')
        .order('created_at', { ascending: false })
      setSelections(data || [])
    } catch {
      setSelections([])
    }
    setLoading(false)
  }

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .order('company_name')
      .range(0, 9999)
    setClients(data || [])
  }

  async function loadMedia() {
    setMediaLoading(true)
    let q = supabase
      .from('media_resources')
      .select('id, name, username, platform, subscribers, cost_post, sell_post, cost_story, sell_story, city:cities(name), category:categories(name)')
      .eq('is_active', true)
      .order('subscribers', { ascending: false })
      .range(0, 199)

    if (mediaPlatform) q = q.eq('platform', mediaPlatform)
    if (mediaSearch) q = q.or(`name.ilike.%${mediaSearch}%,username.ilike.%${mediaSearch}%`)

    const { data } = await q
    setMediaList(data || [])
    setMediaLoading(false)
  }

  async function createSelection() {
    if (!formName.trim()) return

    const totalCost = items.reduce((s, i) => s + i.cost, 0)
    const totalPrice = items.reduce((s, i) => s + i.price, 0)

    const { data: sel, error } = await supabase
      .from('selections')
      .insert({
        name: formName,
        client_id: formClient,
        notes: formNotes,
        status: 'draft',
        total_cost: totalCost,
        total_price: totalPrice,
      })
      .select()
      .single()

    if (error || !sel) return

    if (items.length > 0) {
      await supabase.from('selection_items').insert(
        items.map(item => ({
          selection_id: sel.id,
          media_resource_id: item.media_resource_id,
          format: item.format,
          cost: item.cost,
          price: item.price,
        }))
      )
    }

    setMode('list')
    setFormName('')
    setFormClient(null)
    setFormNotes('')
    setItems([])
    loadSelections()
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from('selections').update({ status }).eq('id', id)
    loadSelections()
  }

  async function deleteSelection(id: number) {
    if (!confirm('Удалить подборку?')) return
    await supabase.from('selection_items').delete().eq('selection_id', id)
    await supabase.from('selections').delete().eq('id', id)
    loadSelections()
  }

  async function viewSelection(sel: Selection) {
    const { data: selItems } = await supabase
      .from('selection_items')
      .select('*, media:media_resources(id, name, username, platform, subscribers, city:cities(name))')
      .eq('selection_id', sel.id)
    setActiveSelection({ ...sel, items: selItems || [] })
    setMode('view')
  }

  function addMedia(m: MediaResource, format: string) {
    if (items.find(i => i.media_resource_id === m.id && i.format === format)) return
    const cost = format === 'post' ? (m.cost_post || 0)
      : format === 'story' ? (m.cost_story || 0)
      : format === 'post_story' ? ((m.cost_post || 0) + (m.cost_story || 0))
      : (m.cost_post || 0)
    const price = format === 'post' ? (m.sell_post || 0)
      : format === 'story' ? (m.sell_story || 0)
      : format === 'post_story' ? ((m.sell_post || 0) + (m.sell_story || 0))
      : (m.sell_post || 0)

    setItems([...items, { media_resource_id: m.id, media: m, format, cost, price }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  const totalCost = items.reduce((s, i) => s + i.cost, 0)
  const totalPrice = items.reduce((s, i) => s + i.price, 0)
  const margin = totalPrice > 0 ? Math.round(((totalPrice - totalCost) / totalPrice) * 100) : 0

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n)

  // ─── LIST VIEW ──────────────────────────────────
  if (mode === 'list') return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Подборки</h1>
        <button
          onClick={() => { setMode('create'); setShowPicker(false); setItems([]) }}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
        >
          + Новая подборка
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse">
              <div className="h-5 w-48 bg-gray-800 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : selections.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">Пока нет подборок</h3>
          <p className="text-gray-400 text-sm mb-4">Создайте подборку медиа-ресурсов для клиента</p>
          <button
            onClick={() => setMode('create')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
          >
            Создать первую подборку
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selections.map(s => {
            const st = STATUSES.find(x => x.value === s.status)
            return (
              <div key={s.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${st?.color}`}>
                    {st?.label}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('ru')}</span>
                </div>
                <h3 className="font-medium mb-1">{s.name}</h3>
                {s.client && <div className="text-sm text-gray-400 mb-3">{s.client.company_name}</div>}
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Себестоимость: {fmt(s.total_cost)} ₸</span>
                  <span className="font-medium text-amber-400">{fmt(s.total_price)} ₸</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => viewSelection(s)} className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700">
                    Открыть
                  </button>
                  <select
                    value={s.status}
                    onChange={e => updateStatus(s.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300"
                  >
                    {STATUSES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                  <button onClick={() => deleteSelection(s.id)} className="px-2 py-1 text-red-400 hover:text-red-300 text-xs">🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── VIEW SELECTION ──────────────────────────────
  if (mode === 'view' && activeSelection) return (
    <div>
      <button onClick={() => { setMode('list'); setActiveSelection(null) }} className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
        ← Назад к подборкам
      </button>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{activeSelection.name}</h1>
          {activeSelection.client && <p className="text-gray-400 text-sm">{activeSelection.client.company_name}</p>}
        </div>
        <span className={`px-3 py-1 rounded-lg text-sm text-white ${STATUSES.find(s => s.value === activeSelection.status)?.color}`}>
          {STATUSES.find(s => s.value === activeSelection.status)?.label}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <div className="text-sm text-gray-400">Себестоимость</div>
          <div className="text-xl font-bold">{fmt(activeSelection.total_cost)} ₸</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <div className="text-sm text-gray-400">Цена клиенту</div>
          <div className="text-xl font-bold text-amber-400">{fmt(activeSelection.total_price)} ₸</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <div className="text-sm text-gray-400">Маржа</div>
          <div className="text-xl font-bold text-green-400">
            {activeSelection.total_price > 0 ? Math.round(((activeSelection.total_price - activeSelection.total_cost) / activeSelection.total_price) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Медиа-ресурсы ({activeSelection.items?.length || 0})</h2>
        </div>
        {(!activeSelection.items || activeSelection.items.length === 0) ? (
          <div className="p-8 text-center text-gray-500">Нет ресурсов в подборке</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {activeSelection.items.map((item, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <span className="text-lg">{PLATFORM_ICONS[item.media?.platform || ''] || '📌'}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.media?.name || '—'}</div>
                  <div className="text-xs text-gray-500">
                    @{item.media?.username} • {item.media?.city?.name || '—'} • {FORMATS.find(f => f.value === item.format)?.label}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-400">{fmt(item.cost)} ₸</div>
                  <div className="font-medium text-amber-400">{fmt(item.price)} ₸</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSelection.notes && (
        <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Заметки</div>
          <div className="text-sm">{activeSelection.notes}</div>
        </div>
      )}
    </div>
  )

  // ─── CREATE SELECTION ────────────────────────────
  return (
    <div>
      <button onClick={() => setMode('list')} className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
        ← Назад
      </button>
      <h1 className="text-2xl font-bold mb-6">Новая подборка</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Название подборки *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Напр.: Рестораны Алматы — март 2026"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Клиент</label>
              <select value={formClient || ''} onChange={e => setFormClient(e.target.value ? +e.target.value : null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">— Без клиента —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Заметки</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Items list */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold">Медиа в подборке ({items.length})</h2>
              <button onClick={() => { setShowPicker(true); loadMedia() }}
                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30">
                + Добавить ресурс
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Добавьте медиа-ресурсы из каталога
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {items.map((item, i) => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <span>{PLATFORM_ICONS[item.media?.platform || ''] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.media?.name}</div>
                      <div className="text-xs text-gray-500">@{item.media?.username} • {FORMATS.find(f => f.value === item.format)?.label}</div>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <div className="text-gray-500">{fmt(item.cost)} ₸</div>
                      <div className="text-amber-400 font-medium">{fmt(item.price)} ₸</div>
                    </div>
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={createSelection} disabled={!formName.trim()}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            Создать подборку
          </button>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 sticky top-4">
            <h3 className="font-semibold mb-4">Итого</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ресурсов</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Себестоимость</span>
                <span>{fmt(totalCost)} ₸</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
                <span className="text-gray-400">Цена клиенту</span>
                <span className="text-lg font-bold text-amber-400">{fmt(totalPrice)} ₸</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Прибыль</span>
                <span className="text-green-400">{fmt(totalPrice - totalCost)} ₸</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Маржа</span>
                <span className={margin > 30 ? 'text-green-400' : margin > 15 ? 'text-yellow-400' : 'text-red-400'}>{margin}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPicker(false)} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">Выберите медиа-ресурс</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="p-4 border-b border-gray-800 flex gap-3 flex-wrap">
              <input value={mediaSearch} onChange={e => setMediaSearch(e.target.value)}
                placeholder="Поиск по названию..."
                onKeyDown={e => e.key === 'Enter' && loadMedia()}
                className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
              <select value={mediaPlatform} onChange={e => { setMediaPlatform(e.target.value); setTimeout(loadMedia, 0) }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Все платформы</option>
                <option value="instagram">Instagram</option>
                <option value="telegram">Telegram</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
              <button onClick={loadMedia} className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm">Найти</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {mediaLoading ? (
                <div className="text-center text-gray-500 py-8">Загрузка...</div>
              ) : mediaList.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Ничего не найдено</div>
              ) : (
                <div className="space-y-1">
                  {mediaList.map(m => {
                    const alreadyAdded = items.some(i => i.media_resource_id === m.id)
                    return (
                      <div key={m.id} className={`p-3 rounded-xl flex items-center gap-3 ${alreadyAdded ? 'opacity-40' : 'hover:bg-gray-800'}`}>
                        <span className="text-lg">{PLATFORM_ICONS[m.platform] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-xs text-gray-500">@{m.username} • {m.city?.name || '—'} • {(m.subscribers / 1000).toFixed(0)}K</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {FORMATS.map(f => (
                            <button key={f.value} onClick={() => { addMedia(m, f.value); }}
                              disabled={alreadyAdded}
                              className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 disabled:opacity-30">
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
