'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

/* ───────────── TYPES ───────────── */
interface Station {
  id: number; name: string; frequency: string; city: string; coverage: string[]
  format: string; audience: number; ageGroup: string; pricePerSpot: number
  pricePerMonth: number; description: string; logo: string
}
interface Order {
  id: string; date: string; company: string; contact: string; phone: string
  email: string; stations: string[]; budget: number; comment: string; status: string
}

/* ───────────── STATIONS DB ───────────── */
const STATIONS: Station[] = [
  { id:1, name:'Русское Радио Казахстан', frequency:'105.7 FM', city:'Алматы', coverage:['Алматы','Астана','Шымкент','Караганда','Актобе','Атырау','Павлодар'], format:'Поп', audience:820000, ageGroup:'25-45', pricePerSpot:45000, pricePerMonth:1800000, description:'Главная русскоязычная поп-станция страны', logo:'🎵' },
  { id:2, name:'Европа Плюс Казахстан', frequency:'107.0 FM', city:'Алматы', coverage:['Алматы','Астана','Караганда','Шымкент'], format:'Поп', audience:650000, ageGroup:'18-35', pricePerSpot:40000, pricePerMonth:1600000, description:'Европейские и мировые хиты', logo:'🌍' },
  { id:3, name:'Хит FM Казахстан', frequency:'101.0 FM', city:'Астана', coverage:['Астана','Алматы','Караганда'], format:'Поп', audience:480000, ageGroup:'18-35', pricePerSpot:35000, pricePerMonth:1400000, description:'Только хиты!', logo:'🔥' },
  { id:4, name:'Ретро FM Казахстан', frequency:'103.4 FM', city:'Алматы', coverage:['Алматы','Астана','Шымкент','Караганда','Актобе'], format:'Ретро', audience:520000, ageGroup:'35-55', pricePerSpot:32000, pricePerMonth:1300000, description:'Лучшие песни прошлых десятилетий', logo:'📀' },
  { id:5, name:'Дорожное Радио КЗ', frequency:'104.5 FM', city:'Астана', coverage:['Астана','Караганда','Павлодар','Костанай'], format:'Шансон', audience:380000, ageGroup:'30-50', pricePerSpot:28000, pricePerMonth:1100000, description:'Радио для автомобилистов', logo:'🚗' },
  { id:6, name:'Радио NS', frequency:'106.2 FM', city:'Алматы', coverage:['Алматы','Астана','Шымкент','Караганда','Актобе','Атырау','Тараз','Кызылорда','Семей','Усть-Каменогорск','Павлодар','Костанай','Петропавловск','Актау'], format:'Поп', audience:950000, ageGroup:'20-40', pricePerSpot:50000, pricePerMonth:2000000, description:'Крупнейшая казахстанская радиосеть', logo:'🇰🇿' },
  { id:7, name:'Қазақ Радиосы', frequency:'102.8 FM', city:'Астана', coverage:['Астана','Алматы','Шымкент','Караганда','Актобе','Тараз','Кызылорда','Туркестан'], format:'Казахское', audience:720000, ageGroup:'20-50', pricePerSpot:38000, pricePerMonth:1500000, description:'Музыка и программы на казахском языке', logo:'🎤' },
  { id:8, name:'Tengri FM', frequency:'100.5 FM', city:'Астана', coverage:['Астана','Алматы','Караганда','Шымкент'], format:'Поп', audience:410000, ageGroup:'25-40', pricePerSpot:36000, pricePerMonth:1450000, description:'Современное казахстанское радио', logo:'⛰️' },
  { id:9, name:'Love Radio KZ', frequency:'106.8 FM', city:'Алматы', coverage:['Алматы','Астана'], format:'Поп', audience:290000, ageGroup:'18-30', pricePerSpot:25000, pricePerMonth:1000000, description:'Романтические хиты', logo:'💖' },
  { id:10, name:'Energy FM', frequency:'100.2 FM', city:'Алматы', coverage:['Алматы','Астана','Шымкент'], format:'Dance', audience:340000, ageGroup:'16-30', pricePerSpot:28000, pricePerMonth:1100000, description:'Энергичная танцевальная музыка', logo:'⚡' },
  { id:11, name:'Жұлдыз FM', frequency:'101.6 FM', city:'Астана', coverage:['Астана','Караганда','Павлодар','Костанай','Петропавловск'], format:'Казахское', audience:560000, ageGroup:'18-40', pricePerSpot:34000, pricePerMonth:1350000, description:'Казахские хиты и новинки', logo:'⭐' },
  { id:12, name:'Радио Шансон КЗ', frequency:'103.0 FM', city:'Алматы', coverage:['Алматы','Караганда','Шымкент'], format:'Шансон', audience:280000, ageGroup:'35-55', pricePerSpot:22000, pricePerMonth:880000, description:'Русский шансон и авторская песня', logo:'🎸' },
  { id:13, name:'NRJ Kazakhstan', frequency:'104.2 FM', city:'Алматы', coverage:['Алматы','Астана'], format:'Dance', audience:250000, ageGroup:'16-28', pricePerSpot:24000, pricePerMonth:960000, description:'Hit Music Only!', logo:'💥' },
  { id:14, name:'Радио Алматы', frequency:'102.0 FM', city:'Алматы', coverage:['Алматы'], format:'Информационное', audience:180000, ageGroup:'25-55', pricePerSpot:20000, pricePerMonth:800000, description:'Городское информационное радио Алматы', logo:'🏔️' },
  { id:15, name:'Радио Астана', frequency:'101.4 FM', city:'Астана', coverage:['Астана'], format:'Информационное', audience:160000, ageGroup:'25-55', pricePerSpot:20000, pricePerMonth:800000, description:'Столичное информационное радио', logo:'🏛️' },
  { id:16, name:'Power FM', frequency:'105.0 FM', city:'Алматы', coverage:['Алматы','Астана','Караганда'], format:'Рок', audience:220000, ageGroup:'20-40', pricePerSpot:22000, pricePerMonth:880000, description:'Мощный рок и альтернатива', logo:'🤘' },
  { id:17, name:'Авторадио КЗ', frequency:'108.0 FM', city:'Астана', coverage:['Астана','Караганда','Павлодар','Костанай'], format:'Поп', audience:350000, ageGroup:'25-45', pricePerSpot:30000, pricePerMonth:1200000, description:'Друг в дороге', logo:'🚙' },
  { id:18, name:'Радио Дача КЗ', frequency:'103.8 FM', city:'Алматы', coverage:['Алматы','Шымкент','Тараз'], format:'Ретро', audience:310000, ageGroup:'35-60', pricePerSpot:22000, pricePerMonth:880000, description:'Душевная музыка для всей семьи', logo:'🏡' },
  { id:19, name:'Maximum FM', frequency:'99.6 FM', city:'Алматы', coverage:['Алматы'], format:'Рок', audience:150000, ageGroup:'18-35', pricePerSpot:18000, pricePerMonth:720000, description:'Максимум рок-музыки', logo:'🎸' },
  { id:20, name:'Plus FM', frequency:'100.8 FM', city:'Алматы', coverage:['Алматы','Астана'], format:'Поп', audience:200000, ageGroup:'20-35', pricePerSpot:20000, pricePerMonth:800000, description:'Позитивные хиты каждый день', logo:'➕' },
  { id:21, name:'Classic FM KZ', frequency:'98.4 FM', city:'Алматы', coverage:['Алматы'], format:'Классика', audience:85000, ageGroup:'30-60', pricePerSpot:15000, pricePerMonth:600000, description:'Классическая музыка', logo:'🎻' },
  { id:22, name:'Business FM KZ', frequency:'98.0 FM', city:'Астана', coverage:['Астана','Алматы'], format:'Деловое', audience:120000, ageGroup:'25-50', pricePerSpot:35000, pricePerMonth:1400000, description:'Деловые новости и аналитика', logo:'💼' },
  { id:23, name:'Qazaq FM', frequency:'99.0 FM', city:'Астана', coverage:['Астана','Алматы','Шымкент','Актобе','Караганда','Тараз','Кызылорда','Туркестан','Семей'], format:'Казахское', audience:680000, ageGroup:'18-45', pricePerSpot:42000, pricePerMonth:1680000, description:'Qazaqsha ғана!', logo:'🦅' },
  { id:24, name:'Радио Romantika KZ', frequency:'99.4 FM', city:'Алматы', coverage:['Алматы','Астана'], format:'Поп', audience:190000, ageGroup:'25-40', pricePerSpot:20000, pricePerMonth:800000, description:'Музыка для настроения', logo:'🌹' },
  { id:25, name:'Жас FM', frequency:'97.8 FM', city:'Астана', coverage:['Астана','Алматы','Караганда','Шымкент'], format:'Казахское', audience:430000, ageGroup:'16-30', pricePerSpot:26000, pricePerMonth:1040000, description:'Молодёжное казахское радио', logo:'🔊' },
]

const FORMATS = [...new Set(STATIONS.map(s => s.format))].sort()
const CITIES = [...new Set(STATIONS.flatMap(s => s.coverage))].sort()
const DURATIONS = [15, 20, 30, 45, 60] as const
const PERIODS = [
  { label: '1 неделя', days: 7 },
  { label: '2 недели', days: 14 },
  { label: '1 месяц', days: 30 },
  { label: '3 месяца', days: 90 },
]
const TIME_SLOTS = [
  { label: 'Утро (07-10)', key: 'morning', coeff: 1.5 },
  { label: 'День (10-16)', key: 'day', coeff: 1.0 },
  { label: 'Вечер (16-20)', key: 'evening', coeff: 1.3 },
  { label: 'Ночь (20-07)', key: 'night', coeff: 0.7 },
]

function fmt(n: number) { return n.toLocaleString('ru-RU') }
function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return String(n)
}

export default function RadioPage() {
  const router = useRouter()

  /* ── view / filters ── */
  const [search, setSearch] = useState('')
  const [selCities, setSelCities] = useState<string[]>([])
  const [selFormats, setSelFormats] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState(60000)
  const [sort, setSort] = useState<'audience'|'price'|'name'>('audience')
  const [gridView, setGridView] = useState(true)

  /* ── calculator ── */
  const [calcStations, setCalcStations] = useState<number[]>([])
  const [duration, setDuration] = useState<number>(30)
  const [spotsPerDay, setSpotsPerDay] = useState(5)
  const [periodIdx, setPeriodIdx] = useState(2)
  const [timeSlots, setTimeSlots] = useState<string[]>(['morning', 'day'])

  /* ── order form ── */
  const [showOrder, setShowOrder] = useState(false)
  const [orderForm, setOrderForm] = useState({ company: '', contact: '', phone: '', email: '', comment: '' })
  const [toast, setToast] = useState('')
  const [orders, setOrders] = useState<Order[]>([])

  /* ── tabs ── */
  const [tab, setTab] = useState<'catalog'|'calc'|'packages'|'production'|'orders'>('catalog')

  useEffect(() => {
    try { setOrders(JSON.parse(localStorage.getItem('radio_orders') || '[]')) } catch { /* */ }
  }, [])

  /* ── filtered stations ── */
  const filtered = useMemo(() => {
    let list = STATIONS.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (selCities.length && !selCities.some(c => s.coverage.includes(c))) return false
      if (selFormats.length && !selFormats.includes(s.format)) return false
      if (s.pricePerSpot > maxPrice) return false
      return true
    })
    list.sort((a, b) => sort === 'audience' ? b.audience - a.audience : sort === 'price' ? a.pricePerSpot - b.pricePerSpot : a.name.localeCompare(b.name))
    return list
  }, [search, selCities, selFormats, maxPrice, sort])

  /* ── calculator math ── */
  const calcResult = useMemo(() => {
    const selected = STATIONS.filter(s => calcStations.includes(s.id))
    const days = PERIODS[periodIdx].days
    const totalSpots = spotsPerDay * days * selected.length * (timeSlots.length || 1)
    const durationMultiplier = duration / 30
    const avgCoeff = timeSlots.length ? timeSlots.reduce((s, k) => s + (TIME_SLOTS.find(t => t.key === k)?.coeff || 1), 0) / timeSlots.length : 1
    const baseCost = selected.reduce((s, st) => s + st.pricePerSpot, 0) * spotsPerDay * days * durationMultiplier * avgCoeff
    let discount = 0
    if (totalSpots > 500) discount = 0.15
    else if (totalSpots > 300) discount = 0.10
    else if (totalSpots > 100) discount = 0.05
    const finalCost = baseCost * (1 - discount)
    const audience = selected.reduce((s, st) => s + st.audience, 0)
    const cpm = audience > 0 ? (finalCost / audience) * 1000 : 0
    return { totalSpots, baseCost, discount, finalCost, audience, cpm, selected, days }
  }, [calcStations, duration, spotsPerDay, periodIdx, timeSlots])

  function toggleCalcStation(id: number) {
    setCalcStations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleMulti(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }
  function applyPackage(stationCount: number, spots: number, period: number) {
    setTab('calc')
    setSpotsPerDay(spots)
    setPeriodIdx(period)
    setDuration(30)
    setTimeSlots(['morning', 'day', 'evening'])
    const top = STATIONS.sort((a, b) => b.audience - a.audience).slice(0, stationCount)
    setCalcStations(top.map(s => s.id))
  }
  function submitOrder() {
    if (!orderForm.company || !orderForm.phone) { setToast('Заполните обязательные поля'); setTimeout(() => setToast(''), 3000); return }
    const order: Order = {
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      company: orderForm.company, contact: orderForm.contact, phone: orderForm.phone, email: orderForm.email,
      stations: calcResult.selected.map(s => s.name), budget: calcResult.finalCost,
      comment: orderForm.comment, status: 'Новая'
    }
    const updated = [...orders, order]
    setOrders(updated)
    localStorage.setItem('radio_orders', JSON.stringify(updated))
    setShowOrder(false)
    setOrderForm({ company: '', contact: '', phone: '', email: '', comment: '' })
    setToast('✅ Заявка отправлена!')
    setTimeout(() => setToast(''), 4000)
  }
  function deleteOrder(id: string) {
    const updated = orders.filter(o => o.id !== id)
    setOrders(updated)
    localStorage.setItem('radio_orders', JSON.stringify(updated))
  }

  /* ── stats ── */
  const totalAudience = STATIONS.reduce((s, st) => s + st.audience, 0)
  const uniqueCities = new Set(STATIONS.flatMap(s => s.coverage)).size
  const uniqueFormats = new Set(STATIONS.map(s => s.format)).size

  const statCards = [
    { label: 'Радиостанций', value: STATIONS.length, icon: '📻', color: 'from-indigo-500 to-violet-600' },
    { label: 'Охват аудитории', value: fmtShort(totalAudience), icon: '👥', color: 'from-violet-500 to-purple-600' },
    { label: 'Регионов', value: uniqueCities, icon: '🗺️', color: 'from-blue-500 to-indigo-600' },
    { label: 'Форматов', value: uniqueFormats, icon: '🎶', color: 'from-purple-500 to-pink-600' },
  ]

  const TABS = [
    { key: 'catalog', label: '📋 Каталог' },
    { key: 'calc', label: '🧮 Калькулятор' },
    { key: 'packages', label: '📦 Пакеты' },
    { key: 'production', label: '🎙️ Продакшн' },
    { key: 'orders', label: '📑 Заказы' },
  ] as const

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">{toast}</div>}

      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard/pabliks')} className="text-sm text-gray-400 hover:text-white mb-3 flex items-center gap-1">← Медиа-ресурсы</button>
        <h1 className="text-2xl font-bold">📻 Реклама на Радио</h1>
        <p className="text-gray-400 text-sm mt-1">Размещение рекламы на FM-станциях Казахстана</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <div className="text-xs text-white/70">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.label}</button>
        ))}
      </div>

      {/* ════════ CATALOG ════════ */}
      {tab === 'catalog' && (
        <div>
          {/* Filters */}
          <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Поиск по названию..." className="bg-white/10 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] outline-none focus:ring-1 ring-indigo-500" />
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="audience">По аудитории</option>
                <option value="price">По цене</option>
                <option value="name">По названию</option>
              </select>
              <button onClick={() => setGridView(!gridView)} className="bg-white/10 rounded-lg px-3 py-2 text-sm">{gridView ? '📋 Таблица' : '🔲 Сетка'}</button>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-400 mr-1 self-center">Город:</span>
              {CITIES.slice(0, 10).map(c => (
                <button key={c} onClick={() => toggleMulti(selCities, c, setSelCities)} className={`px-2 py-1 rounded text-xs transition ${selCities.includes(c) ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}>{c}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-400 mr-1 self-center">Формат:</span>
              {FORMATS.map(f => (
                <button key={f} onClick={() => toggleMulti(selFormats, f, setSelFormats)} className={`px-2 py-1 rounded text-xs transition ${selFormats.includes(f) ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-300'}`}>{f}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Бюджет до:</span>
              <input type="range" min={10000} max={60000} step={1000} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} className="flex-1 accent-indigo-500" />
              <span className="text-xs text-white font-medium">{fmt(maxPrice)}₸</span>
            </div>
          </div>

          {/* Grid View */}
          {gridView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(s => (
                <div key={s.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shrink-0">{s.logo}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                      <p className="text-xs text-gray-400">{s.frequency} · {s.city}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded">{s.format}</span>
                    <span className="bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded">{s.ageGroup} лет</span>
                  </div>
                  <div className="mt-3 flex justify-between text-xs">
                    <span className="text-gray-400">👥 {fmtShort(s.audience)}</span>
                    <span className="text-green-400 font-medium">{fmt(s.pricePerSpot)}₸/спот</span>
                  </div>
                  <button onClick={() => { toggleCalcStation(s.id); setTab('calc') }} className="mt-3 w-full bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 text-xs py-1.5 rounded-lg transition">+ В калькулятор</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 text-xs border-b border-white/10">
                  <th className="pb-2 pr-4">Станция</th><th className="pb-2 pr-4">Частота</th><th className="pb-2 pr-4">Город</th><th className="pb-2 pr-4">Формат</th><th className="pb-2 pr-4">Аудитория</th><th className="pb-2 pr-4">Цена/спот</th><th className="pb-2"></th>
                </tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 font-medium">{s.logo} {s.name}</td>
                      <td className="py-2 pr-4 text-gray-400">{s.frequency}</td>
                      <td className="py-2 pr-4 text-gray-400">{s.city}</td>
                      <td className="py-2 pr-4"><span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded">{s.format}</span></td>
                      <td className="py-2 pr-4">{fmtShort(s.audience)}</td>
                      <td className="py-2 pr-4 text-green-400">{fmt(s.pricePerSpot)}₸</td>
                      <td className="py-2"><button onClick={() => { toggleCalcStation(s.id); setTab('calc') }} className="text-indigo-400 hover:text-indigo-300 text-xs">+ Добавить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">Показано {filtered.length} из {STATIONS.length} станций</p>
        </div>
      )}

      {/* ════════ CALCULATOR ════════ */}
      {tab === 'calc' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: params */}
          <div className="lg:col-span-2 space-y-4">
            {/* Station selection */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">📻 Выберите станции</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {STATIONS.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition ${calcStations.includes(s.id) ? 'bg-indigo-600/30 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                    <input type="checkbox" checked={calcStations.includes(s.id)} onChange={() => toggleCalcStation(s.id)} className="accent-indigo-500" />
                    <span className="truncate">{s.logo} {s.name}</span>
                    <span className="ml-auto text-xs text-gray-400 shrink-0">{fmt(s.pricePerSpot)}₸</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">⏱️ Хронометраж ролика</h3>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)} className={`px-4 py-2 rounded-lg text-sm transition ${duration === d ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}>{d} сек</button>
                ))}
              </div>
            </div>

            {/* Spots per day & period */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">🔄 Выходов в день</h3>
                <input type="number" min={1} max={20} value={spotsPerDay} onChange={e => setSpotsPerDay(Math.max(1, Math.min(20, +e.target.value)))} className="w-full bg-white/10 rounded-lg px-3 py-2 text-center text-lg font-bold outline-none focus:ring-1 ring-indigo-500" />
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">📅 Период размещения</h3>
                <div className="flex flex-wrap gap-2">
                  {PERIODS.map((p, i) => (
                    <button key={i} onClick={() => setPeriodIdx(i)} className={`px-3 py-2 rounded-lg text-sm transition ${periodIdx === i ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time slots */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">🕐 Время эфира</h3>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map(t => (
                  <button key={t.key} onClick={() => toggleMulti(timeSlots, t.key, setTimeSlots)} className={`px-3 py-2 rounded-lg text-sm transition ${timeSlots.includes(t.key) ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}>
                    {t.label} <span className="text-xs opacity-60">x{t.coeff}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: result */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-600/30 to-violet-700/30 border border-indigo-500/30 rounded-xl p-5 sticky top-4">
              <h3 className="font-bold text-lg mb-4">💰 Итого</h3>
              {calcStations.length === 0 ? (
                <p className="text-sm text-gray-400">Выберите станции для расчёта</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-300">Станций:</span><span className="font-bold">{calcResult.selected.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-300">Выходов за период:</span><span className="font-bold">{fmt(calcResult.totalSpots)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-300">Охват аудитории:</span><span className="font-bold">{fmtShort(calcResult.audience)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-300">CPM:</span><span className="font-bold">{fmt(Math.round(calcResult.cpm))}₸</span></div>
                  {calcResult.discount > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-green-400">Скидка за объём:</span><span className="font-bold text-green-400">-{calcResult.discount * 100}%</span></div>
                  )}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between"><span className="text-gray-300">Общий бюджет:</span><span className="text-2xl font-bold text-white">{fmt(Math.round(calcResult.finalCost))}₸</span></div>
                  </div>
                  <button onClick={() => setShowOrder(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition mt-2">📩 Оформить заявку</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ PACKAGES ════════ */}
      {tab === 'packages' && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: '🥉', name: 'Старт', stations: 1, spots: 3, period: 1, price: '150,000', color: 'from-amber-700/40 to-amber-900/40 border-amber-600/30', desc: '1 станция · 30 сек · 3 выхода/день · 2 недели' },
            { icon: '🥈', name: 'Оптимальный', stations: 3, spots: 5, period: 2, price: '450,000', color: 'from-gray-400/20 to-gray-600/20 border-gray-400/30', desc: '3 станции · 30 сек · 5 выходов/день · 1 месяц' },
            { icon: '🥇', name: 'Максимум', stations: 5, spots: 8, period: 3, price: '1,200,000', color: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/30', desc: '5+ станций · 30 сек · 8 выходов/день · 3 месяца' },
          ].map(pkg => (
            <div key={pkg.name} className={`bg-gradient-to-br ${pkg.color} border rounded-2xl p-6 flex flex-col`}>
              <div className="text-4xl mb-2">{pkg.icon}</div>
              <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
              <p className="text-sm text-gray-300 mb-4">{pkg.desc}</p>
              <div className="text-2xl font-bold mb-4 mt-auto">от {pkg.price}₸</div>
              <button onClick={() => applyPackage(pkg.stations, pkg.spots, pkg.period)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition">Выбрать</button>
            </div>
          ))}
        </div>
      )}

      {/* ════════ PRODUCTION ════════ */}
      {tab === 'production' && (
        <div className="bg-white/5 rounded-xl p-6 max-w-2xl">
          <h3 className="text-xl font-bold mb-2">🎙️ Нет готового ролика? Мы поможем!</h3>
          <p className="text-gray-400 text-sm mb-6">Профессиональное производство рекламных аудиороликов</p>
          <div className="space-y-3 mb-6">
            {[
              { label: 'Запись диктора', price: 'от 25,000₸', icon: '🎤' },
              { label: 'Музыкальное оформление', price: 'от 15,000₸', icon: '🎼' },
              { label: 'Полный продакшн (диктор + музыка + сведение)', price: 'от 50,000₸', icon: '🎧' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-sm">{s.icon} {s.label}</span>
                <span className="text-green-400 font-medium text-sm">{s.price}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-4">⏰ Сроки: 2-3 рабочих дня</p>
          <button onClick={() => setShowOrder(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition">🎙️ Заказать производство</button>
        </div>
      )}

      {/* ════════ ORDERS ════════ */}
      {tab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📑</div>
              <p>Заказов пока нет</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 text-xs border-b border-white/10">
                  <th className="pb-2 pr-4">Дата</th><th className="pb-2 pr-4">Компания</th><th className="pb-2 pr-4">Станции</th><th className="pb-2 pr-4">Бюджет</th><th className="pb-2 pr-4">Статус</th><th className="pb-2"></th>
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-gray-400">{new Date(o.date).toLocaleDateString('ru')}</td>
                      <td className="py-2 pr-4">{o.company}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{o.stations.slice(0, 2).join(', ')}{o.stations.length > 2 ? ` +${o.stations.length - 2}` : ''}</td>
                      <td className="py-2 pr-4 text-green-400">{fmt(Math.round(o.budget))}₸</td>
                      <td className="py-2 pr-4"><span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded">{o.status}</span></td>
                      <td className="py-2"><button onClick={() => deleteOrder(o.id)} className="text-red-400 hover:text-red-300 text-xs">Удалить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ ORDER MODAL ════════ */}
      {showOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowOrder(false)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">📩 Заявка на размещение</h3>
            <div className="space-y-3">
              <input value={orderForm.company} onChange={e => setOrderForm({...orderForm, company: e.target.value})} placeholder="Компания *" className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-indigo-500" />
              <input value={orderForm.contact} onChange={e => setOrderForm({...orderForm, contact: e.target.value})} placeholder="Контактное лицо" className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-indigo-500" />
              <input value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} placeholder="Телефон *" className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-indigo-500" />
              <input value={orderForm.email} onChange={e => setOrderForm({...orderForm, email: e.target.value})} placeholder="Email" className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-indigo-500" />
              {calcResult.selected.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-300">
                  <p className="mb-1 font-medium">Выбрано: {calcResult.selected.map(s => s.name).join(', ')}</p>
                  <p>Бюджет: {fmt(Math.round(calcResult.finalCost))}₸</p>
                </div>
              )}
              <textarea value={orderForm.comment} onChange={e => setOrderForm({...orderForm, comment: e.target.value})} placeholder="Комментарий" rows={3} className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ring-indigo-500 resize-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOrder(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 py-2.5 rounded-xl text-sm transition">Отмена</button>
              <button onClick={submitOrder} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium transition">📩 Отправить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
