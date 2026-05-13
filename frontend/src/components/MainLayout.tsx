import { useEffect, useRef, useState } from 'react'
import { Home, Box, Activity, BarChart3, UserCircle, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─── Navegação ────────────────────────────────────────────────────────────────

const navigation = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Estoque', path: '/inventory', icon: Box },
  { label: 'Movimentações', path: '/transactions', icon: Activity },
  { label: 'Relatórios', path: '/reports', icon: BarChart3 },
]

// ─── Componente ───────────────────────────────────────────────────────────────

function MainLayout() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  // Controla abertura do drawer em mobile
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Fecha o drawer ao navegar
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Bloqueia scroll do body quando drawer está aberto em mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Fecha ao clicar no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      setDrawerOpen(false)
    }
  }

  // Rótulo da página atual para o header mobile
  const currentPage = navigation.find(n =>
    n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)
  )

  // ─── Sidebar content (reutilizado em desktop e drawer mobile) ───────────────

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
            Farmácia Digital
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profile?.id_ubs ? `UBS ${profile.id_ubs}` : 'UBS Sede'}
          </p>
        </div>
        {/* Botão fechar — só aparece no drawer mobile */}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-3 py-5">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Perfil + Sair */}
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <UserCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {profile?.full_name ?? user?.email}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sair"
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">

        {/* ── Sidebar desktop (md+) ── */}
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-white border-r border-slate-100 shadow-sm">
          <SidebarContent />
        </aside>

        {/* ── Drawer mobile + backdrop ── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 flex md:hidden"
            onClick={handleBackdropClick}
            aria-hidden="true"
          >
            {/* Backdrop com blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

            {/* Painel do drawer */}
            <div
              ref={drawerRef}
              className="relative z-50 flex w-72 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200"
            >
              <SidebarContent />
            </div>
          </div>
        )}

        {/* ── Área principal ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header fixo mobile */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {currentPage?.label ?? 'Farmácia Digital'}
            </p>
            {/* Botão sair rápido no header mobile */}
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </header>

          {/* Header desktop */}
          <header className="hidden md:flex items-center justify-between border-b border-slate-100 bg-white px-8 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-blue-500">
                Painel Principal
              </p>
              <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
                {profile?.id_ubs ? `UBS ${profile.id_ubs}` : 'UBS Sede'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UserCircle className="h-4 w-4 text-blue-500" />
              <span>{profile?.full_name ?? user?.email}</span>
            </div>
          </header>

          {/* Conteúdo das páginas */}
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
