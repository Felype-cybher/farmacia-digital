import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Supabase retorna medicamentos como objeto único (FK muitos-para-um)
interface HistoryItem {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    lote: string
    data_vencimento: string | null
    medicamentos: { nome: string; dosagem: string } | null
  } | null
}

// Linha enriquecida para o relatório de auditoria (query separada na exportação)
// ubs e profiles removidos — FKs não confirmadas no banco
// UBS é preenchida pelo contexto do usuário logado
interface AuditRow {
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    lote: string
    data_vencimento: string | null
    medicamentos: { nome: string; dosagem: string } | null
  } | null
}

// ─── Helpers de formatação ────────────────────────────────────────────────────

const formatDateBR = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const formatDateTimeBR = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

// Escapa campo para CSV — envolve em aspas duplas e escapa aspas internas
const csvField = (value: string | number | null | undefined): string => {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Reports() {
  const { profile } = useAuth()

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState({ startDate: '', endDate: '' })

  // ─── Carga do histórico para exibição ────────────────────────────────────────

  useEffect(() => {
    if (!profile?.id_ubs) return
    loadHistory()
  }, [profile?.id_ubs, filters])

  const loadHistory = async () => {
    if (!profile?.id_ubs) return
    setLoading(true)

    let query = supabase
      .from('historico')
      .select('id, created_at, tipo, quantidade, estoque(lote, data_vencimento, medicamentos(nome, dosagem))')
      .eq('id_ubs', profile.id_ubs)
      .order('created_at', { ascending: false })

    if (filters.startDate) query = query.gte('created_at', filters.startDate)
    if (filters.endDate)   query = query.lte('created_at', `${filters.endDate}T23:59:59`)

    const { data, error } = await query

    setLoading(false)
    if (error) {
      console.error('Erro ao carregar histórico:', error)
      return
    }
    setHistory((data ?? []) as HistoryItem[])
  }

  // ─── Exportação — Relatório de Auditoria ─────────────────────────────────────

  const handleExportCSV = async () => {
    if (!profile?.id_ubs) return
    setIsExporting(true)

    try {
      // Query de exportação — sem joins de ubs/profiles (FKs não confirmadas)
      // UBS é obtida do contexto do usuário logado para evitar PGRST200
      let query = supabase
        .from('historico')
        .select(`
          created_at,
          tipo,
          quantidade,
          estoque(lote, data_vencimento, medicamentos(nome, dosagem))
        `)
        .eq('id_ubs', profile.id_ubs)
        .order('created_at', { ascending: false })

      if (filters.startDate) query = query.gte('created_at', filters.startDate)
      if (filters.endDate)   query = query.lte('created_at', `${filters.endDate}T23:59:59`)

      const { data, error } = await query

      if (error) {
        toast.error('Erro ao gerar relatório.')
        console.error('Erro ao exportar relatório de auditoria:', error.code, error.message)
        return
      }

      const rows = (data ?? []) as AuditRow[]

      if (rows.length === 0) {
        toast('Nenhum dado encontrado para o período selecionado.', { icon: 'ℹ️' })
        return
      }

      // Cabeçalhos em Português
      const headers = [
        'Data',
        'UBS',
        'Medicamento',
        'Dosagem',
        'Lote',
        'Validade',
        'Tipo',
        'Quantidade',
        'Responsável',
      ]

      const csvRows = rows.map(row => [
        csvField(formatDateTimeBR(row.created_at)),
        csvField(profile.id_ubs),                                    // UBS do contexto — sem join
        csvField(row.estoque?.medicamentos?.nome ?? '—'),            // encadeamento opcional
        csvField(row.estoque?.medicamentos?.dosagem ?? '—'),
        csvField(row.estoque?.lote ?? '—'),
        csvField(formatDateBR(row.estoque?.data_vencimento ?? null)),
        csvField(row.tipo === 'entrada' ? 'Entrada' : 'Saída'),
        csvField(row.quantidade),
        csvField('—'),  // Responsável — aguardando FK id_responsavel no banco
      ])

      // Separador ";" para compatibilidade com Excel pt-BR
      // BOM UTF-8 (\uFEFF) garante acentos corretos ao abrir no Excel
      const separator = ';'
      const headerLine = headers.map(h => csvField(h)).join(separator)
      const dataLines = csvRows.map(r => r.join(separator))
      const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n')

      // Nome dinâmico: Relatorio_Movimentacoes_UBS_[id]_AAAA-MM-DD.csv
      const ubsSlug = String(profile.id_ubs)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // remove acentos
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
      const today = new Date().toISOString().slice(0, 10)
      const fileName = `Relatorio_Movimentacoes_${ubsSlug}_${today}.csv`

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Relatório exportado: ${fileName}`)
    } catch (err) {
      toast.error('Erro inesperado ao exportar.')
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Relatórios</h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico completo de movimentações com filtros e exportação para auditoria.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros + exportação */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Data Início</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Data Fim</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="sm:shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || history.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar Relatório'}
            </button>
          </div>
        </div>

        {/* Legenda do relatório */}
        {history.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            {history.length} registro{history.length !== 1 ? 's' : ''} encontrado{history.length !== 1 ? 's' : ''}.
            O relatório exportado inclui UBS, lote, validade e responsável.
          </p>
        )}
      </div>

      {/* Tabela de histórico */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-500">Carregando histórico...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Data</th>
                  <th className="px-5 py-3.5">Medicamento</th>
                  <th className="px-5 py-3.5">Lote</th>
                  <th className="px-5 py-3.5">Validade</th>
                  <th className="px-5 py-3.5">Tipo</th>
                  <th className="px-5 py-3.5">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDateTimeBR(item.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {item.estoque?.medicamentos?.nome ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.estoque?.medicamentos?.dosagem ?? '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-600">
                      {item.estoque?.lote ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDateBR(item.estoque?.data_vencimento)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.tipo === 'entrada'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                      {item.tipo === 'entrada' ? '+' : '−'}{item.quantidade}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      Nenhuma movimentação encontrada para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default Reports
