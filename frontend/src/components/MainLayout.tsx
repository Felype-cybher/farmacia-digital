import { Home, Box, Activity, BarChart3, UserCircle, LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useResponsive } from '../hooks/useResponsive'

const navigation = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Estoque', path: '/inventory', icon: Box },
  { label: 'Movimentações', path: '/transactions', icon: Activity },
  { label: 'Relatórios', path: '/reports', icon: BarChart3 },
]

function MainLayout() {
  const { user, profile, signOut } = useAuth()
  const isMobile = useResponsive()

  return (
    <div className="min-h-screen bg-brand-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="w-full bg-white shadow-sm lg:w-72">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Farmácia Digital
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {profile?.id_ubs ? `UBS ${profile.id_ubs}` : 'UBS Sede'}
            </p>
          </div>
          <nav className="space-y-1 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-brand-100 hover:text-brand-900'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          {!isMobile && (
            <div className="mt-auto border-t border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-100 p-2 text-brand-700">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {profile?.full_name ?? user?.email}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 bg-brand-50 px-6 py-6 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Painel Principal</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Farmácia Digital - {profile?.id_ubs ? `UBS ${profile.id_ubs}` : 'UBS Sede'}
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <UserCircle className="h-6 w-6 text-brand-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{profile?.full_name ?? user?.email}</p>
                <p className="text-xs text-slate-500">
                  {profile?.id_ubs ? `UBS ${profile.id_ubs}` : 'Perfil do usuário'}
                </p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </header>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
