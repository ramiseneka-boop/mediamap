'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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

/* ── Confirm Dialog ── */
function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition">Отмена</button>
          <button onClick={() => { onConfirm(); onClose() }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm transition">Удалить</button>
        </div>
      </div>
    </div>
  )
}

/* ── Profile types ── */
interface WaProfile {
  id: string
  name: string
  phone: string
  avatar: string
  status: string
  businessName: string
  color: string
}

const DEFAULT_PROFILES: WaProfile[] = [
  { id: 'p1', name: 'Pabliki.kz', phone: '+7 700 000 0000', avatar: '', status: 'Городская медиасеть Казахстана', businessName: 'Pabliki.kz', color: '#25D366' },
  { id: 'p2', name: 'IP Guard', phone: '+7 701 111 1111', avatar: '', status: 'Защита интеллектуальной собственности', businessName: 'IP Guard', color: '#F59E0B' },
  { id: 'p3', name: 'Alatau Finance', phone: '+7 702 222 2222', avatar: '', status: 'Финансовые решения', businessName: 'Alatau Finance', color: '#3B82F6' },
]

function getProfiles(): WaProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES
  const stored = localStorage.getItem('wa_profiles')
  if (!stored) {
    localStorage.setItem('wa_profiles', JSON.stringify(DEFAULT_PROFILES))
    return DEFAULT_PROFILES
  }
  try { return JSON.parse(stored) } catch { return DEFAULT_PROFILES }
}

function saveProfiles(profiles: WaProfile[]) {
  localStorage.setItem('wa_profiles', JSON.stringify(profiles))
}

/* ── Quick replies ── */
const DEFAULT_QUICK_REPLIES = [
  'Спасибо за интерес! Отправляю медиаплан',
  'Добрый день! Когда удобно обсудить?',
  'Отправил подборку в PDF, проверьте пожалуйста',
]

function getQuickReplies(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_REPLIES
  const stored = localStorage.getItem('wa_quick_replies')
  if (!stored) {
    localStorage.setItem('wa_quick_replies', JSON.stringify(DEFAULT_QUICK_REPLIES))
    return DEFAULT_QUICK_REPLIES
  }
  try { return JSON.parse(stored) } catch { return DEFAULT_QUICK_REPLIES }
}

/* ── Tag definitions ── */
const TAGS = [
  { label: 'Новый', status: 'new', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { label: 'В работе', status: 'contacted', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'VIP', status: 'won', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Горячий', status: 'negotiation', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { label: 'Холодный', status: 'dormant', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { label: 'Отказ', status: 'lost', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
]

/* ── Message variables ── */
const VARIABLES = [
  { token: '{имя}', label: 'Имя', sample: 'Алексей' },
  { token: '{компания}', label: 'Компания', sample: 'ТОО "Астана Групп"' },
  { token: '{город}', label: 'Город', sample: 'Алматы' },
]

/* ── WhatsApp Chat Popup ── */
interface ChatMessage {
  id: number
  text: string
  outgoing: boolean
  time: string
}

function WhatsAppChatPopup({ profile, quickReplies, onInsertReply }: {
  profile: WaProfile
  quickReplies: string[]
  onInsertReply?: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: 'Здравствуйте! 👋 Чем могу помочь?', outgoing: true, time: '12:00' },
  ])
  const [input, setInput] = useState('')
  const [showQuick, setShowQuick] = useState(false)
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
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-transform hover:scale-110"
        style={{ background: profile.color || '#25D366' }}
      >
        {open ? '✕' : '💬'}
      </button>

      <div
        className={`fixed bottom-24 right-6 z-[90] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ height: 520 }}
      >
        {/* Header with active profile */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(135deg, ${profile.color}cc, ${profile.color})` }}>
          <div className="relative w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-500 text-white text-lg">👤</div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: profile.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm truncate">{profile.name}</div>
            <div className="text-[11px] text-white/70">{profile.phone} · в сети</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: 340, background: '#0b141a', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5 L35 15 L30 12 L25 15Z\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.outgoing ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.outgoing ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-gray-200 rounded-tl-none'}`}>
                <p className="whitespace-pre-line break-words">{msg.text}</p>
                <span className="text-[10px] text-gray-400 float-right mt-1 ml-2">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies toggle */}
        {showQuick && (
          <div className="bg-[#1a2530] border-t border-gray-700 p-2 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {quickReplies.map((qr, i) => (
                <button key={i} onClick={() => { setInput(qr); setShowQuick(false) }}
                  className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-1 hover:bg-cyan-500/20 transition truncate max-w-[200px]">
                  {qr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33]">
          <button onClick={() => setShowQuick(!showQuick)} className="text-lg hover:scale-110 transition" title="Быстрые ответы">⚡</button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Введите сообщение..."
            className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2 focus:outline-none placeholder-gray-500"
          />
          <button onClick={send} className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: profile.color || '#25D366' }}>
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
  scheduled_at?: string
  profile_id?: string
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

  // Profiles
  const [profiles, setProfiles] = useState<WaProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>('')
  const [profileModal, setProfileModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<WaProfile | null>(null)
  const [profileForm, setProfileForm] = useState<WaProfile>({ id: '', name: '', phone: '', avatar: '', status: '', businessName: '', color: '#25D366' })
  const profileAvatarRef = useRef<HTMLInputElement>(null)

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [quickReplyModal, setQuickReplyModal] = useState(false)
  const [newQuickReply, setNewQuickReply] = useState('')
  const [editingQRIndex, setEditingQRIndex] = useState<number | null>(null)
  const [editingQRText, setEditingQRText] = useState('')

  // New broadcast form
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [filterCities, setFilterCities] = useState<string[]>([])
  const [filterNiches, setFilterNiches] = useState<string[]>([])
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const [broadcastName, setBroadcastName] = useState('')
  const [dbAvailable, setDbAvailable] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [broadcastProfileId, setBroadcastProfileId] = useState('')

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
  const messageRef = useRef<HTMLTextAreaElement>(null)

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<string | null>(null)

  // Analytics expanded rows
  const [expandedBroadcast, setExpandedBroadcast] = useState<number | null>(null)

  // Running broadcast progress
  const [runningProgress, setRunningProgress] = useState<{ broadcastId: number; sent: number; total: number } | null>(null)

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0]

  // Load profiles & quick replies
  useEffect(() => {
    const p = getProfiles()
    setProfiles(p)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('wa_active_profile') : null
    setActiveProfileId(stored || p[0]?.id || 'p1')
    setQuickReplies(getQuickReplies())
  }, [])

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

  useEffect(() => { loadData() }, [])
  useEffect(() => { updateRecipientCount() }, [filterCities, filterNiches, filterTags])

  // Check for running broadcasts
  useEffect(() => {
    const running = broadcasts.find(b => b.status === 'running')
    if (running) {
      setRunningProgress({ broadcastId: running.id, sent: running.sent_count || 0, total: running.total_recipients || 0 })
    } else {
      setRunningProgress(null)
    }
  }, [broadcasts])

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
    if (filterTags.length > 0) {
      const statuses = filterTags.map(t => TAGS.find(tag => tag.label === t)?.status).filter(Boolean)
      if (statuses.length > 0) query = query.in('status', statuses)
    }
    const { count } = await query
    setRecipientCount(count || 0)
  }

  async function createBroadcast() {
    if (!selectedTemplate) return
    setCreating(true)

    const profId = broadcastProfileId || activeProfileId

    if (dbAvailable) {
      const insertData: any = {
        name: broadcastName || `${selectedTemplate.name} — ${new Date().toLocaleDateString('ru-RU')}`,
        template_id: selectedTemplate.id,
        status: scheduledAt ? 'scheduled' : 'draft',
        total_recipients: recipientCount,
      }
      // Store scheduled_at and profile_id as metadata if columns don't exist
      if (scheduledAt) insertData.scheduled_at = scheduledAt

      const { error } = await supabase.from('wa_broadcasts').insert(insertData)
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
        setFilterTags([])
        setScheduledAt('')
      }
    } else {
      alert('Рассылка создана (демо-режим). Таблицы WA ещё не созданы в Supabase.')
    }

    setCreating(false)
  }

  async function deleteBroadcast(id: number) {
    await supabase.from('wa_broadcasts').delete().eq('id', id)
    setBroadcasts(prev => prev.filter(b => b.id !== id))
  }

  async function clearAllBroadcasts() {
    for (const b of broadcasts) {
      await supabase.from('wa_broadcasts').delete().eq('id', b.id)
    }
    setBroadcasts([])
  }

  async function toggleBroadcastPause(b: Broadcast) {
    const newStatus = b.status === 'running' ? 'paused' : 'running'
    await supabase.from('wa_broadcasts').update({ status: newStatus }).eq('id', b.id)
    setBroadcasts(prev => prev.map(br => br.id === b.id ? { ...br, status: newStatus } : br))
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

  // Profile CRUD
  function saveProfile() {
    let updated: WaProfile[]
    if (editingProfile) {
      updated = profiles.map(p => p.id === editingProfile.id ? { ...profileForm, id: editingProfile.id } : p)
    } else {
      const newP = { ...profileForm, id: `p_${Date.now()}` }
      updated = [...profiles, newP]
    }
    setProfiles(updated)
    saveProfiles(updated)
    setProfileModal(false)
    setEditingProfile(null)
    setProfileForm({ id: '', name: '', phone: '', avatar: '', status: '', businessName: '', color: '#25D366' })
  }

  function deleteProfile(id: string) {
    const updated = profiles.filter(p => p.id !== id)
    setProfiles(updated)
    saveProfiles(updated)
    if (activeProfileId === id && updated.length > 0) {
      setActiveProfileId(updated[0].id)
      localStorage.setItem('wa_active_profile', updated[0].id)
    }
  }

  function selectProfile(id: string) {
    setActiveProfileId(id)
    localStorage.setItem('wa_active_profile', id)
  }

  function handleProfileAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setProfileForm(prev => ({ ...prev, avatar: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  // Quick replies CRUD
  function saveQuickReplies(qrs: string[]) {
    setQuickReplies(qrs)
    localStorage.setItem('wa_quick_replies', JSON.stringify(qrs))
  }

  // Insert variable at cursor
  function insertVariable(token: string) {
    const ta = messageRef.current
    if (!ta) {
      setMessageOverride(prev => prev + token)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = messageOverride || selectedTemplate?.message || ''
    const newText = current.substring(0, start) + token + current.substring(end)
    setMessageOverride(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + token.length, start + token.length)
    }, 0)
  }

  // Export filtered recipients as CSV
  async function exportCSV() {
    let query = supabase.from('clients').select('company_name, phone, niche, city_id').not('phone', 'is', null)
    if (filterCities.length > 0) query = query.in('city_id', filterCities)
    if (filterNiches.length > 0) query = query.in('niche', filterNiches)
    if (filterTags.length > 0) {
      const statuses = filterTags.map(t => TAGS.find(tag => tag.label === t)?.status).filter(Boolean)
      if (statuses.length > 0) query = query.in('status', statuses)
    }
    const { data } = await query.limit(10000)
    if (!data || data.length === 0) { alert('Нет данных для экспорта'); return }

    const cityMap = Object.fromEntries(cities.map(c => [c.id, c.name]))
    const header = 'Компания,Телефон,Ниша,Город\n'
    const rows = data.map((r: any) => `"${r.company_name || ''}","${r.phone || ''}","${r.niche || ''}","${cityMap[r.city_id] || ''}"`).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

  const previewMessage = useMemo(() => {
    let msg = messageOverride || selectedTemplate?.message || ''
    // Replace variables with sample data for preview
    VARIABLES.forEach(v => {
      msg = msg.replaceAll(v.token, v.sample)
    })
    return msg
  }, [messageOverride, selectedTemplate])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">💬</span>
            WhatsApp Рассылка
          </h1>
          <p className="text-gray-400 mt-1">Создавайте и управляйте рассылками по базе клиентов</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active profile indicator */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: activeProfile.color }} />
            <span className="text-gray-300">{activeProfile.name}</span>
            <select
              value={activeProfileId}
              onChange={e => selectProfile(e.target.value)}
              className="bg-transparent text-cyan-400 text-sm focus:outline-none cursor-pointer ml-1"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-gray-800">{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-sm transition"
          >
            ⚙️ Настройки
          </button>
        </div>
      </div>

      {/* Settings Modal — now with multi-profile management */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="⚙️ Управление профилями WhatsApp">
        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border transition ${p.id === activeProfileId ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border-2" style={{ borderColor: p.color }}>
                {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-lg">👤</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.id === activeProfileId && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">Активный</span>}
                </div>
                <div className="text-xs text-gray-400 truncate">{p.phone} · {p.businessName}</div>
              </div>
              <div className="flex items-center gap-1">
                {p.id !== activeProfileId && (
                  <button onClick={() => selectProfile(p.id)} className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1">Выбрать</button>
                )}
                <button onClick={() => { setEditingProfile(p); setProfileForm(p); setProfileModal(true) }} className="text-xs text-gray-400 hover:text-white px-2 py-1">✏️</button>
                <button onClick={() => setDeleteProfileConfirm(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">🗑️</button>
              </div>
            </div>
          ))}
          <button
            onClick={() => { setEditingProfile(null); setProfileForm({ id: '', name: '', phone: '', avatar: '', status: '', businessName: '', color: '#25D366' }); setProfileModal(true) }}
            className="w-full border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-lg py-3 text-sm text-gray-400 hover:text-cyan-400 transition"
          >
            ➕ Добавить профиль
          </button>
        </div>
      </Modal>

      {/* Profile Edit/Create Modal */}
      <Modal open={profileModal} onClose={() => setProfileModal(false)} title={editingProfile ? '✏️ Редактировать профиль' : '➕ Новый профиль'}>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-20 h-20 rounded-full border-2 overflow-hidden cursor-pointer hover:opacity-80 transition flex items-center justify-center"
              style={{ borderColor: profileForm.color, background: '#1f2937' }}
              onClick={() => profileAvatarRef.current?.click()}
            >
              {profileForm.avatar ? <img src={profileForm.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">👤</span>}
            </div>
            <input ref={profileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleProfileAvatar} />
            <button onClick={() => profileAvatarRef.current?.click()} className="text-xs text-cyan-400">Загрузить аватар</button>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя профиля</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Название бизнеса</label>
            <input type="text" value={profileForm.businessName} onChange={e => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Телефон</label>
            <input type="text" value={profileForm.phone} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Статус</label>
            <input type="text" value={profileForm.status} onChange={e => setProfileForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Цвет</label>
            <div className="flex items-center gap-3">
              <input type="color" value={profileForm.color} onChange={e => setProfileForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
              <span className="text-sm text-gray-400">{profileForm.color}</span>
            </div>
          </div>
          <button onClick={saveProfile} disabled={!profileForm.name.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
            💾 Сохранить
          </button>
        </div>
      </Modal>

      {/* Delete profile confirm */}
      <ConfirmDialog
        open={!!deleteProfileConfirm}
        onClose={() => setDeleteProfileConfirm(null)}
        onConfirm={() => { if (deleteProfileConfirm) deleteProfile(deleteProfileConfirm) }}
        title="Удалить профиль?"
        message="Профиль будет удалён. Это действие нельзя отменить."
      />

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

      {/* Delete broadcast confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteBroadcast(deleteConfirm.id) }}
        title="Удалить рассылку?"
        message={`«${deleteConfirm?.name || 'Без названия'}» будет удалена безвозвратно.`}
      />
      <ConfirmDialog
        open={clearAllConfirm}
        onClose={() => setClearAllConfirm(false)}
        onConfirm={clearAllBroadcasts}
        title="Очистить всю историю?"
        message={`Все ${broadcasts.length} записей будут удалены безвозвратно.`}
      />

      {/* Quick Reply Management Modal */}
      <Modal open={quickReplyModal} onClose={() => setQuickReplyModal(false)} title="⚡ Быстрые ответы">
        <div className="space-y-3">
          {quickReplies.map((qr, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-800 rounded-lg p-3">
              {editingQRIndex === i ? (
                <div className="flex-1 flex gap-2">
                  <input type="text" value={editingQRText} onChange={e => setEditingQRText(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-cyan-500 focus:outline-none" />
                  <button onClick={() => { const u = [...quickReplies]; u[i] = editingQRText; saveQuickReplies(u); setEditingQRIndex(null) }}
                    className="text-xs text-green-400 hover:text-green-300">✓</button>
                  <button onClick={() => setEditingQRIndex(null)} className="text-xs text-gray-400 hover:text-white">✕</button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm text-gray-300">{qr}</p>
                  <button onClick={() => { setEditingQRIndex(i); setEditingQRText(qr) }} className="text-xs text-gray-400 hover:text-cyan-400">✏️</button>
                  <button onClick={() => { const u = quickReplies.filter((_, j) => j !== i); saveQuickReplies(u) }} className="text-xs text-red-400 hover:text-red-300">🗑️</button>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={newQuickReply} onChange={e => setNewQuickReply(e.target.value)}
              placeholder="Новый быстрый ответ..."
              onKeyDown={e => { if (e.key === 'Enter' && newQuickReply.trim()) { saveQuickReplies([...quickReplies, newQuickReply.trim()]); setNewQuickReply('') } }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
            <button onClick={() => { if (newQuickReply.trim()) { saveQuickReplies([...quickReplies, newQuickReply.trim()]); setNewQuickReply('') } }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm transition">➕</button>
          </div>
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

      {/* Running Broadcast Progress */}
      {runningProgress && (
        <div className="bg-gradient-to-r from-amber-500/10 to-green-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="animate-spin inline-block">⏳</span>
              Рассылка в процессе
            </h3>
            {broadcasts.find(b => b.id === runningProgress.broadcastId) && (
              <button
                onClick={() => {
                  const b = broadcasts.find(br => br.id === runningProgress.broadcastId)
                  if (b) toggleBroadcastPause(b)
                }}
                className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg transition"
              >
                ⏸ Пауза
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Circular progress */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#25D366" strokeWidth="3"
                  strokeDasharray={`${runningProgress.total > 0 ? (runningProgress.sent / runningProgress.total * 100) : 0}, 100`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {runningProgress.total > 0 ? Math.round(runningProgress.sent / runningProgress.total * 100) : 0}%
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-300 mb-1">
                Отправлено <span className="text-white font-bold">{runningProgress.sent}</span> из <span className="text-white font-bold">{runningProgress.total}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${runningProgress.total > 0 ? (runningProgress.sent / runningProgress.total * 100) : 0}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ≈ {Math.max(0, Math.ceil((runningProgress.total - runningProgress.sent) * 2 / 60))} мин. осталось
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paused broadcast resume */}
      {broadcasts.filter(b => b.status === 'paused').map(b => (
        <div key={`paused-${b.id}`} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm text-yellow-400">
            ⏸ Рассылка «{b.name || '—'}» на паузе — отправлено {b.sent_count}/{b.total_recipients}
          </div>
          <button onClick={() => toggleBroadcastPause(b)} className="text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg transition">
            ▶ Возобновить
          </button>
        </div>
      ))}

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

          <div
            onClick={() => setCreateModal(true)}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500/50 p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] transition hover:bg-gray-800/50"
          >
            <span className="text-3xl">➕</span>
            <span className="text-sm text-gray-400">Создать шаблон</span>
          </div>
        </div>
      </div>

      {/* Quick Replies Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">⚡ Быстрые ответы</h2>
          <button onClick={() => setQuickReplyModal(true)} className="text-xs text-cyan-400 hover:text-cyan-300 transition">✏️ Управление</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((qr, i) => (
            <button key={i} onClick={() => setMessageOverride(prev => prev ? prev + '\n' + qr : qr)}
              className="bg-gray-800 border border-gray-700 hover:border-cyan-500/50 rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-white transition max-w-xs truncate">
              ⚡ {qr}
            </button>
          ))}
        </div>
      </div>

      {/* New Broadcast Panel */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">🚀 Новая рассылка</h2>

        {/* Tag filters */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">🏷️ Фильтр по статусу клиента</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag.label}
                onClick={() => setFilterTags(prev => prev.includes(tag.label) ? prev.filter(t => t !== tag.label) : [...prev, tag.label])}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filterTags.includes(tag.label) ? tag.color + ' border-current' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                {tag.label}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button onClick={() => setFilterTags([])} className="text-xs text-gray-500 hover:text-cyan-400 transition">Сбросить</button>
            )}
          </div>
        </div>

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
              <label className="block text-sm text-gray-400 mb-1">Профиль отправителя</label>
              <select
                value={broadcastProfileId || activeProfileId}
                onChange={e => setBroadcastProfileId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                ))}
              </select>
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

            {/* Scheduled broadcast */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">🕐 Запланировать на (необязательно)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
              {scheduledAt && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-blue-400">🕐 Будет отправлена: {new Date(scheduledAt).toLocaleString('ru-RU')}</span>
                  <button onClick={() => setScheduledAt('')} className="text-xs text-gray-500 hover:text-red-400">✕</button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-400">Получателей:</span>
              <span className="text-xl font-bold text-cyan-400">{recipientCount.toLocaleString('ru-RU')}</span>
            </div>

            {/* Import/Export */}
            <div className="flex gap-2">
              <button
                onClick={() => alert('Контакты импортируются автоматически из 2GIS парсера и CRM. Перейдите в раздел «Парсер» для добавления новых контактов.')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm transition text-gray-300"
              >
                📥 Импорт
              </button>
              <button
                onClick={exportCSV}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm transition text-gray-300"
              >
                📤 Экспорт CSV
              </button>
            </div>

            <button
              onClick={createBroadcast}
              disabled={!selectedTemplate || recipientCount === 0 || creating}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-medium py-3 rounded-lg transition-all text-sm"
            >
              {creating ? '⏳ Создание...' : scheduledAt ? '🕐 Запланировать рассылку' : '📨 Создать рассылку'}
            </button>
          </div>

          {/* Right - Preview */}
          <div className="space-y-3">
            <label className="block text-sm text-gray-400 mb-1">Предпросмотр сообщения</label>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 min-h-[200px]">
              {selectedTemplate ? (
                <div className="bg-green-900/30 border border-green-800/50 rounded-lg p-4">
                  <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                    <span>💬</span> WhatsApp · {activeProfile.name}
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
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">✏️ Изменить текст для этой рассылки</label>
                  <textarea
                    ref={messageRef}
                    value={messageOverride}
                    onChange={e => setMessageOverride(e.target.value)}
                    placeholder="Оставьте пустым, чтобы использовать текст шаблона..."
                    rows={5}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Message Variables */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">📌 Переменные (нажмите чтобы вставить)</label>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLES.map(v => (
                      <button key={v.token} onClick={() => insertVariable(v.token)}
                        className="bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg px-3 py-1.5 text-xs hover:bg-purple-500/20 transition">
                        <span className="font-mono">{v.token}</span> → {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Переменные будут заменены на данные каждого контакта при отправке</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📊 История рассылок</h2>
          {broadcasts.length > 0 && (
            <button onClick={() => setClearAllConfirm(true)}
              className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 transition">
              🗑️ Очистить всю историю
            </button>
          )}
        </div>
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
                  <th className="text-center py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map(b => {
                  const deliveryRate = b.total_recipients > 0 ? Math.round((b.delivered_count || 0) / b.total_recipients * 100) : 0
                  const responseRate = b.sent_count > 0 ? Math.round((b.replied_count || 0) / b.sent_count * 100) : 0
                  return (
                    <React.Fragment key={b.id}>
                      <tr className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer" onClick={() => setExpandedBroadcast(expandedBroadcast === b.id ? null : b.id)}>
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(b.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {b.status === 'scheduled' && <span title="Запланирована">🕐</span>}
                            {b.name || '—'}
                          </div>
                          {b.scheduled_at && (
                            <div className="text-[11px] text-blue-400 mt-0.5">🕐 {new Date(b.scheduled_at).toLocaleString('ru-RU')}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[b.status] || 'bg-gray-600'}`}>
                            {statusLabels[b.status] || b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">{b.total_recipients}</td>
                        <td className="py-3 px-4 text-right">{b.sent_count}</td>
                        <td className="py-3 px-4 text-right">{b.delivered_count}</td>
                        <td className="py-3 px-4 text-right">{b.replied_count}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {(b.status === 'running' || b.status === 'paused') && (
                              <button onClick={(e) => { e.stopPropagation(); toggleBroadcastPause(b) }}
                                className="text-xs px-2 py-1 rounded hover:bg-gray-700 transition" title={b.status === 'running' ? 'Пауза' : 'Возобновить'}>
                                {b.status === 'running' ? '⏸' : '▶'}
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: b.id, name: b.name }) }}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition" title="Удалить">
                              🗑️
                            </button>
                            <span className="text-xs text-gray-600">{expandedBroadcast === b.id ? '▲' : '▼'}</span>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded analytics row */}
                      {expandedBroadcast === b.id && (
                        <tr className="border-b border-gray-800/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-gray-400 mb-1">📤 Доставляемость</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                                    <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${deliveryRate}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-green-400 w-12 text-right">{deliveryRate}%</span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">{b.delivered_count || 0} из {b.total_recipients} доставлено</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-400 mb-1">💬 Отклик</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                                    <div className="h-3 rounded-full bg-amber-500 transition-all" style={{ width: `${responseRate}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-amber-400 w-12 text-right">{responseRate}%</span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">{b.replied_count || 0} из {b.sent_count || 0} ответили</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
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
        profile={activeProfile}
        quickReplies={quickReplies}
      />
    </div>
  )
}
