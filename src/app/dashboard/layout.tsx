'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const nav = [
  { href: '/dashboard', label: 'Обзор', icon: '📊' },
  { href: '/dashboard/pabliks', label: 'Медиа', icon: '📡' },
  { href: '/dashboard/selections', label: 'Подборки', icon: '📋' },
  { href: '/dashboard/clients', label: 'Клиенты', icon: '👥' },
  { href: '/dashboard/smm', label: 'SMM', icon: '🚀' },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/dashboard/economics', label: 'Экономика', icon: '💰' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-xl">
            🗺
          </div>
          <span className="text-xl font-bold">MediaMap</span>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href))
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-gray-800 pt-4 mt-4">
          <div className="px-3 text-xs text-gray-500 mb-2">{user?.email}</div>
          <button onClick={handleLogout} className="w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 text-left rounded-lg hover:bg-gray-800 transition">
            Выйти
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺</span>
          <span className="font-bold">MediaMap</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 text-2xl">☰</button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4">
            <div className="flex items-center gap-3 mb-8 px-2">
              <span className="text-xl">🗺</span>
              <span className="text-xl font-bold">MediaMap</span>
              <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400">✕</button>
            </div>
            <nav className="space-y-1">
              {nav.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                    (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href))
                      ? 'bg-amber-500/10 text-amber-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="absolute bottom-4 left-4 right-4 border-t border-gray-800 pt-4">
              <div className="px-3 text-xs text-gray-500 mb-2">{user?.email}</div>
              <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-400">Выйти</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:p-8 p-4 pt-16 lg:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
