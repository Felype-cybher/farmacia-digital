import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Pill, ThumbsUp, ThumbsDown, Send, CheckCircle, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

// ─── Subcomponente: badge de UBS com popover de endereço ─────────────────────

function UbsBadge({ ubs }: { ubs: UbsInfo }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onBlur={() => setOpen(false)}
        className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100"
        aria-label={`Ver endereço de ${ubs.nome}`}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        {ubs.nome}
      </button>

      {/* Popover de endereço */}
      {open && ubs.endereco && (
        <div className="absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Endereço
          </p>
          <p className="mt-0.5 text-xs text-slate-700">{ubs.endereco}</p>
          {/* Seta */}
          <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" />
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PublicConsulta() {
  const navigate = useNavigate()

  // ─── Carga inicial ───────────────────────────────────────────────────────────

  const [allMedications, setAllMedications] = useState<MedicationResult[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

      // Filtra apenas linhas com medicamento ativo
      const activeRows = (data ?? []).filter(row => {
        if (!row.medicamentos) return false
        const med = row.medicamentos as { nome: string; dosagem: string; tipo: string; ativo: boolean }
        return med.ativo === true
      })

      // Agrupa por nome+dosagem acumulando UBSs e somando quantidades
      const grouped = new Map<string, MedicationResult>()

      for (const row of activeRows) {
        const med = row.medicamentos as { nome: string; dosagem: string; tipo: string; ativo: boolean }
        const ubsRaw = row.ubs as { nome_ubs: string; endereco: string | null } | null
        const key = `${med.nome}|${med.dosagem}`

        if (grouped.has(key)) {
          const entry = grouped.get(key)!
          entry.totalQuantidade += row.quantidade

          // Adiciona UBS à lista se ainda não estiver (deduplicação por nome)
          if (ubsRaw && !entry.ubsList.some(u => u.nome === ubsRaw.nome)) {
            entry.ubsList.push({ nome: ubsRaw.nome, endereco: ubsRaw.endereco })
          }
        } else {
          grouped.set(key, {
            nome: med.nome,
            dosagem: med.dosagem,
            tipo: med.tipo,
            totalQuantidade: row.quantidade,
            ubsList: ubsRaw ? [{ nome: ubsRaw.nome, endereco: ubsRaw.endereco }] : [],
          })
        }
      }

      const sorted = Array.from(grouped.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
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
    return allMedications.filter(
      med =>
        med.nome.toLowerCase().includes(term) ||
        med.dosagem.toLowerCase().includes(term)
    )
  }, [allMedications, searchTerm])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600">
            <Pill className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Farmácia Digital
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-8">

        {/* Título */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Consulta de Medicamentos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Verifique se o medicamento que você precisa está disponível na UBS.
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
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-slate-500"
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
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              {searchTerm ? (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    Nenhum medicamento encontrado para "{searchTerm}".
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tente outro nome ou dosagem, ou procure a farmácia da UBS diretamente.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Nenhum medicamento cadastrado no momento.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">
                {searchTerm
                  ? `${filteredResults.length} resultado${filteredResults.length !== 1 ? 's' : ''} para "${searchTerm}"`
                  : `${allMedications.length} medicamento${allMedications.length !== 1 ? 's' : ''} cadastrado${allMedications.length !== 1 ? 's' : ''}`
                }
              </p>

              {filteredResults.map(med => {
                const disponivel = med.totalQuantidade > 0
                return (
                  <div
                    key={`${med.nome}|${med.dosagem}`}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300"
                  >
                    {/* Linha principal: nome + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{med.nome}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {med.dosagem} · {med.tipo}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          disponivel ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${disponivel ? 'bg-green-500' : 'bg-red-500'}`} />
                        {disponivel ? 'Disponível' : 'Em falta temporária'}
                      </span>
                    </div>

                    {/* Linha de UBSs — só exibe se houver dados */}
                    {med.ubsList.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                          {disponivel ? 'Disponível em:' : 'Cadastrado em:'}
                        </span>
                        {med.ubsList.map(ubs => (
                          <UbsBadge key={ubs.nome} ubs={ubs} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Seção de Feedback ── */}
        <div className="mt-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {feedbackState === 'sent' ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <p className="text-base font-semibold text-slate-900">Obrigado pela sua avaliação!</p>
                <p className="text-sm text-slate-500">
                  Seu feedback nos ajuda a melhorar o serviço para toda a comunidade.
                </p>
              </div>
            ) : (
              <>
                <p className="text-center text-sm font-medium text-slate-700">
                  Este sistema foi útil para você?
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleVote('sim')}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-medium transition ${
                      feedbackVote === 'sim'
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700'
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
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Não
                  </button>
                </div>

                {feedbackState === 'form' && (
                  <form onSubmit={handleSendFeedback} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Seu nome <span className="text-slate-400">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={feedbackNome}
                        onChange={e => setFeedbackNome(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Deixe seu comentário ou sugestão
                      </label>
                      <textarea
                        value={feedbackComentario}
                        onChange={e => setFeedbackComentario(e.target.value)}
                        placeholder="O que podemos melhorar? O que funcionou bem?"
                        rows={3}
                        className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
