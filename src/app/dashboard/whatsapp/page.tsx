'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

/* ── Multi-select dropdown ── */
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
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between hover:border-gray-600 transition"
      >
        <span className={selected.length ? 'text-white' : 'text-gray-400'}>
          {selected.length ? `Выбрано: ${selected.length}` : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">
              {s}
              <button onClick={() => toggle(s)} className="hover:text-white">×</button>
            </span>
          ))}
        </div>
      )}
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
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="accent-cyan-500 rounded" />
                <span className="text-gray-200">{o}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full text-xs text-gray-400 hover:text-cyan-400 py-1.5 border-t border-gray-700">
              Сбросить всё
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Hardcoded templates (fallback if DB tables not yet created)
const FALLBACK_TEMPLATES = [
  { id: 1, name: '🍽️ Рестораны/Кафе', niche: 'Рестораны/Кафе', message: 'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть Казахстана. Помогаем ресторанам и кафе привлекать гостей через рекламу в Instagram-пабликах.\n\n🔥 Что мы предлагаем:\n✅ Размещение в 700+ городских пабликах\n✅ Охват от 50 000 до 500 000 подписчиков\n✅ Нативный формат — не выглядит как реклама\n✅ Результат уже в первые дни\n\n📊 Кейс: ресторан в Алматы получил 200+ бронирований за неделю с одного размещения.\n\nХотите узнать, сколько стоит реклама для вашего заведения? Подготовим бесплатный медиаплан! 📋' },
  { id: 2, name: '💇 Салоны красоты', niche: 'Салоны красоты', message: 'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть. Помогаем салонам красоты привлекать клиентов через Instagram-паблики вашего города.\n\n💅 Почему это работает:\n✅ Ваша реклама в пабликах, которые читает ваша ЦА\n✅ Нативный формат — сохраняют и пересылают\n✅ Охват от 50К до 500К подписчиков\n✅ Стоимость от 15 000₸ за размещение\n\n📊 Кейс: салон красоты в Астане — 150 новых записей за 5 дней.\n\nПодготовим бесплатную подборку пабликов для вашего города?' },
  { id: 3, name: '🏥 Медицинские центры', niche: 'Медицина', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем медицинским центрам привлекать пациентов через рекламу в Instagram-пабликах.\n\n🏥 Преимущества:\n✅ 700+ пабликов в 14 регионах КЗ\n✅ Аудитория 93М+ подписчиков\n✅ Нативный формат — доверие аудитории\n✅ Таргетинг по городу и категории\n\n📊 Медицинские центры получают в среднем 80-120 обращений с одной кампании.\n\nГотовы подготовить персональный медиаплан для вашей клиники!' },
  { id: 4, name: '🏋️ Фитнес/Спорт', niche: 'Фитнес', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем фитнес-клубам и спортзалам привлекать новых клиентов.\n\n💪 Что предлагаем:\n✅ Реклама в городских Instagram-пабликах\n✅ Охват активной аудитории вашего города\n✅ Нативный формат — люди сохраняют и делятся\n✅ Идеально для акций и сезонных предложений\n\n📊 Фитнес-клуб в Караганде: +300 заявок на пробное занятие за 2 недели.\n\nХотите узнать стоимость? Подготовим медиаплан бесплатно!' },
  { id: 5, name: '🎓 Образование', niche: 'Образование', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем образовательным центрам и школам привлекать учеников через Instagram-паблики.\n\n🎓 Почему паблики:\n✅ Мамочки и родители — основная аудитория городских пабликов\n✅ 700+ пабликов в 14 регионах\n✅ Нативный формат — высокое доверие\n✅ Отлично работает для набора на курсы и в школы\n\nПодготовим персональную подборку пабликов для вашего города?' },
  { id: 6, name: '🏠 Недвижимость', niche: 'Недвижимость', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем застройщикам и агентствам недвижимости привлекать покупателей.\n\n🏠 Наши возможности:\n✅ 700+ городских Instagram-пабликов\n✅ Охват 93М+ подписчиков в 14 регионах\n✅ Идеально для ЖК, квартир, коммерческой недвижимости\n✅ Формат «городская новость» — максимальное доверие\n\n📊 Застройщик в Алматы: 500+ обращений за месяц с 3 размещений.\n\nГотовы обсудить стратегию продвижения ваших объектов!' },
]

interface Template {
  id: number
  name: string
  niche: string
  message: string
}

interface Broadcast {
  id: number
  name: string
  template_id: number
  status: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  replied_count: number
  created_at: string
}

interface City {
  id: number
  name: string
}

export default function WhatsAppPage() {
  const supabase = createSupabaseBrowser()
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [niches, setNiches] = useState<string[]>([])
  const [totalClients, setTotalClients] = useState(0)

  // New broadcast form
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [filterCities, setFilterCities] = useState<string[]>([])
  const [filterNiches, setFilterNiches] = useState<string[]>([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const [broadcastName, setBroadcastName] = useState('')
  const [dbAvailable, setDbAvailable] = useState(false)

  // Stats
  const stats = useMemo(() => {
    return broadcasts.reduce(
      (acc, b) => ({
        sent: acc.sent + (b.sent_count || 0),
        delivered: acc.delivered + (b.delivered_count || 0),
        replied: acc.replied + (b.replied_count || 0),
      }),
      { sent: 0, delivered: 0, replied: 0 }
    )
  }, [broadcasts])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    updateRecipientCount()
  }, [filterCities, filterNiches])

  async function loadData() {
    // Load cities
    const { data: citiesData } = await supabase.from('cities').select('id, name').order('name')
    if (citiesData) setCities(citiesData)

    // Load unique niches from clients
    const { data: nicheData } = await supabase.from('clients').select('niche').not('niche', 'is', null)
    if (nicheData) {
      const unique = [...new Set(nicheData.map((c: any) => c.niche).filter(Boolean))]
      setNiches(unique.sort())
    }

    // Total clients with phone
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true }).not('phone', 'is', null)
    setTotalClients(count || 0)

    // Try loading from wa_templates
    const { data: tplData, error: tplErr } = await supabase.from('wa_templates').select('*')
    if (!tplErr && tplData && tplData.length > 0) {
      setTemplates(tplData)
      setDbAvailable(true)
    }

    // Try loading broadcasts
    const { data: bData } = await supabase.from('wa_broadcasts').select('*').order('created_at', { ascending: false })
    if (bData) setBroadcasts(bData)

    // Initial count
    updateRecipientCount()
  }

  async function updateRecipientCount() {
    let query = supabase.from('clients').select('id', { count: 'exact', head: true }).not('phone', 'is', null)
    if (filterCities.length > 0) query = query.in('city_id', filterCities)
    if (filterNiches.length > 0) query = query.in('niche', filterNiches)
    const { count } = await query
    setRecipientCount(count || 0)
  }

  async function createBroadcast() {
    if (!selectedTemplate) return
    setCreating(true)

    if (dbAvailable) {
      const { error } = await supabase.from('wa_broadcasts').insert({
        name: broadcastName || `${selectedTemplate.name} — ${new Date().toLocaleDateString('ru-RU')}`,
        template_id: selectedTemplate.id,
        status: 'draft',
        total_recipients: recipientCount,
      })
      if (error) {
        alert('Ошибка: ' + error.message)
      } else {
        // Reload
        const { data } = await supabase.from('wa_broadcasts').select('*').order('created_at', { ascending: false })
        if (data) setBroadcasts(data)
        setSelectedTemplate(null)
        setBroadcastName('')
        setFilterCities([])
        setFilterNiches([])
      }
    } else {
      alert('Рассылка создана (демо-режим). Таблицы WA ещё не созданы в Supabase.')
    }

    setCreating(false)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-600',
    scheduled: 'bg-blue-600',
    running: 'bg-amber-600',
    paused: 'bg-yellow-600',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Черновик',
    scheduled: 'Запланирована',
    running: 'В процессе',
    paused: 'Пауза',
    completed: 'Завершена',
    failed: 'Ошибка',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-3xl">💬</span>
          WhatsApp Рассылка
        </h1>
        <p className="text-gray-400 mt-1">Создавайте и управляйте рассылками по базе клиентов</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего контактов', value: totalClients.toLocaleString('ru-RU'), icon: '👥', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30' },
          { label: 'Отправлено', value: stats.sent.toLocaleString('ru-RU'), icon: '📤', color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30' },
          { label: 'Доставлено', value: stats.delivered.toLocaleString('ru-RU'), icon: '✅', color: 'from-green-500/20 to-green-600/5 border-green-500/30' },
          { label: 'Ответили', value: stats.replied.toLocaleString('ru-RU'), icon: '💬', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <span>{s.icon}</span>
              {s.label}
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Templates Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">📝 Шаблоны сообщений</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-cyan-500/50 ${
                selectedTemplate?.id === tpl.id
                  ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/50'
                  : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{tpl.name}</h3>
                {selectedTemplate?.id === tpl.id && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Выбран</span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-4 whitespace-pre-line">{tpl.message.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* New Broadcast Panel */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">🚀 Новая рассылка</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left - Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Название рассылки</label>
              <input
                type="text"
                value={broadcastName}
                onChange={e => setBroadcastName(e.target.value)}
                placeholder="Например: Рестораны Алматы — Март 2026"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Шаблон</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={e => {
                  const tpl = templates.find(t => t.id === Number(e.target.value))
                  setSelectedTemplate(tpl || null)
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Выберите шаблон...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Города</label>
              <MultiSelect
                options={cities.map(c => c.name)}
                selected={filterCities.map(id => cities.find(c => String(c.id) === id)?.name || '')}
                onChange={(names) => setFilterCities(names.map(n => String(cities.find(c => c.name === n)?.id || '')))}
                placeholder="Все города"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Ниши</label>
              <MultiSelect
                options={niches}
                selected={filterNiches}
                onChange={setFilterNiches}
                placeholder="Все ниши"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-400">Получателей:</span>
              <span className="text-xl font-bold text-cyan-400">{recipientCount.toLocaleString('ru-RU')}</span>
            </div>

            <button
              onClick={createBroadcast}
              disabled={!selectedTemplate || recipientCount === 0 || creating}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-medium py-3 rounded-lg transition-all text-sm"
            >
              {creating ? '⏳ Создание...' : '📨 Создать рассылку'}
            </button>
          </div>

          {/* Right - Preview */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Предпросмотр сообщения</label>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 min-h-[300px]">
              {selectedTemplate ? (
                <div className="bg-green-900/30 border border-green-800/50 rounded-lg p-4">
                  <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                    <span>💬</span> WhatsApp
                  </div>
                  <p className="text-sm whitespace-pre-line text-gray-200 leading-relaxed">
                    {selectedTemplate.message}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Выберите шаблон для предпросмотра...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">📊 История рассылок</h2>
        {broadcasts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-3 px-4">Дата</th>
                  <th className="text-left py-3 px-4">Название</th>
                  <th className="text-left py-3 px-4">Статус</th>
                  <th className="text-right py-3 px-4">Всего</th>
                  <th className="text-right py-3 px-4">📤 Отправлено</th>
                  <th className="text-right py-3 px-4">✅ Доставлено</th>
                  <th className="text-right py-3 px-4">💬 Ответили</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map(b => (
                  <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(b.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-3 px-4">{b.name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[b.status] || 'bg-gray-600'}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{b.total_recipients}</td>
                    <td className="py-3 px-4 text-right">{b.sent_count}</td>
                    <td className="py-3 px-4 text-right">{b.delivered_count}</td>
                    <td className="py-3 px-4 text-right">{b.replied_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            <p>Пока нет рассылок</p>
            <p className="text-xs mt-1">Выберите шаблон и создайте первую рассылку</p>
          </div>
        )}
      </div>

      {!dbAvailable && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">
          ⚠️ Таблицы WhatsApp (wa_templates, wa_broadcasts, wa_broadcast_recipients) ещё не созданы в Supabase. 
          Запустите SQL из <code className="bg-gray-800 px-1 rounded">supabase/schema.sql</code> в SQL Editor.
          Шаблоны показываются из локальных данных.
        </div>
      )}
    </div>
  )
}
