'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface Client {
  id: number
  company_name: string
  contact_name: string
  phone: string
  email: string
  niche: string
  status: string
  source: string
  budget: number
  last_contact_at: string
  city: { name: string } | null
}

const STATUSES = [
  { value: 'new', label: 'Новый', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Связались', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Переговоры', color: 'bg-orange-500' },
  { value: 'proposal', label: 'КП отправлено', color: 'bg-purple-500' },
  { value: 'won', label: 'Сделка', color: 'bg-green-500' },
  { value: 'lost', label: 'Отказ', color: 'bg-red-500' },
  { value: 'dormant', label: 'Спящий', color: 'bg-gray-500' },
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_name: '', phone: '', email: '', niche: '', status: 'new', budget: '' })
  const supabase = createSupabaseBrowser()

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*, city:cities(name)')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('clients').insert({
      ...form,
      budget: form.budget ? parseFloat(form.budget) : null,
    })
    if (!error) {
      setShowAdd(false)
      setForm({ company_name: '', contact_name: '', phone: '', email: '', niche: '', status: 'new', budget: '' })
      loadClients()
    }
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from('clients').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    loadClients()
  }

  const filtered = clients.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false
    if (search && !c.company_name.toLowerCase().includes(search.toLowerCase()) && !c.contact_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusCounts = STATUSES.map(s => ({
    ...s,
    count: clients.filter(c => c.status === s.value).length,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Клиенты</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
        >
          + Добавить
        </button>
      </div>

      {/* Pipeline */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${!filterStatus ? 'bg-white text-gray-900 font-medium' : 'bg-gray-800 text-gray-400'}`}
        >
          Все ({clients.length})
        </button>
        {statusCounts.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex items-center gap-1.5 ${filterStatus === s.value ? 'bg-white text-gray-900 font-medium' : 'bg-gray-800 text-gray-400'}`}
          >
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Поиск по компании или контакту..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:outline-none focus:border-green-500"
      />

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addClient} className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4">
          <h3 className="font-semibold">Новый клиент</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Компания *" required value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Контакт" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Ниша" value={form.niche} onChange={e => setForm({...form, niche: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Бюджет ₸" type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Сохранить</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm">Отмена</button>
          </div>
        </form>
      )}

      {/* Client list */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const st = STATUSES.find(s => s.value === c.status)
            return (
              <div key={c.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${st?.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.company_name}</div>
                  <div className="text-sm text-gray-400">{c.contact_name} {c.phone ? `· ${c.phone}` : ''}</div>
                  {c.niche && <div className="text-xs text-gray-500 mt-1">{c.niche}</div>}
                </div>
                <div className="text-right shrink-0">
                  {c.budget && <div className="text-sm font-medium">{c.budget.toLocaleString()} ₸</div>}
                  <select
                    value={c.status}
                    onChange={e => updateStatus(c.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 mt-1"
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              {clients.length === 0 ? 'Нет клиентов. Добавьте первого!' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
