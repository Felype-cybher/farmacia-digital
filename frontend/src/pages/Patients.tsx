import { useState, useRef, useEffect } from 'react'
import { Search, X, User, Clock, Pill } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PatientWithdrawal {
  id: number | string
  created_at: string
  quantidade: number
  estoque: {
    medicamentos: {
      nome: string
      dosagem: string
    } | null
  } | null
}

interface PatientHistoryItem {
  cpf_paciente: string
  nome_destino: string
  withdraws: PatientWithdrawal[]
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Patients() {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [patientHistory, setPatientHistory] = useState<PatientHistoryItem[]>([])
  const [selectedPatientIndex, setSelectedPatientIndex] = useState<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const buildIlikePattern = (query: string): string => {
    const sanitized = query.trim().replace(/[%_,"\\]/g, '')
    return `%${sanitized}%`
  }

  // Buscar histórico de pacientes ao digitar — filtro no banco (LGPD)
  const searchPatients = async (query: string) => {
    if (!profile?.id_ubs || !query.trim()) {
      setPatientHistory([])
      setSelectedPatientIndex(null)
      return
    }

    setIsSearching(true)
    try {
      const pattern = buildIlikePattern(query)

      const { data, error } = await supabase
        .from('historico')
        .select(`
          id,
          created_at,
          quantidade,
          nome_destino,
          cpf_paciente,
          estoque (
            medicamentos (
              nome,
              dosagem
            )
          )
        `)
        .eq('tipo', 'saida')
        .eq('id_ubs', profile.id_ubs)
        .not('cpf_paciente', 'is', null)
        .or(`nome_destino.ilike."${pattern}",cpf_paciente.ilike."${pattern}"`)
        .order('created_at', { ascending: false })
        .limit(150)

      if (error) {
        throw error
      }

      const filtered = data ?? []

      // Agrupar por CPF do paciente
      const grouped = filtered.reduce((acc, item) => {
        const existing = acc.find(p => p.cpf_paciente === item.cpf_paciente)
        if (existing) {
          existing.withdraws.push(item as unknown as PatientWithdrawal)
        } else {
          acc.push({
            cpf_paciente: item.cpf_paciente,
            nome_destino: item.nome_destino,
            withdraws: [item as unknown as PatientWithdrawal]
          })
        }
        return acc
      }, [] as PatientHistoryItem[])

      setPatientHistory(grouped)
      setSelectedPatientIndex(grouped.length > 0 ? 0 : null)
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err)
      toast.error('Erro ao buscar histórico de pacientes.')
      setPatientHistory([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchPatients(searchQuery)
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery, profile?.id_ubs])

  // Formatar data
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pacientes</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Consulta o histórico de retiradas de medicamentos controlados.
        </p>
      </div>

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Painel esquerdo: Busca e lista de pacientes */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
            {/* Barra de pesquisa */}
            <div className="border-b border-slate-100 p-4 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setPatientHistory([])
                      setSelectedPatientIndex(null)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de pacientes */}
            <div className="max-h-[60vh] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                    <span className="text-sm">Buscando...</span>
                  </div>
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <User className="h-8 w-8 text-slate-200 dark:text-slate-600" />
                  {searchQuery.trim() ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum paciente encontrado.</p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Digite um nome ou CPF para buscar.</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {patientHistory.map((patient, index) => (
                    <li key={patient.cpf_paciente} className="p-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPatientIndex(index)}
                        className={`w-full text-left p-4 transition-colors hover:bg-blue-50 dark:hover:bg-slate-700/50 ${
                          selectedPatientIndex === index
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {patient.nome_destino}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {patient.cpf_paciente}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              <Clock className="h-3.5 w-3.5" />
                              {patient.withdraws.length} retirada{patient.withdraws.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Painel direito: Histórico detalhado do paciente selecionado */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
            {selectedPatientIndex === null || !patientHistory[selectedPatientIndex] ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <User className="h-12 w-12 text-slate-200 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Selecione um paciente para ver o histórico
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Você pode buscar por nome ou CPF no painel à esquerda.
                </p>
              </div>
            ) : (
              <>
                {/* Cabeçalho do paciente */}
                <div className="border-b border-slate-100 p-5 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {patientHistory[selectedPatientIndex].nome_destino}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        CPF: {patientHistory[selectedPatientIndex].cpf_paciente}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de retiradas */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {patientHistory[selectedPatientIndex].withdraws.map((withdraw) => (
                      <li key={withdraw.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {withdraw.estoque?.medicamentos?.nome || 'Medicamento não encontrado'}
                              {withdraw.estoque?.medicamentos?.dosagem
                                ? ` — ${withdraw.estoque.medicamentos.dosagem}`
                                : ''}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {withdraw.quantidade} unidade{withdraw.quantidade !== 1 ? 's' : ''}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDate(withdraw.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Patients

