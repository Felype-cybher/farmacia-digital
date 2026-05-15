import { useEffect, useRef, useState } from 'react'
import { X, AlertTriangle, Clock } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Supabase retorna medicamentos como objeto único (FK muitos-para-um)
interface RecentMovement {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    medicamentos: { nome: string; dosagem: string } | null
  } | null
}

// Item de estoque com dados do medicamento para os modais de alerta
interface StockItem {
  id: string
  lote: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  medicamentos: { nome: string; dosagem: string } | null
}

type AlertType = 'critical' | 'expiring' | null

// ─── Constantes ───────────────────────────────────────────────────────────────

const EXPIRY_WARNING_DAYS = 30

// ─── Componente ───────────────────────────────────────────────────────────────

function Dashboard() {
  const { profile } = useAuth()
  // useLocation garante re-fetch toda vez que o usuário navega para o Dashboard
  const location = useLocation()

  const [stock, setStock] = useState<StockItem[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<AlertType>(null)

  // Ref para fechar o modal ao clicar fora
  const modalRef = useRef<HTMLDivElement>(null)

  // ─── Carga de dados ──────────────────────────────────────────────────────────

  // Recarrega sempre que o usuário navega para o Dashboard (location muda)
  // ou quando o perfil carrega pela primeira vez
  useEffect(() => {
    if (!profile?.id_ubs) return
    loadDashboardData()
  }, [profile?.id_ubs, location.pathname])

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAlert(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadDashboardData = async () => {
    if (!profile?.id_ubs) return
    setLoading(true)

    // Busca estoque com medicamentos ativos — exclui itens de medicamentos inativados
    const { data: stockData, error: stockError } = await supabase
      .from('estoque')
      .select('id, lote, quantidade, quantidade_minima, data_vencimento, medicamentos(nome, dosagem)')
      .eq('id_ubs', profile.id_ubs)
      .eq('medicamentos.ativo', true)

    if (stockError) {
      console.error('Erro ao carregar estoque para KPIs:', stockError)
      setLoading(false)
      return
    }

    // O filtro .eq('medicamentos.ativo', true) no Supabase retorna medicamentos: null
    // para linhas onde ativo = false (não exclui a linha, apenas nulifica o join).
    // Filtramos aqui para garantir que apenas itens com medicamento ativo entrem nos KPIs.
    const activeStock = (stockData ?? []).filter(
(item) => (item as unknown as StockItem).medicamentos !== null
) as unknown as StockItem[]

    setStock(activeStock)

    // Movimentações recentes — caminho: historico → estoque → medicamentos (N:1)
    const { data: movements, error: movError } = await supabase
      .from('historico')
      .select('id, tipo, quantidade, created_at, estoque(medicamentos(nome, dosagem))')
      .eq('id_ubs', profile.id_ubs)
      .order('created_at', { ascending: false })
      .limit(5)

    if (movError) {
      console.error('Erro ao carregar movimentações recentes [PGRST]:', movError.code, movError.message)
    }

    setRecentMovements((movements as unknown as RecentMovement[]) ?? [])
    setLoading(false)
  }

  // ─── Dados derivados (sem nova query) ───────────────────────────────────────

  const criticalItems = stock.filter(
    item => item.quantidade <= item.quantidade_minima
  )

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() + EXPIRY_WARNING_DAYS)
  const expiringItems = stock.filter(item => {
    if (!item.data_vencimento) return false
    return new Date(item.data_vencimento) <= cutoffDate
  })

  const kpis = {
    totalMedicamentos: stock.length,
    estoqueCritico: criticalItems.length,
    proximosVencimento: expiringItems.length,
  }

  // ─── Modal de alerta ─────────────────────────────────────────────────────────

  const alertConfig = {
    critical: {
      title: 'Estoque Crítico',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      headerBg: 'bg-red-50',
      headerBorder: 'border-red-100',
      titleColor: 'text-red-700',
      items: criticalItems,
      emptyMessage: 'Nenhum item em estoque crítico.',
      columns: ['Medicamento', 'Lote', 'Qtd. Atual', 'Qtd. Mínima'],
      renderRow: (item: StockItem) => (
        <>
          <td className="px-4 py-3">
            <p className="font-medium text-slate-900">
              {item.medicamentos?.nome ?? '—'}
            </p>
            <p className="text-xs text-slate-500">{item.medicamentos?.dosagem ?? '—'}</p>
          </td>
          <td className="px-4 py-3 text-slate-700">{item.lote}</td>
          <td className="px-4 py-3 font-semibold text-red-600">{item.quantidade}</td>
          <td className="px-4 py-3 text-slate-700">{item.quantidade_minima}</td>
        </>
      ),
    },
    expiring: {
      title: 'Próximos do Vencimento',
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      headerBg: 'bg-orange-50',
      headerBorder: 'border-orange-100',
      titleColor: 'text-orange-700',
      items: expiringItems,
      emptyMessage: 'Nenhum item próximo do vencimento.',
      columns: ['Medicamento', 'Lote', 'Quantidade', 'Vencimento'],
      renderRow: (item: StockItem) => {
        const daysLeft = item.data_vencimento
          ? Math.ceil(
              (new Date(item.data_vencimento).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null
        return (
          <>
            <td className="px-4 py-3">
              <p className="font-medium text-slate-900">
                {item.medicamentos?.nome ?? '—'}
              </p>
              <p className="text-xs text-slate-500">{item.medicamentos?.dosagem ?? '—'}</p>
            </td>
            <td className="px-4 py-3 text-slate-700">{item.lote}</td>
            <td className="px-4 py-3 text-slate-700">{item.quantidade}</td>
            <td className="px-4 py-3">
              <span className="font-medium text-orange-600">
                {item.data_vencimento
                  ? new Date(item.data_vencimento).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
              {daysLeft !== null && (
                <p className="text-xs text-orange-400">
                  {daysLeft <= 0 ? 'Vencido' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`}
                </p>
              )}
            </td>
          </>
        )
      },
    },
  }

  const activeAlert = selectedAlert ? alertConfig[selectedAlert] : null

  // Fecha ao clicar no backdrop (fora do painel)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setSelectedAlert(null)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-brand-50 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Visão geral dos indicadores da farmácia e controle rápido de estoque.
        </p>
      </div>

      {/* Cards de KPI */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total — informativo, sem clique */}
        <div className="cursor-default rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:scale-105 hover:border-blue-200 hover:shadow-lg">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            Total de Medicamentos
          </p>
          <p className="mt-4 text-3xl font-semibold text-blue-600">
            {loading ? '--' : kpis.totalMedicamentos}
          </p>
        </div>

        {/* Estoque Crítico — clicável */}
        <button
          type="button"
          onClick={() => !loading && setSelectedAlert('critical')}
          disabled={loading}
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:scale-105 hover:cursor-pointer hover:border-red-200 hover:shadow-lg disabled:cursor-default disabled:hover:scale-100 disabled:hover:shadow-sm text-left"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Estoque Crítico
            </p>
            <AlertTriangle className="h-4 w-4 text-red-300 transition group-hover:text-red-500" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-red-600">
            {loading ? '--' : kpis.estoqueCritico}
          </p>
          {!loading && kpis.estoqueCritico > 0 && (
            <p className="mt-2 text-xs text-red-400 opacity-0 transition group-hover:opacity-100">
              Clique para ver detalhes
            </p>
          )}
        </button>

        {/* Próximos do Vencimento — clicável */}
        <button
          type="button"
          onClick={() => !loading && setSelectedAlert('expiring')}
          disabled={loading}
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:scale-105 hover:cursor-pointer hover:border-orange-200 hover:shadow-lg disabled:cursor-default disabled:hover:scale-100 disabled:hover:shadow-sm text-left"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Próximos do Vencimento
            </p>
            <Clock className="h-4 w-4 text-orange-300 transition group-hover:text-orange-500" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-orange-600">
            {loading ? '--' : kpis.proximosVencimento}
          </p>
          {!loading && kpis.proximosVencimento > 0 && (
            <p className="mt-2 text-xs text-orange-400 opacity-0 transition group-hover:opacity-100">
              Clique para ver detalhes
            </p>
          )}
        </button>
      </div>

      {/* Movimentações Recentes */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Movimentações Recentes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-brand-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Medicamento</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentMovements.map((item) => (
                <tr key={item.id} className="bg-brand-50/60">
                  <td className="px-4 py-3">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}
                    {item.estoque?.medicamentos?.dosagem
                      ? ` — ${item.estoque.medicamentos.dosagem}`
                      : ''}
                  </td>
                  <td className="px-4 py-3">
                    {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </td>
                  <td className="px-4 py-3">{item.quantidade}</td>
                </tr>
              ))}
              {recentMovements.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes do alerta */}
      {activeAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label={activeAlert.title}
        >
          <div
            ref={modalRef}
            className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Cabeçalho do modal */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${activeAlert.headerBg} ${activeAlert.headerBorder}`}
            >
              <div className="flex items-center gap-2">
                {activeAlert.icon}
                <h3 className={`text-base font-semibold ${activeAlert.titleColor}`}>
                  {activeAlert.title}
                </h3>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${activeAlert.headerBg} ${activeAlert.titleColor} border ${activeAlert.headerBorder}`}
                >
                  {activeAlert.items.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabela de itens */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {activeAlert.items.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">
                  {activeAlert.emptyMessage}
                </p>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      {activeAlert.columns.map(col => (
                        <th key={col} className="px-4 py-2 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAlert.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        {activeAlert.renderRow(item)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-3xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Dashboard
