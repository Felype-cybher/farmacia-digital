import { useNavigate } from 'react-router-dom'
import { Search, ShieldCheck, Pill } from 'lucide-react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function LandingPage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            UBS Digital
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Conteúdo central */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Título */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">
              Bem-vindo à
              <span className="block text-blue-600 dark:text-blue-400">UBS Digital</span>
            </h1>
            <p className="mt-4 text-base text-slate-500 dark:text-slate-400">
              Consulte a disponibilidade de medicamentos ou acesse o painel administrativo da UBS.
            </p>
          </div>

          {/* Card de decisão */}
          <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-100/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">

            {/* Botão — Consultar Medicamentos */}
            <button
              type="button"
              onClick={() => navigate('/consulta')}
              className="group flex w-full items-center gap-5 border-b border-slate-100 px-8 py-7 text-left transition-all duration-150 hover:bg-blue-50 active:scale-[0.99] dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/40 dark:text-blue-400">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Consultar Medicamentos
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Verifique a disponibilidade na sua UBS sem precisar de cadastro.
                </p>
              </div>
              <span className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-400 dark:text-slate-600">
                →
              </span>
            </button>

            {/* Botão — Acesso Administrativo */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="group flex w-full items-center gap-5 px-8 py-7 text-left transition-all duration-150 hover:bg-slate-50 active:scale-[0.99] dark:hover:bg-slate-700/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-800 group-hover:text-white dark:bg-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Acesso Administrativo
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Área restrita para profissionais da UBS.
                </p>
              </div>
              <span className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500 dark:text-slate-600">
                →
              </span>
            </button>
          </div>

          {/* Rodapé */}
          <div className="mt-8 space-y-2 text-center">
            <div className="flex justify-center">
              <img
                src="/ifmaLogo.png"
                alt="Logo IFMA"
                className="h-10 w-auto object-contain opacity-70 dark:opacity-50"
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Sistema de Gestão de Medicamentos · Secretaria Municipal de Saúde
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © 2026 UBS Digital. Desenvolvido por Alunos de Análise e Desenvolvimento de Sistemas — IFMA Campus Coelho Neto
            </p>
            <p>
              <a
                href="https://www.flaticon.com/free-icons/drug"
                title="drug icons"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-300 transition hover:text-slate-400 hover:underline dark:text-slate-600 dark:hover:text-slate-400"
              >
                Drug icons created by Freepik - Flaticon
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
