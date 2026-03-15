'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function SelectionsPage() {
  const [selections, setSelections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => { loadSelections() }, [])

  async function loadSelections() {
    const { data } = await supabase
      .from('selections')
      .select('*, client:clients(company_name), items:selection_items(count)')
      .order('created_at', { ascending: false })
    setSelections(data || [])
    setLoading(false)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    archived: 'bg-gray-700',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Черновик',
    sent: 'Отправлено',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    archived: 'Архив',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Подборки</h1>
        <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition">
          + Новая подборка
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : selections.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">Пока нет подборок</h3>
          <p className="text-gray-400 text-sm">Создайте подборку медиа-ресурсов для клиента</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selections.map(s => (
            <div key={s.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColors[s.status]}`}>
                  {statusLabels[s.status]}
                </span>
                <span className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('ru')}</span>
              </div>
              <h3 className="font-medium mb-1">{s.name}</h3>
              {s.client && <div className="text-sm text-gray-400 mb-3">{s.client.company_name}</div>}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{s.items?.[0]?.count || 0} ресурсов</span>
                <span className="font-medium text-amber-400">{s.total_price?.toLocaleString() || 0} ₸</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
