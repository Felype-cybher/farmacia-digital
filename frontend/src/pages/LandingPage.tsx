import { useNavigate } from 'react-router-dom'
import { Search, ShieldCheck, Pill } from 'lucide-react'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50">

      {/* Header simples */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Farmácia Digital
          </span>
        </div>
      </header>

      {/* Conteúdo central */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Título */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Bem-vindo à
              <span className="block text-blue-600">Farmácia Digital</span>
            </h1>
            <p className="mt-4 text-base text-slate-500">
              Consulte a disponibilidade de medicamentos ou acesse o painel administrativo da UBS.
            </p>
          </div>

          {/* Card de decisão */}
          <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-100/50">

            {/* Botão — Consultar Medicamentos */}
            <button
              type="button"
              onClick={() => navigate('/consulta')}
              className="group flex w-full items-center gap-5 border-b border-slate-100 px-8 py-7 text-left transition-all duration-150 hover:bg-blue-50 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900">
                  Consultar Medicamentos
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Verifique a disponibilidade na sua UBS sem precisar de cadastro.
                </p>
              </div>
              <span className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-400">
                →
              </span>
            </button>

            {/* Botão — Acesso Administrativo */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="group flex w-full items-center gap-5 px-8 py-7 text-left transition-all duration-150 hover:bg-slate-50 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-800 group-hover:text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900">
                  Acesso Administrativo
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Área restrita para profissionais da UBS.
                </p>
              </div>
              <span className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500">
                →
              </span>
            </button>
          </div>

          {/* Rodapé discreto */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Sistema de Gestão de Medicamentos · Secretaria Municipal de Saúde
          </p>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
