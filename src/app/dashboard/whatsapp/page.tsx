'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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

/* ── Modal wrapper ── */
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ── WhatsApp Chat Popup ── */
interface ChatMessage {
  id: number
  text: string
  outgoing: boolean
  time: string
}

function WhatsAppChatPopup({ senderName, senderPhone, senderAvatar, senderStatus }: {
  senderName: string
  senderPhone: string
  senderAvatar: string
  senderStatus: string
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: 'Здравствуйте! 👋 Чем могу помочь?', outgoing: true, time: '12:00' },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    const now = new Date()
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: input.trim(),
      outgoing: true,
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    }])
    setInput('')
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-transform hover:scale-110"
        style={{ background: '#25D366' }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-6 z-[90] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ height: 500 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)' }}>
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
            {senderAvatar ? (
              <img src={senderAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-500 text-white text-lg">👤</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm truncate">{senderName}</div>
            <div className="text-[11px] text-green-100">{senderPhone} · в сети</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: 370, background: '#0b141a', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5 L35 15 L30 12 L25 15Z\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.outgoing ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`relative max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.outgoing
                    ? 'bg-[#005c4b] text-white rounded-tr-none'
                    : 'bg-[#202c33] text-gray-200 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line break-words">{msg.text}</p>
                <span className="text-[10px] text-gray-400 float-right mt-1 ml-2">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Введите сообщение..."
            className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2 focus:outline-none placeholder-gray-500"
          />
          <button onClick={send} className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: '#25D366' }}>
            ➤
          </button>
        </div>
      </div>
    </>
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

  // Template editing
  const [editModal, setEditModal] = useState<Template | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Create template
  const [createModal, setCreateModal] = useState(false)
  const [newTplName, setNewTplName] = useState('')
  const [newTplNiche, setNewTplNiche] = useState('')
  const [newTplMessage, setNewTplMessage] = useState('')
  const [newTplSaving, setNewTplSaving] = useState(false)

  // Broadcast message override
  const [messageOverride, setMessageOverride] = useState('')

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [senderName, setSenderName] = useState('Pabliki.kz')
  const [senderPhone, setSenderPhone] = useState('+7 700 000 0000')
  const [senderAvatar, setSenderAvatar] = useState('')
  const [senderStatus, setSenderStatus] = useState('Городская медиасеть Казахстана')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSenderName(localStorage.getItem('wa_sender_name') || 'Pabliki.kz')
      setSenderPhone(localStorage.getItem('wa_sender_phone') || '+7 700 000 0000')
      setSenderAvatar(localStorage.getItem('wa_profile_avatar') || '')
      setSenderStatus(localStorage.getItem('wa_sender_status') || 'Городская медиасеть Казахстана')
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem('wa_sender_name', senderName)
    localStorage.setItem('wa_sender_phone', senderPhone)
    localStorage.setItem('wa_profile_avatar', senderAvatar)
    localStorage.setItem('wa_sender_status', senderStatus)
    setSettingsOpen(false)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setSenderAvatar(result)
    }
    reader.readAsDataURL(file)
  }

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
    const { data: citiesData } = await supabase.from('cities').select('id, name').order('name')
    if (citiesData) setCities(citiesData)

    const { data: nicheData } = await supabase.from('clients').select('niche').not('niche', 'is', null)
    if (nicheData) {
      const unique = [...new Set(nicheData.map((c: any) => c.niche).filter(Boolean))]
      setNiches(unique.sort())
    }

    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true }).not('phone', 'is', null)
    setTotalClients(count || 0)

    const { data: tplData, error: tplErr } = await supabase.from('wa_templates').select('*')
    if (!tplErr && tplData && tplData.length > 0) {
      setTemplates(tplData)
      setDbAvailable(true)
    }

    const { data: bData } = await supabase.from('wa_broadcasts').select('*').order('created_at', { ascending: false })
    if (bData) setBroadcasts(bData)

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
        const { data } = await supabase.from('wa_broadcasts').select('*').order('created_at', { ascending: false })
        if (data) setBroadcasts(data)
        setSelectedTemplate(null)
        setBroadcastName('')
        setMessageOverride('')
        setFilterCities([])
        setFilterNiches([])
      }
    } else {
      alert('Рассылка создана (демо-режим). Таблицы WA ещё не созданы в Supabase.')
    }

    setCreating(false)
  }

  async function saveEditTemplate() {
    if (!editModal) return
    setEditSaving(true)
    if (dbAvailable) {
      await supabase.from('wa_templates').update({ message: editMessage }).eq('id', editModal.id)
    }
    setTemplates(prev => prev.map(t => t.id === editModal.id ? { ...t, message: editMessage } : t))
    if (selectedTemplate?.id === editModal.id) {
      setSelectedTemplate({ ...editModal, message: editMessage })
    }
    setEditSaving(false)
    setEditModal(null)
  }

  async function saveNewTemplate() {
    setNewTplSaving(true)
    if (dbAvailable) {
      const { data, error } = await supabase.from('wa_templates').insert({ name: newTplName, niche: newTplNiche, message: newTplMessage }).select().single()
      if (!error && data) {
        setTemplates(prev => [...prev, data])
      }
    } else {
      setTemplates(prev => [...prev, { id: Date.now(), name: newTplName, niche: newTplNiche, message: newTplMessage }])
    }
    setNewTplName('')
    setNewTplNiche('')
    setNewTplMessage('')
    setNewTplSaving(false)
    setCreateModal(false)
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

  const previewMessage = messageOverride || selectedTemplate?.message || ''

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">💬</span>
            WhatsApp Рассылка
          </h1>
          <p className="text-gray-400 mt-1">Создавайте и управляйте рассылками по базе клиентов</p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-sm transition"
        >
          ⚙️ Настройки профиля
        </button>
      </div>

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="⚙️ Настройки профиля WhatsApp">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-600 overflow-hidden cursor-pointer hover:border-cyan-500 transition flex items-center justify-center"
              onClick={() => avatarInputRef.current?.click()}
            >
              {senderAvatar ? (
                <img src={senderAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <button onClick={() => avatarInputRef.current?.click()} className="text-xs text-cyan-400 hover:text-cyan-300">
              Загрузить аватар
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя отправителя</label>
            <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Номер телефона</label>
            <input type="text" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="+7 700 000 0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Статус</label>
            <input type="text" value={senderStatus} onChange={e => setSenderStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>

          <button onClick={saveSettings} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition text-sm">
            💾 Сохранить
          </button>
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`✏️ Редактировать: ${editModal?.name || ''}`}>
        <div className="space-y-4">
          <textarea
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            rows={12}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none resize-none"
          />
          <button onClick={saveEditTemplate} disabled={editSaving}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
            {editSaving ? '⏳ Сохранение...' : '💾 Сохранить'}
          </button>
        </div>
      </Modal>

      {/* Create Template Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="➕ Создать шаблон">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Название</label>
            <input type="text" value={newTplName} onChange={e => setNewTplName(e.target.value)} placeholder="🍕 Пиццерии"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ниша</label>
            <input type="text" value={newTplNiche} onChange={e => setNewTplNiche(e.target.value)} placeholder="Пиццерии"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Сообщение</label>
            <textarea value={newTplMessage} onChange={e => setNewTplMessage(e.target.value)} rows={10} placeholder="Здравствуйте! 👋..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none resize-none" />
          </div>
          <button onClick={saveNewTemplate} disabled={newTplSaving || !newTplName.trim() || !newTplMessage.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium py-2.5 rounded-lg transition text-sm">
            {newTplSaving ? '⏳ Сохранение...' : '💾 Создать шаблон'}
          </button>
        </div>
      </Modal>

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
              className={`rounded-xl border p-4 transition-all ${
                selectedTemplate?.id === tpl.id
                  ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/50'
                  : 'border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="cursor-pointer" onClick={() => { setSelectedTemplate(tpl); setMessageOverride('') }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{tpl.name}</h3>
                  {selectedTemplate?.id === tpl.id && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Выбран</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-4 whitespace-pre-line">{tpl.message.substring(0, 200)}...</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setEditModal(tpl); setEditMessage(tpl.message) }}
                className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                ✏️ Редактировать
              </button>
            </div>
          ))}

          {/* Create template card */}
          <div
            onClick={() => setCreateModal(true)}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500/50 p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] transition hover:bg-gray-800/50"
          >
            <span className="text-3xl">➕</span>
            <span className="text-sm text-gray-400">Создать шаблон</span>
          </div>
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
                  setMessageOverride('')
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
          <div className="space-y-3">
            <label className="block text-sm text-gray-400 mb-1">Предпросмотр сообщения</label>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 min-h-[200px]">
              {selectedTemplate ? (
                <div className="bg-green-900/30 border border-green-800/50 rounded-lg p-4">
                  <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                    <span>💬</span> WhatsApp
                  </div>
                  <p className="text-sm whitespace-pre-line text-gray-200 leading-relaxed">
                    {previewMessage}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm min-h-[180px]">
                  Выберите шаблон для предпросмотра...
                </div>
              )}
            </div>

            {selectedTemplate && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">✏️ Изменить текст для этой рассылки</label>
                <textarea
                  value={messageOverride}
                  onChange={e => setMessageOverride(e.target.value)}
                  placeholder="Оставьте пустым, чтобы использовать текст шаблона..."
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
            )}
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

      {/* WhatsApp Chat Popup */}
      <WhatsAppChatPopup
        senderName={senderName}
        senderPhone={senderPhone}
        senderAvatar={senderAvatar}
        senderStatus={senderStatus}
      />
    </div>
  )
}
