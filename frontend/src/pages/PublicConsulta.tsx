import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ThumbsUp, ThumbsDown, Send, CheckCircle, MapPin, Moon, Sun } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo.png'
import { APP_NAME } from '../lib/brand'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// UBS onde o medicamento está disponível
interface UbsInfo {
  nome_ubs: string
  endereco: string | null
}

// Medicamento agrupado por nome+dosagem (sem lotes individuais)
// Pode estar disponível em múltiplas UBSs
interface MedicationResult {
  nome: string
  dosagem: string
  tipo: string
  totalQuantidade: number  // soma de todos os lotes ativos
  ubsList: UbsInfo[]       // UBSs onde este medicamento tem estoque
}

type FeedbackVote = 'sim' | 'nao' | null
type FeedbackState = 'idle' | 'form' | 'sent'

const MEDICATIONS_PAGE_SIZE = 10

const safeLower = (value: string | null | undefined): string =>
  (value ?? '').toLowerCase()

const medicationMatchesSearch = (med: MedicationResult, term: string): boolean =>
  safeLower(med.nome).includes(term) ||
  safeLower(med.dosagem).includes(term) ||
  safeLower(med.tipo).includes(term)

// ─── Subcomponente: badge de UBS com popover de endereço ─────────────────────

function UbsBadge({ ubs }: { ubs: UbsInfo }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onBlur={() => setOpen(false)}
        className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        aria-label={`Ver endereço de ${ubs.nome_ubs ?? 'unidade'}`}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        {ubs.nome_ubs ?? 'Unidade'}
      </button>

      {open && ubs.endereco && (
        <div className="absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Endereço
          </p>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{ubs.endereco}</p>
          <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800" />
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PublicConsulta() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  // ─── Carga inicial ───────────────────────────────────────────────────────────

  const [allMedications, setAllMedications] = useState<MedicationResult[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState(MEDICATIONS_PAGE_SIZE)

  useEffect(() => {
    const loadAll = async () => {
      setLoadingData(true)

      // Join triplo: estoque → medicamentos + estoque → ubs
      // Ajuste os nomes das colunas de ubs se necessário (nome, endereco)
      const { data, error } = await supabase
        .from('estoque')
        .select('quantidade, medicamentos(nome, dosagem, tipo, ativo), ubs(nome_ubs, endereco)')

      console.log('[PublicConsulta] Dados brutos:', data)
      console.log('[PublicConsulta] Erro:', error)

      setLoadingData(false)

      if (error) {
        console.error('[PublicConsulta] Erro ao carregar:', error.code, error.message)
        return
      }

      // Filtra apenas linhas com medicamento ativo e dados mínimos
      const activeRows = (data ?? []).filter(row => {
        if (!row.medicamentos) return false
        const med = row.medicamentos as unknown as {
          nome?: string | null
          dosagem?: string | null
          tipo?: string | null
          ativo?: boolean | null
        }
        return med.ativo === true && (med.nome != null || med.dosagem != null)
      })

      // Agrupa por nome+dosagem acumulando UBSs e somando quantidades
      const grouped = new Map<string, MedicationResult>()

      for (const row of activeRows) {
        const med = row.medicamentos as unknown as {
          nome?: string | null
          dosagem?: string | null
          tipo?: string | null
        }
        const ubsRaw = row.ubs as unknown as { nome_ubs?: string | null; endereco?: string | null } | null
        const nome = med.nome ?? ''
        const dosagem = med.dosagem ?? ''
        const key = `${nome}|${dosagem}`
        const quantidade = Number(row.quantidade) || 0

        if (grouped.has(key)) {
          const entry = grouped.get(key)!
          entry.totalQuantidade += quantidade

          if (ubsRaw?.nome_ubs && !entry.ubsList.some(u => u.nome_ubs === ubsRaw.nome_ubs)) {
            entry.ubsList.push({
              nome_ubs: ubsRaw.nome_ubs,
              endereco: ubsRaw.endereco ?? null,
            })
          }
        } else {
          grouped.set(key, {
            nome,
            dosagem,
            tipo: med.tipo ?? '',
            totalQuantidade: quantidade,
            ubsList: ubsRaw?.nome_ubs
              ? [{ nome_ubs: ubsRaw.nome_ubs, endereco: ubsRaw.endereco ?? null }]
              : [],
          })
        }
      }

      const sorted = Array.from(grouped.values()).sort((a, b) =>
        safeLower(a.nome).localeCompare(safeLower(b.nome), 'pt-BR'),
      )

      console.log('[PublicConsulta] Agrupados:', sorted)
      setAllMedications(sorted)
    }

    loadAll()
  }, [])

  // ─── Filtro local em tempo real ──────────────────────────────────────────────

  const filteredResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return allMedications
    return allMedications.filter(med => medicationMatchesSearch(med, term))
  }, [allMedications, searchTerm])

  const visibleResults = useMemo(
    () => filteredResults.slice(0, visibleCount),
    [filteredResults, visibleCount],
  )

  const hasMoreMedications = visibleCount < filteredResults.length

  useEffect(() => {
    setVisibleCount(MEDICATIONS_PAGE_SIZE)
  }, [searchTerm])

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + MEDICATIONS_PAGE_SIZE, filteredResults.length))
  }

  // ─── Feedback ────────────────────────────────────────────────────────────────

  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')
  const [feedbackVote, setFeedbackVote] = useState<FeedbackVote>(null)
  const [feedbackNome, setFeedbackNome] = useState('')
  const [feedbackComentario, setFeedbackComentario] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)

  const handleVote = (vote: FeedbackVote) => {
    setFeedbackVote(vote)
    setFeedbackState('form')
  }

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingFeedback(true)

    const { error } = await supabase.from('feedbacks').insert({
      util: feedbackVote === 'sim',
      nome: feedbackNome.trim() || null,
      comentario: feedbackComentario.trim() || null,
    })

    setSendingFeedback(false)
    if (error) {
      console.error('[PublicConsulta] Erro ao enviar feedback:', error.code, error.message)
    }
    setFeedbackState('sent')
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt={`Logo ${APP_NAME}`}
            className="h-8 w-8 object-contain"
          />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            {APP_NAME}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="ml-1 rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-8">

        {/* Título */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
            Consulta de Medicamentos
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Verifique se o medicamento que você precisa está disponível.
          </p>
        </div>

        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou dosagem..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {/* Lista de medicamentos */}
        <div className="mt-6">
          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-700" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {searchTerm ? (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nenhum medicamento encontrado para "{searchTerm}".
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Tente outro nome ou dosagem, ou procure a farmácia da UBS diretamente.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum medicamento cadastrado no momento.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {searchTerm
                  ? `${filteredResults.length} resultado${filteredResults.length !== 1 ? 's' : ''} para "${searchTerm}"`
                  : `${allMedications.length} medicamento${allMedications.length !== 1 ? 's' : ''} cadastrado${allMedications.length !== 1 ? 's' : ''}`
                }
              </p>

              {visibleResults.map((med, index) => {
                const disponivel = (med.totalQuantidade ?? 0) > 0
                const cardKey = `${med.nome || 'sem-nome'}|${med.dosagem || 'sem-dosagem'}|${index}`
                return (
                  <div
                    key={cardKey}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {med.nome || 'Medicamento sem nome'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {[med.dosagem, med.tipo].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          disponivel
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${disponivel ? 'bg-green-500' : 'bg-red-500'}`} />
                        {disponivel ? 'Disponível' : 'Em falta temporária'}
                      </span>
                    </div>

                    {med.ubsList.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {disponivel ? 'Disponível em:' : 'Cadastrado em:'}
                        </span>
                        {med.ubsList.map((ubs, ubsIndex) => (
                          <UbsBadge
                            key={ubs.nome_ubs ?? `ubs-${ubsIndex}`}
                            ubs={ubs}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {hasMoreMedications && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="mt-2 w-full rounded-2xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Ver mais medicamentos ({filteredResults.length - visibleCount} restante
                  {filteredResults.length - visibleCount !== 1 ? 's' : ''})
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Seção de Feedback ── */}
        <div className="mt-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {feedbackState === 'sent' ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Obrigado pela sua avaliação!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Seu feedback nos ajuda a melhorar o serviço para toda a comunidade.
                </p>
              </div>
            ) : (
              <>
                <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Este sistema foi útil para você?
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleVote('sim')}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-medium transition ${
                      feedbackVote === 'sim'
                        ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote('nao')}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-medium transition ${
                      feedbackVote === 'nao'
                        ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Não
                  </button>
                </div>

                {feedbackState === 'form' && (
                  <form onSubmit={handleSendFeedback} className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-700">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Seu nome <span className="text-slate-400 dark:text-slate-500">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={feedbackNome}
                        onChange={e => setFeedbackNome(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Deixe seu comentário ou sugestão
                      </label>
                      <textarea
                        value={feedbackComentario}
                        onChange={e => setFeedbackComentario(e.target.value)}
                        placeholder="O que podemos melhorar? O que funcionou bem?"
                        rows={3}
                        className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingFeedback}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sendingFeedback ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicConsulta
