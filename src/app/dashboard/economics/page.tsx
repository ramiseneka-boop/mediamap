'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface SelectionRow {
  id: number
  name: string
  status: string
  total_cost: number
  total_price: number
  created_at: string
  client?: { company_name: string } | null
}

export default function EconomicsPage() {
  const [selections, setSelections] = useState<SelectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mediaCount, setMediaCount] = useState(0)
  const [clientsCount, setClientsCount] = useState(0)
  const supabase = createSupabaseBrowser()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data } = await supabase
        .from('selections')
        .select('id, name, status, total_cost, total_price, created_at, client:clients(company_name)')
        .order('created_at', { ascending: false })
      setSelections(data || [])
    } catch {
      setSelections([])
    }

    const { count: mc } = await supabase.from('media_resources').select('id', { count: 'exact', head: true })
    const { count: cc } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    setMediaCount(mc || 0)
    setClientsCount(cc || 0)
    setLoading(false)
  }

  const approved = selections.filter(s => s.status === 'approved')
  const revenue = approved.reduce((s, r) => s + (r.total_price || 0), 0)
  const cost = approved.reduce((s, r) => s + (r.total_cost || 0), 0)
  const profit = revenue - cost
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
  const avgDeal = approved.length > 0 ? Math.round(revenue / approved.length) : 0

  const allRevenue = selections.reduce((s, r) => s + (r.total_price || 0), 0)
  const allCost = selections.reduce((s, r) => s + (r.total_cost || 0), 0)

  const statusGroups = [
    { status: 'draft', label: 'Черновики', color: 'bg-gray-500' },
    { status: 'sent', label: 'Отправлены', color: 'bg-blue-500' },
    { status: 'approved', label: 'Одобрены', color: 'bg-green-500' },
    { status: 'rejected', label: 'Отклонены', color: 'bg-red-500' },
  ].map(g => ({
    ...g,
    count: selections.filter(s => s.status === g.status).length,
    sum: selections.filter(s => s.status === g.status).reduce((s, r) => s + (r.total_price || 0), 0),
  }))

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n)

  const cards = [
    { label: 'Выручка', value: `${fmt(revenue)} ₸`, icon: '💰', desc: 'Одобренные подборки', color: 'text-amber-400' },
    { label: 'Себестоимость', value: `${fmt(cost)} ₸`, icon: '📉', desc: 'Затраты на медиа', color: 'text-gray-300' },
    { label: 'Прибыль', value: `${fmt(profit)} ₸`, icon: '📈', desc: `Маржа ${margin}%`, color: profit > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Средний чек', value: `${fmt(avgDeal)} ₸`, icon: '🎯', desc: `${approved.length} сделок`, color: 'text-cyan-400' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Экономика</h1>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse">
              <div className="h-8 w-8 bg-gray-800 rounded mb-3" />
              <div className="h-6 w-20 bg-gray-800 rounded mb-2" />
              <div className="h-4 w-28 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Main cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <span className="text-2xl">{c.icon}</span>
                <div className={`text-2xl font-bold mt-3 ${c.color}`}>{c.value}</div>
                <div className="text-sm text-gray-400 mt-1">{c.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pipeline */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">📊 Воронка подборок</h2>
              <div className="space-y-3">
                {statusGroups.map(g => (
                  <div key={g.status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${g.color} shrink-0`} />
                    <span className="text-sm flex-1">{g.label}</span>
                    <span className="text-sm text-gray-400">{g.count}</span>
                    <span className="text-sm font-medium w-28 text-right">{fmt(g.sum)} ₸</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-3 flex items-center gap-3">
                  <div className="w-3 h-3" />
                  <span className="text-sm flex-1 font-medium">Всего</span>
                  <span className="text-sm text-gray-400">{selections.length}</span>
                  <span className="text-sm font-bold w-28 text-right text-amber-400">{fmt(allRevenue)} ₸</span>
                </div>
              </div>
              {selections.length === 0 && (
                <p className="text-gray-500 text-sm mt-4">Создайте подборки, чтобы видеть воронку</p>
              )}
            </div>

            {/* Key metrics */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">🏢 Ресурсы платформы</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Медиа-ресурсов</span>
                  <span className="text-lg font-bold">{fmt(mediaCount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Клиентов в CRM</span>
                  <span className="text-lg font-bold">{fmt(clientsCount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Конверсия (одобрено/всего)</span>
                  <span className="text-lg font-bold">
                    {selections.length > 0 ? Math.round((approved.length / selections.length) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Потенциал воронки</span>
                  <span className="text-lg font-bold text-cyan-400">{fmt(allRevenue - revenue)} ₸</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent deals */}
          {approved.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">✅ Закрытые сделки</h2>
              <div className="space-y-2">
                {approved.map(s => (
                  <div key={s.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-800 last:border-0">
                    <span className="flex-1">{s.name}</span>
                    <span className="text-gray-500">{s.client?.company_name}</span>
                    <span className="font-medium text-amber-400 w-28 text-right">{fmt(s.total_price)} ₸</span>
                    <span className="text-green-400 w-16 text-right">
                      {s.total_price > 0 ? Math.round(((s.total_price - s.total_cost) / s.total_price) * 100) : 0}%
                    </span>
                    <span className="text-xs text-gray-500 w-20 text-right">{new Date(s.created_at).toLocaleDateString('ru')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
