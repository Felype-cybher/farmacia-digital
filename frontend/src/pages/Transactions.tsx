import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MedicationCatalogItem {
  id: string
  nome: string
  dosagem: string
  tipo: string
}

// Lote disponível em estoque para a UBS + medicamento selecionado
interface AvailableLot {
  id: string
  lote: string
  quantidade: number
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

// ─── Componente ───────────────────────────────────────────────────────────────

function Transactions() {
  const { profile } = useAuth()
  // Recebe medicamento pré-selecionado vindo do fluxo pós-cadastro no Estoque
  const location = useLocation()
  const preselectedMedId = (location.state as { preselectedMedId?: string } | null)?.preselectedMedId ?? ''

  // Catálogo global de medicamentos
  const [catalog, setCatalog] = useState<MedicationCatalogItem[]>([])

  // Lotes disponíveis para o medicamento selecionado (apenas em saídas)
  const [availableLots, setAvailableLots] = useState<AvailableLot[]>([])
  const [loadingLots, setLoadingLots] = useState(false)

  // Histórico de movimentações da UBS
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Estado do formulário de movimentação
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    medicamento_id: preselectedMedId,
    quantidade: '',
    lote: '',
    data_vencimento: '',
  })

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile?.id_ubs) return
    loadCatalog()
    loadHistory()
  }, [profile?.id_ubs])

  // Quando tipo = 'saida' e medicamento_id muda, busca lotes disponíveis
  useEffect(() => {
    if (formData.tipo !== 'saida' || !formData.medicamento_id || !profile?.id_ubs) {
      setAvailableLots([])
      return
    }
    fetchAvailableLots(formData.medicamento_id)
  }, [formData.tipo, formData.medicamento_id])

  // ─── Funções de dados ───────────────────────────────────────────────────────

  const loadCatalog = async () => {
    // Apenas medicamentos ativos — inativos não aparecem em novas movimentações
    const { data, error } = await supabase
      .from('medicamentos')
      .select('id, nome, dosagem, tipo')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar catálogo de medicamentos:', error)
      return
    }
    setCatalog(data ?? [])
  }

  const loadHistory = async () => {
    if (!profile?.id_ubs) return
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

  // Busca lotes com saldo > 0 para o medicamento selecionado nesta UBS
  const fetchAvailableLots = async (medicamentoId: string) => {
    if (!profile?.id_ubs) return
    setLoadingLots(true)
    setFormData(prev => ({ ...prev, lote: '' }))

    const { data, error } = await supabase
      .from('estoque')
      .select('id, lote, quantidade')
      .eq('id_ubs', profile.id_ubs)
      .eq('id_medicamento', medicamentoId)
      .gt('quantidade', 0)
      .order('lote', { ascending: true })

    setLoadingLots(false)

    if (error) {
      console.error('Erro ao buscar lotes disponíveis:', error)
      setAvailableLots([])
      return
    }
    setAvailableLots(data ?? [])
  }

  // ─── Submit do formulário de movimentação ───────────────────────────────────

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile?.id_ubs) return

    setLoading(true)
    try {
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
        // P0001 = RAISE EXCEPTION do PostgreSQL (saldo insuficiente)
        if (error.code === 'P0001' || error.message.toLowerCase().includes('insuficiente')) {
          toast.error('Saldo insuficiente para o lote selecionado.')
        } else {
          toast.error('Erro ao processar movimentação.')
        }
        console.error('Erro ao processar movimentação:', error.code, error.message)
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
      setAvailableLots([])
      await loadHistory()
    } catch (err) {
      toast.error('Erro inesperado.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Movimentações</h2>
        <p className="mt-1 text-sm text-slate-500">
          Registre entradas e saídas de medicamentos no estoque.
        </p>
      </div>

      {/* Formulário de movimentação */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Registrar Movimentação
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value, lote: '' })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            {/* Medicamento */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Medicamento</label>
              <select
                value={formData.medicamento_id}
                onChange={(e) =>
                  setFormData({ ...formData, medicamento_id: e.target.value, lote: '' })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Quantidade</label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                required
                min="1"
              />
            </div>

            {/* Lote — input na entrada, select na saída */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Lote</label>
              {formData.tipo === 'saida' ? (
                <select
                  value={formData.lote}
                  onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                  required
                  disabled={loadingLots || !formData.medicamento_id}
                >
                  <option value="">
                    {loadingLots
                      ? 'Carregando lotes...'
                      : !formData.medicamento_id
                      ? 'Selecione um medicamento primeiro'
                      : availableLots.length === 0
                      ? 'Nenhum lote com saldo disponível'
                      : 'Selecione o lote'}
                  </option>
                  {availableLots.map((lot) => (
                    <option key={lot.id} value={lot.lote}>
                      {lot.lote} — {lot.quantidade} un.
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.lote}
                  onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  placeholder="Ex: LOTE2025A"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                />
              )}
            </div>

            {/* Data de vencimento — apenas na entrada */}
            {formData.tipo === 'entrada' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vencimento: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar Movimentação'}
          </button>
        </form>
      </div>

      {/* Histórico recente */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Histórico Recente</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Medicamento</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4 text-slate-900">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}
                    {item.estoque?.medicamentos?.dosagem
                      ? ` — ${item.estoque.medicamentos.dosagem}`
                      : ''}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                    {item.quantidade}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
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
