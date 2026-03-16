'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface Stats {
  totalMedia: number
  totalClients: number
  activeSelections: number
  totalRevenue: number
  platformBreakdown: { platform: string; count: number }[]
  recentClients: { id: number; company_name: string; status: string; created_at: string }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMedia: 0, totalClients: 0, activeSelections: 0, totalRevenue: 0,
    platformBreakdown: [], recentClients: [],
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    // Media stats
    const { data: media } = await supabase
      .from('media_resources')
      .select('platform')
      .range(0, 9999)

    const platformMap = new Map<string, number>()
    media?.forEach(m => {
      const p = m.platform || 'instagram'
      platformMap.set(p, (platformMap.get(p) || 0) + 1)
    })
    const platformBreakdown = Array.from(platformMap.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)

    // Clients
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })

    // Recent clients
    const { data: recent } = await supabase
      .from('clients')
      .select('id, company_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8)

    // Selections (safe — may not exist yet)
    let activeSelections = 0
    let totalRevenue = 0
    try {
      const { data: sel, count } = await supabase
        .from('selections')
        .select('total_price', { count: 'exact' })
        .eq('status', 'approved')
      activeSelections = count || 0
      totalRevenue = sel?.reduce((s, r) => s + (r.total_price || 0), 0) || 0
    } catch {}

    setStats({
      totalMedia: media?.length || 0,
      totalClients: clientsCount || 0,
      activeSelections,
      totalRevenue,
      platformBreakdown,
      recentClients: recent || [],
    })
    setLoading(false)
  }

  const PLATFORM_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    instagram: { label: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-600' },
    telegram: { label: 'Telegram', icon: '✈️', color: 'from-blue-400 to-blue-600' },
    youtube: { label: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-700' },
    tiktok: { label: 'TikTok', icon: '🎵', color: 'from-gray-600 to-cyan-500' },
  }

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    new: { label: 'Новый', color: 'bg-blue-500' },
    contacted: { label: 'Связались', color: 'bg-yellow-500' },
    negotiation: { label: 'Переговоры', color: 'bg-orange-500' },
    proposal: { label: 'КП', color: 'bg-purple-500' },
    won: { label: 'Сделка', color: 'bg-green-500' },
    lost: { label: 'Отказ', color: 'bg-red-500' },
    dormant: { label: 'Спящий', color: 'bg-gray-500' },
  }

  const cards = [
    { label: 'Медиа-ресурсы', value: stats.totalMedia, icon: '📡', color: 'from-blue-500 to-cyan-500', href: '/dashboard/pabliks' },
    { label: 'Клиенты', value: stats.totalClients, icon: '👥', color: 'from-green-500 to-emerald-500', href: '/dashboard/clients' },
    { label: 'Подборки', value: stats.activeSelections, icon: '📋', color: 'from-amber-500 to-orange-500', href: '/dashboard/selections' },
    { label: 'Выручка', value: stats.totalRevenue > 0 ? `${(stats.totalRevenue / 1000).toFixed(0)}K ₸` : '—', icon: '💰', color: 'from-purple-500 to-pink-500', href: '/dashboard/economics' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Обзор</h1>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse">
              <div className="h-8 w-8 bg-gray-800 rounded mb-3" />
              <div className="h-6 w-16 bg-gray-800 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(card => (
              <a key={card.label} href={card.href} className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${card.color}`} />
                </div>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-sm text-gray-400 mt-1 group-hover:text-gray-300 transition">{card.label} →</div>
              </a>
            ))}
          </div>

          {/* Platform breakdown + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Platforms */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">📡 Медиа по платформам</h2>
              <div className="space-y-3">
                {stats.platformBreakdown.map(p => {
                  const meta = PLATFORM_LABELS[p.platform] || { label: p.platform, icon: '📌', color: 'from-gray-500 to-gray-600' }
                  const pct = stats.totalMedia > 0 ? Math.round((p.count / stats.totalMedia) * 100) : 0
                  return (
                    <div key={p.platform} className="flex items-center gap-3">
                      <span className="text-lg w-6 text-center">{meta.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{meta.label}</span>
                          <span className="text-gray-400">{p.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${meta.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent clients */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">👥 Последние клиенты</h2>
                <a href="/dashboard/clients" className="text-xs text-cyan-400 hover:text-cyan-300">Все →</a>
              </div>
              {stats.recentClients.length === 0 ? (
                <p className="text-gray-500 text-sm">Пока нет клиентов</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentClients.map(c => {
                    const st = STATUS_MAP[c.status] || { label: c.status, color: 'bg-gray-500' }
                    return (
                      <div key={c.id} className="flex items-center gap-3 text-sm py-1.5">
                        <div className={`w-2 h-2 rounded-full ${st.color} shrink-0`} />
                        <span className="flex-1 truncate">{c.company_name}</span>
                        <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('ru')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">⚡ Быстрые действия</h2>
            <div className="flex flex-wrap gap-3">
              <a href="/dashboard/pabliks" className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition">
                📡 Медиа-каталог
              </a>
              <a href="/dashboard/selections" className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 transition">
                + Новая подборка
              </a>
              <a href="/dashboard/clients" className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition">
                + Добавить клиента
              </a>
              <a href="/dashboard/smm" className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/20 transition">
                🚀 SMM-инструменты
              </a>
              <a href="/dashboard/whatsapp" className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition">
                💬 WhatsApp рассылка
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
