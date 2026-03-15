'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface Stats {
  totalMedia: number
  totalClients: number
  activeSelections: number
  totalRevenue: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalMedia: 0, totalClients: 0, activeSelections: 0, totalRevenue: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [media, clients, selections] = await Promise.all([
      supabase.from('media_resources').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('selections').select('id, total_price', { count: 'exact' }).eq('status', 'approved'),
    ])

    const revenue = selections.data?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0

    setStats({
      totalMedia: media.count || 0,
      totalClients: clients.count || 0,
      activeSelections: selections.count || 0,
      totalRevenue: revenue,
    })

    const { data: activity } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentActivity(activity || [])
  }

  const cards = [
    { label: 'Медиа-ресурсы', value: stats.totalMedia, icon: '📡', color: 'from-blue-500 to-cyan-500' },
    { label: 'Клиенты', value: stats.totalClients, icon: '👥', color: 'from-green-500 to-emerald-500' },
    { label: 'Активные подборки', value: stats.activeSelections, icon: '📋', color: 'from-amber-500 to-orange-500' },
    { label: 'Выручка', value: `${(stats.totalRevenue / 1000).toFixed(0)}K ₸`, icon: '💰', color: 'from-purple-500 to-pink-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Обзор</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${card.color}`} />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold mb-4">Быстрые действия</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/dashboard/selections" className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 transition">
            + Новая подборка
          </a>
          <a href="/dashboard/clients" className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition">
            + Добавить клиента
          </a>
          <a href="/dashboard/pabliks" className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition">
            Медиа-каталог
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Последняя активность</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">Пока нет активности. Начните с добавления медиа-ресурсов!</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-300">{a.action}</span>
                <span className="text-gray-600 ml-auto">{new Date(a.created_at).toLocaleString('ru')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
