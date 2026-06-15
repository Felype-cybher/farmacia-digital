import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, ArrowLeft } from 'lucide-react'
import logo from '../assets/logo.png'

function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')
    try {
      await signIn(email, password)
      navigate('/app', { replace: true })
    } catch {
      setErrorMessage('Não foi possível fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-blue-500'

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950">
      <div className="absolute left-5 top-5 z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
      </div>
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
            alt="Logo CAPS Gestão"
            className="w-100 object-contain drop-shadow-2xl animate-pulse"
          />
        </div>

        {/* Lado Direito (Formulário) */}
        <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-8 shadow-xl">
            {/* Logo para mobile */}
            <div className="mb-8 flex justify-center md:hidden">
              <img
                src={logo}
                alt="Logo CAPS Gestão"
                className="w-48 object-contain"
              />
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Bem-vindo ao CAPS Gestão
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Entre com seu e-mail e senha para acessar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>

              {errorMessage && (
                <p className="rounded-2xl bg-red-50/80 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Validando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
