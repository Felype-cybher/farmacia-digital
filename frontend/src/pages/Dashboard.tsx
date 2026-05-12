import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'

// Supabase retorna medicamentos como objeto único (FK muitos-para-um)
interface RecentMovement {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    medicamentos: {
      nome: string
      dosagem: string
    } | null
  } | null
}

function Dashboard() {
  const { profile } = useAuth()
  const [kpis, setKpis] = useState({
    totalMedicamentos: 0,
    estoqueCritico: 0,
    proximosVencimento: 0,
  })
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id_ubs) return

    const loadDashboardData = async () => {
      setLoading(true)

      // Busca todos os itens de estoque da UBS — sem join com medicamentos,
      // pois os KPIs são calculados sobre as linhas de estoque, não o catálogo global
      const { data: allStock, error: stockError } = await supabase
        .from('estoque')
        .select('id, quantidade, quantidade_minima, data_vencimento')
        .eq('id_ubs', profile.id_ubs)

      if (stockError) {
        console.error('Erro ao carregar estoque para KPIs:', stockError)
        setLoading(false)
        return
      }

      const stock = allStock ?? []

      // Total de itens de estoque cadastrados para esta UBS
      const totalMedicamentos = stock.length

      // Estoque crítico: quantidade atual abaixo ou igual ao mínimo configurado
      const estoqueCritico = stock.filter(
        item => item.quantidade <= item.quantidade_minima
      ).length

      // Próximos do vencimento: vence nos próximos 30 dias
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + 30)
      const proximosVencimento = stock.filter(item => {
        if (!item.data_vencimento) return false
        return new Date(item.data_vencimento) <= cutoffDate
      }).length

      // Movimentações recentes — caminho: historico → estoque → medicamentos (objeto único, N:1)
      const { data: movements, error: movError } = await supabase
        .from('historico')
        .select('id, tipo, quantidade, created_at, estoque(medicamentos(nome, dosagem))')
        .eq('id_ubs', profile.id_ubs)
        .order('created_at', { ascending: false })
        .limit(5)

      if (movError) {
        console.error('Erro ao carregar movimentações recentes [PGRST]:', movError.code, movError.message)
      }

      setKpis({ totalMedicamentos, estoqueCritico, proximosVencimento })
      setRecentMovements(movements ?? [])
      setLoading(false)
    }

    loadDashboardData()
  }, [profile?.id_ubs])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-brand-50 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Visão geral dos indicadores da farmácia e controle rápido de estoque.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total de Medicamentos</p>
          <p className="mt-4 text-3xl font-semibold text-brand-700">
            {loading ? '--' : kpis.totalMedicamentos}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Estoque Crítico</p>
          <p className="mt-4 text-3xl font-semibold text-red-600">
            {loading ? '--' : kpis.estoqueCritico}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Próximos do Vencimento</p>
          <p className="mt-4 text-3xl font-semibold text-orange-600">
            {loading ? '--' : kpis.proximosVencimento}
          </p>
        </div>
      </div>

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
                  <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}{item.estoque?.medicamentos?.dosagem ? ` - ${item.estoque.medicamentos.dosagem}` : ''}
                  </td>
                  <td className="px-4 py-3">{item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
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
    </section>
  )
}

export default Dashboard
