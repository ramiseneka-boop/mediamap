'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface PlatformStat {
  platform: string
  count: number
  subscribers: number
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram Паблики', icon: '📸', color: 'from-pink-500 to-purple-600', desc: 'Городские паблики Казахстана' },
  { value: 'telegram', label: 'Telegram каналы', icon: '✈️', color: 'from-blue-400 to-blue-600', desc: 'Новостные и тематические каналы' },
  { value: 'bloggers', label: 'Реклама у Блогеров', icon: '🎬', color: 'from-blue-600 to-red-500', desc: 'YouTube, Instagram, TikTok блогеры' },
  { value: 'whatsapp', label: 'WhatsApp рассылка', icon: '💬', color: 'from-green-500 to-green-700', desc: 'Рассылки по базе контактов' },
  { value: 'smm', label: 'SMM-Ведение', icon: '🚀', color: 'from-cyan-500 to-teal-600', desc: 'Контент, хештеги, лиды, календарь' },
  { value: 'outdoor', label: 'Наружная реклама', icon: '🏙', color: 'from-amber-500 to-orange-600', desc: 'Билборды, ситилайты, LED' },
  { value: 'radio', label: 'Реклама на Радио', icon: '📻', color: 'from-purple-600 to-fuchsia-700', desc: 'FM-станции Казахстана' },
]

export default function MediaPage() {
  const [stats, setStats] = useState<PlatformStat[]>([])
  const [clientsCount, setClientsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const { data } = await supabase
      .from('media_resources')
      .select('platform, subscribers')
      .range(0, 9999)

    if (data) {
      const map = new Map<string, PlatformStat>()
      for (const r of data) {
        const p = r.platform || 'instagram'
        const existing = map.get(p) || { platform: p, count: 0, subscribers: 0 }
        existing.count++
        existing.subscribers += r.subscribers || 0
        map.set(p, existing)
      }
      setStats(Array.from(map.values()))
    }
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    setClientsCount(count || 0)
    setLoading(false)
  }

  const getStat = (platform: string) => stats.find(s => s.platform === platform)
  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
    return n.toString()
  }
  const totalResources = stats.reduce((s, p) => s + p.count, 0)
  const totalSubs = stats.reduce((s, p) => s + p.subscribers, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Медиа-ресурсы</h1>
        <p className="text-gray-400 text-sm">
          {loading ? 'Загрузка...' : `${totalResources} ресурсов · ${formatNum(totalSubs)} подписчиков`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(p => {
          const isBloggers = p.value === 'bloggers'
          const stat = isBloggers ? undefined : getStat(p.value)
          const bloggersCount = isBloggers ? (getStat('youtube')?.count || 0) + (getStat('tiktok')?.count || 0) : 0
          const bloggersSubs = isBloggers ? (getStat('youtube')?.subscribers || 0) + (getStat('tiktok')?.subscribers || 0) : 0
          const count = isBloggers ? bloggersCount : (stat?.count || 0)
          const subs = isBloggers ? bloggersSubs : (stat?.subscribers || 0)

          return (
            <button
              key={p.value}
              onClick={() => p.value === 'outdoor' ? null : router.push(p.value === 'radio' ? '/dashboard/radio' : p.value === 'whatsapp' ? '/dashboard/whatsapp' : p.value === 'bloggers' ? '/dashboard/bloggers' : p.value === 'smm' ? '/dashboard/smm' : `/dashboard/pabliks/${p.value}`)}
              className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-80 group-hover:opacity-100 transition`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="text-4xl mb-3">{p.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{p.label}</h3>
                <p className="text-white/70 text-sm mb-4">{p.desc}</p>
                
                <div className="flex items-center gap-4">
                  {p.value === 'smm' ? (
                    <div className="flex gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">5</div>
                        <div className="text-xs text-white/60">инструментов</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">18</div>
                        <div className="text-xs text-white/60">ниш</div>
                      </div>
                    </div>
                  ) : p.value === 'radio' ? (
                    <div>
                      <div className="text-2xl font-bold text-white">14</div>
                      <div className="text-xs text-white/60">регионов</div>
                    </div>
                  ) : p.value === 'whatsapp' ? (
                    clientsCount > 0 ? (
                      <div>
                        <div className="text-2xl font-bold text-white">{formatNum(clientsCount)}</div>
                        <div className="text-xs text-white/60">контактов в базе</div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/50">Загрузка...</div>
                    )
                  ) : count > 0 ? (
                    <>
                      <div>
                        <div className="text-2xl font-bold text-white">{count}</div>
                        <div className="text-xs text-white/60">ресурсов</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{formatNum(subs)}</div>
                        <div className="text-xs text-white/60">подписчиков</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-white/50">Скоро появятся</div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="absolute top-4 right-4 text-white/40 group-hover:text-white/80 transition text-xl">→</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
