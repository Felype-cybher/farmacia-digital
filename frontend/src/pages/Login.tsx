import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, Pill } from 'lucide-react'

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
    'mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-500'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 dark:from-slate-900 dark:to-slate-800">

      {/* Botão de tema — canto superior direito */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        className="absolute right-5 top-5 rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Card de login */}
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">

        {/* Logo + título */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              UBS Digital
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Acesso Administrativo</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Entre com seu e-mail e senha para acessar a UBS.
        </p>

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
            <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
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
  )
}

export default Login
