'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function EconomicsPage() {
  const [stats, setStats] = useState({ revenue: 0, cost: 0, margin: 0, deals: 0 })
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    loadEconomics()
  }, [])

  async function loadEconomics() {
    const { data: selections } = await supabase
      .from('selections')
      .select('total_cost, total_price')
      .eq('status', 'approved')

    const revenue = selections?.reduce((s, r) => s + (r.total_price || 0), 0) || 0
    const cost = selections?.reduce((s, r) => s + (r.total_cost || 0), 0) || 0

    setStats({
      revenue,
      cost,
      margin: revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0,
      deals: selections?.length || 0,
    })
  }

  const cards = [
    { label: 'Выручка', value: `${(stats.revenue / 1000).toFixed(0)}K ₸`, icon: '💰', desc: 'Одобренные подборки' },
    { label: 'Себестоимость', value: `${(stats.cost / 1000).toFixed(0)}K ₸`, icon: '📉', desc: 'Затраты на медиа' },
    { label: 'Маржа', value: `${stats.margin}%`, icon: '📊', desc: 'Средняя маржинальность' },
    { label: 'Сделки', value: stats.deals, icon: '🤝', desc: 'Одобренные подборки' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Экономика</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <span className="text-2xl">{c.icon}</span>
            <div className="text-2xl font-bold mt-3">{c.value}</div>
            <div className="text-sm text-gray-400 mt-1">{c.label}</div>
            <div className="text-xs text-gray-600 mt-0.5">{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">📈 Аналитика</h2>
        <p className="text-gray-400 text-sm">
          Графики и детальная аналитика появятся по мере накопления данных.
          Начните с создания подборок и закрытия сделок!
        </p>
      </div>
    </div>
  )
}
