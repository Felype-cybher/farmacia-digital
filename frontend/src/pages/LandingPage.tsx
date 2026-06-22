import { useNavigate } from 'react-router-dom'
import { Search, ShieldCheck } from 'lucide-react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo.png'
import { APP_NAME } from '../lib/brand'

function LandingPage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950">
      <div className="absolute right-5 top-5 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex w-full">
        {/* Lado Esquerdo (Logo) - Oculto em mobile */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center p-10">
          <img
            src={logo}
            alt={`Logo ${APP_NAME}`}
            className="w-100 object-contain drop-shadow-2xl animate-pulse"
          />
        </div>

        {/* Lado Direito (Conteúdo) */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-4 py-10">
          {/* Logo para mobile */}
          <div className="mb-8 flex justify-center md:hidden">
            <img
              src={logo}
              alt={`Logo ${APP_NAME}`}
              className="w-52 object-contain"
            />
          </div>

          <div className="w-full max-w-lg">
            {/* Título */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">
                Bem-vindo ao
                <span className="block text-blue-600 dark:text-blue-400">{APP_NAME}</span>
              </h1>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
                Consulte a disponibilidade de medicamentos ou acesse o painel administrativo.
              </p>
            </div>

            {/* Card de decisão */}
            <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white/80 dark:border-slate-700 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl shadow-blue-100/50 dark:shadow-none">
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
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    Verifique a disponibilidade na rede de saúde sem precisar de cadastro.
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
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    Área restrita para profissionais de saúde autorizados.
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
                  className="h-20 w-auto object-contain opacity-70 dark:opacity-50"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sistema de Gestão de Medicamentos · Secretaria Municipal de Saúde
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                © 2026 {APP_NAME}. Desenvolvido por Alunos de Análise e Desenvolvimento de Sistemas — IFMA Campus Coelho Neto
              </p>
              <p>
                <a
                  href="https://www.flaticon.com/free-icons/drug"
                  title="drug icons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 transition hover:text-slate-500 hover:underline dark:text-slate-500 dark:hover:text-slate-400"
                >
                  Drug icons created by Freepik - Flaticon
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
