import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'

// Catálogo global de medicamentos (tabela medicamentos)
interface MedicationCatalogItem {
  id: string
  nome: string
  dosagem: string
  tipo: string
}

// Supabase retorna medicamentos como objeto único (FK muitos-para-um)
interface HistoryItem {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  estoque: {
    medicamentos: { nome: string; dosagem: string } | null
  } | null
}

function Transactions() {
  const { profile } = useAuth()
  const [catalog, setCatalog] = useState<MedicationCatalogItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    medicamento_id: '',
    quantidade: '',
    lote: '',
    data_vencimento: '',
  })

  // Carrega o catálogo completo de medicamentos e o histórico da UBS
  useEffect(() => {
    if (!profile?.id_ubs) return

    const loadCatalog = async () => {
      // Busca o catálogo global — não filtra por UBS, pois medicamentos são compartilhados
      const { data, error } = await supabase
        .from('medicamentos')
        .select('id, nome, dosagem, tipo')
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao carregar catálogo de medicamentos:', error)
        return
      }

      setCatalog(data ?? [])
    }

    const loadHistory = async () => {
      // Caminho: historico → estoque → medicamentos (objeto único, N:1)
      const { data, error } = await supabase
        .from('historico')
        .select('id, created_at, tipo, quantidade, estoque(medicamentos(nome, dosagem))')
        .eq('id_ubs', profile.id_ubs)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Erro ao carregar histórico:', error)
        return
      }

      setHistory(data ?? [])
    }

    loadCatalog()
    loadHistory()
  }, [profile?.id_ubs])

  const reloadHistory = async () => {
    if (!profile?.id_ubs) return
    const { data } = await supabase
      .from('historico')
      .select('id, created_at, tipo, quantidade, estoque(medicamentos(nome, dosagem))')
      .eq('id_ubs', profile.id_ubs)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data ?? [])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile?.id_ubs) return

    setLoading(true)
    try {
      // RPC recebe p_medicamento_id + p_ubs_id (não mais p_estoque_id)
      const params = {
        p_medicamento_id: formData.medicamento_id,
        p_ubs_id: profile.id_ubs,
        p_tipo: formData.tipo,
        p_quantidade: parseInt(formData.quantidade, 10),
        p_lote: formData.lote || null,
        p_vencimento: formData.data_vencimento || null,
      }

      const { error } = await supabase.rpc('process_movement', params)

      if (error) {
        if (error.message.includes('Estoque insuficiente')) {
          toast.error('Estoque insuficiente para esta saída.')
        } else {
          toast.error('Erro ao processar movimentação.')
        }
        console.error('Erro ao processar movimentação:', error)
        return
      }

      toast.success('Movimentação registrada com sucesso!')
      setFormData({
        tipo: 'entrada',
        medicamento_id: '',
        quantidade: '',
        lote: '',
        data_vencimento: '',
      })

      await reloadHistory()
    } catch (err) {
      toast.error('Erro inesperado.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />
      <div className="rounded-3xl border border-slate-200 bg-brand-50 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Movimentações</h2>
        <p className="mt-2 text-slate-600">
          Registre entradas e saídas de medicamentos no estoque.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Registrar Movimentação</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Medicamento</label>
              <select
                value={formData.medicamento_id}
                onChange={(e) => setFormData({ ...formData, medicamento_id: e.target.value })}
                className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                required
              >
                <option value="">Selecione um medicamento</option>
                {catalog.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.nome} — {med.dosagem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Quantidade</label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                required
                min="1"
              />
            </div>

            {formData.tipo === 'entrada' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Lote</label>
                  <input
                    type="text"
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Data de Vencimento</label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="mt-1 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar Movimentação'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Histórico Recente</h3>
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
                  <td className="px-4 py-3">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}
                    {item.estoque?.medicamentos?.dosagem ? ` — ${item.estoque.medicamentos.dosagem}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </td>
                  <td className="px-4 py-3">{item.quantidade}</td>
                </tr>
              ))}
              {history.length === 0 && (
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

export default Transactions
