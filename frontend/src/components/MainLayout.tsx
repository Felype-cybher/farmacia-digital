import { useEffect, useRef, useState } from 'react'
import {
  Home, Box, Activity, BarChart3, UserCircle, LogOut, Users,
  Menu, X, Bell, AlertTriangle, Clock, Check, Moon, Sun,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo.png'

// ─── Navegação ────────────────────────────────────────────────────────────────

const navigation = [
  { label: 'Dashboard',     path: '/app',              icon: Home },
  { label: 'Estoque',       path: '/app/inventory',    icon: Box },
  { label: 'Movimentações', path: '/app/transactions', icon: Activity },
  { label: 'Pacientes',     path: '/app/patients',     icon: Users },
  { label: 'Relatórios',    path: '/app/reports',      icon: BarChart3 },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AlertKind = 'critical' | 'expiring'

interface NotificationItem {
  // id único do alerta = estoque_id + kind (evita duplicatas entre os dois tipos)
  key: string
  estoqueId: string
  kind: AlertKind
  medicamentoNome: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  daysToExpiry: number | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

function MainLayout() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  // Desloga e redireciona para a landing page
  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // ─── Drawer mobile ───────────────────────────────────────────────────────────

  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      setDrawerOpen(false)
    }
  }

  const currentPage = navigation.find(n =>
    n.path === '/app'
      ? location.pathname === '/app' || location.pathname === '/app/'
      : location.pathname.startsWith(n.path)
  )
  // ─── Notificações ────────────────────────────────────────────────────────────

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fecha dropdown ao navegar
  useEffect(() => { setNotifOpen(false) }, [location.pathname])

  const fetchNotifications = async () => {
    if (!profile?.id_ubs || !user?.id) return

    // Busca IDs já marcados como lidos pelo usuário atual
    const { data: readData } = await supabase
      .from('notificacoes_lidas')
      .select('estoque_id, kind')
      .eq('user_id', user.id)

    const readKeys = new Set(
      // Força String para garantir comparação correta independente do tipo do banco
      (readData ?? []).map(r => `${String(r.estoque_id)}:${r.kind}`)
    )

    // Busca estoque ativo com dados do medicamento
    const { data, error } = await supabase
      .from('estoque')
      .select('id, quantidade, quantidade_minima, data_vencimento, medicamentos(nome, ativo)')
      .eq('id_ubs', profile.id_ubs)
      .eq('medicamentos.ativo', true)

    if (error) {
      console.error('[fetchNotifications] Erro:', error.code, error.message)
      return
    }

    // Filtra apenas itens com medicamento ativo
    const activeItems = (data ?? []).filter(item => item.medicamentos !== null)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)

    const items: NotificationItem[] = []

    for (const item of activeItems) {
      const med = item.medicamentos as unknown as{ nome: string; ativo: boolean }

      // Alerta de estoque crítico
      if (item.quantidade <= item.quantidade_minima) {
        // Força String para garantir que a chave bata com o readKeys
        const key = `${String(item.id)}:critical`
        if (!readKeys.has(key)) {
          items.push({
            key,
            estoqueId: String(item.id),
            kind: 'critical',
            medicamentoNome: med.nome,
            quantidade: item.quantidade,
            quantidade_minima: item.quantidade_minima,
            data_vencimento: item.data_vencimento,
            daysToExpiry: null,
          })
        }
      }

      // Alerta de vencimento próximo
      if (item.data_vencimento) {
        const days = Math.ceil(
          (new Date(item.data_vencimento).getTime() - Date.now()) / 86400000
        )
        if (days <= 30 && !readKeys.has(`${String(item.id)}:expiring`)) {
          items.push({
            key: `${String(item.id)}:expiring`,
            estoqueId: String(item.id),
            kind: 'expiring',
            medicamentoNome: med.nome,
            quantidade: item.quantidade,
            quantidade_minima: item.quantidade_minima,
            data_vencimento: item.data_vencimento,
            daysToExpiry: days,
          })
        }
      }
    }

    setNotifications(items)
  }

  // Atualiza ao montar e a cada navegação
  useEffect(() => {
    fetchNotifications()
  }, [profile?.id_ubs, user?.id, location.pathname])

  const handleMarkRead = async (item: NotificationItem) => {
    if (!user?.id) return
    setMarkingRead(item.key)

    console.log('[handleMarkRead] Marcando como lida:', {
      key: item.key,
      estoqueId: item.estoqueId,
      kind: item.kind,
      userId: user.id,
    })

    try {
      const { error } = await supabase.from('notificacoes_lidas').insert({
        user_id: user.id,
        estoque_id: item.estoqueId,  // já é String — garantido na construção
        kind: item.kind,
      })

      if (error) {
        console.error('[handleMarkRead] Erro do Supabase:', error.code, error.message)
        // Mesmo com erro no banco, remove da lista local para não travar o usuário
      } else {
        console.log('[handleMarkRead] Inserção bem-sucedida para:', item.key)
      }

      // Remove da lista local imediatamente — independente do resultado do banco
      setNotifications(prev => prev.filter(n => n.key !== item.key))
    } catch (err) {
      console.error('[handleMarkRead] Exceção inesperada:', err)
      setNotifications(prev => prev.filter(n => n.key !== item.key))
    } finally {
      setMarkingRead(null)
    }
  }

  const handleNotifItemClick = (_item: NotificationItem) => {
    setNotifOpen(false)
    navigate('/app/inventory')
  }

  const notificationCount = notifications.length

  // ─── Sidebar content ─────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo CAPS Gestão" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                CAPS Gestão
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {profile?.id_ubs ? `CAPS ${profile.id_ubs}` : 'CAPS Sede'}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 md:hidden"
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
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
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
      <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-700/60">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
            <UserCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {profile?.full_name ?? user?.email}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sair"
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Sino com dropdown (reutilizado em mobile e desktop) ─────────────────────

  const BellButton = ({ size = 'md' }: { size?: 'sm' | 'md' }) => (
    <div ref={notifRef} className="relative">
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setNotifOpen(prev => !prev)}
        className={`relative rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:scale-110 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${
          size === 'sm' ? 'p-2' : 'p-2'
        }`}
      >
        <Bell className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        {notificationCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-red-500 font-bold leading-none text-white ${
              size === 'sm'
                ? 'h-3.5 w-3.5 text-[9px]'
                : 'h-4 w-4 text-[10px]'
            }`}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {notifOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {/* Cabeçalho do dropdown */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificações</p>
            {notificationCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {notificationCount} alerta{notificationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Lista de alertas */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="h-7 w-7 text-slate-200 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nenhum alerta no momento
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tudo certo com o estoque da UBS.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map(item => (
                  <li
                    key={item.key}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.kind === 'critical' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-500" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNotifItemClick(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.medicamentoNome}
                      </p>
                      <p className={`mt-0.5 text-xs ${
                        item.kind === 'critical' ? 'text-red-500' : 'text-orange-500'
                      }`}>
                        {item.kind === 'critical'
                          ? `Estoque Crítico: ${item.quantidade} un.`
                          : item.daysToExpiry !== null && item.daysToExpiry <= 0
                          ? 'Lote vencido'
                          : `Vence em ${item.daysToExpiry} dia${item.daysToExpiry !== 1 ? 's' : ''}`
                        }
                      </p>
                    </button>

                    <button
                      type="button"
                      title="Marcar como lida"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkRead(item)
                      }}
                      disabled={markingRead === item.key}
                      className="shrink-0 rounded-full border border-slate-200 bg-slate-100 p-1.5 text-slate-500 transition hover:border-green-200 hover:bg-green-100 hover:text-green-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                      aria-label="Marcar como lida"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setNotifOpen(false); navigate('/app/inventory') }}
                className="text-xs font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ver todos no Estoque →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">

        {/* ── Sidebar desktop (md+) ── */}
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-white border-r border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <SidebarContent />
        </aside>

        {/* ── Drawer mobile + backdrop ── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 flex md:hidden"
            onClick={handleBackdropClick}
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
            <div
              ref={drawerRef}
              className="relative z-50 flex w-72 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200 dark:bg-slate-800"
            >
              <SidebarContent />
            </div>
          </div>
        )}

        {/* ── Área principal ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header fixo mobile */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden dark:border-slate-700 dark:bg-slate-800/90">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {currentPage?.label ?? 'CAPS Gestão'}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <BellButton size="sm" />
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Header desktop */}
          <header className="hidden md:flex items-center justify-between border-b border-slate-100 bg-white px-8 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-blue-500 dark:text-blue-400">
                Painel Principal
              </p>
              <h1 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {profile?.id_ubs ? `CAPS ${profile.id_ubs}` : 'CAPS Sede'}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <BellButton size="md" />
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <span>{profile?.full_name ?? user?.email}</span>
              </div>
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
