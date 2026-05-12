import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'

// Supabase retorna medicamentos como objeto único (FK muitos-para-um)
interface HistoryItem {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    medicamentos: { nome: string; dosagem: string; tipo: string } | null
  } | null
}

function Reports() {
  const { profile } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (!profile?.id_ubs) return

    const loadHistory = async () => {
      setLoading(true)
      let query = supabase
        .from('historico')
        .select('id, created_at, tipo, quantidade, estoque(medicamentos(nome, dosagem, tipo))')
        .eq('id_ubs', profile.id_ubs)
        .order('created_at', { ascending: false })

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao carregar histórico:', error)
        return
      }

      setHistory(data || [])
      setLoading(false)
    }

    loadHistory()
  }, [profile?.id_ubs, filters])

  const exportToCSV = () => {
    const headers = ['Data', 'Medicamento', 'Tipo', 'Quantidade']
    const rows = history.map(item => [
      new Date(item.created_at).toLocaleDateString('pt-BR'),
      `${item.estoque?.medicamentos?.nome ?? 'N/A'} - ${item.estoque?.medicamentos?.dosagem ?? ''}`,
      item.tipo === 'entrada' ? 'Entrada' : 'Saída',
      item.quantidade.toString(),
    ])

    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'historico_movimentacoes.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-brand-50 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Relatórios</h2>
        <p className="mt-2 text-slate-600">
          Histórico completo de movimentações com filtros e exportação.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Data Início</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Data Fim</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={history.length === 0}
              className="w-full rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Exportar CSV (Beta)
            </button>
          </div>
        </div>

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
              {history.map((item) => (
                <tr key={item.id} className="bg-brand-50/60">
                  <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}{item.estoque?.medicamentos?.dosagem ? ` - ${item.estoque.medicamentos.dosagem}` : ''}
                  </td>
                  <td className="px-4 py-3">{item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
                  <td className="px-4 py-3">{item.quantidade}</td>
                </tr>
              ))}
              {history.length === 0 && !loading && (
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

export default Reports
