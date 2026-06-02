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

interface AvailableLot {
  id: string
  lote: string
  quantidade: number
}

interface HistoryItem {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  destino_saida: string | null
  nome_destino: string | null
  documento_destino: string | null
  telefone_destino: string | null
  motivo_descarte: string | null
  estoque: {
    medicamentos: { nome: string; dosagem: string } | null
  } | null
}

// ─── Classes reutilizáveis ────────────────────────────────────────────────────

const inputCls =
  'mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-500'

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

// ─── Componente ───────────────────────────────────────────────────────────────

function Transactions() {
  const { profile } = useAuth()
  const location = useLocation()
  const preselectedMedId = (location.state as { preselectedMedId?: string } | null)?.preselectedMedId ?? ''

  const [catalog, setCatalog] = useState<MedicationCatalogItem[]>([])
  const [availableLots, setAvailableLots] = useState<AvailableLot[]>([])
  const [loadingLots, setLoadingLots] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    medicamento_id: preselectedMedId,
    quantidade: '',
    lote: '',
    data_vencimento: '',
  })

  type DestinoSaida = '' | 'paciente' | 'uso_interno' | 'descarte'
  const [destinoSaida, setDestinoSaida] = useState<DestinoSaida>('')
  const [nomePaciente, setNomePaciente] = useState('')
  const [cpfSus, setCpfSus] = useState('')
  const [telefonePaciente, setTelefonePaciente] = useState('')
  const [funcionarioResponsavel, setFuncionarioResponsavel] = useState('')
  const [setorSala, setSetorSala] = useState('')
  const [motivoDescarte, setMotivoDescarte] = useState('')

  useEffect(() => {
    if (!profile?.id_ubs) return
    loadCatalog()
    loadHistory()
  }, [profile?.id_ubs])

  useEffect(() => {
    if (formData.tipo !== 'saida' || !formData.medicamento_id || !profile?.id_ubs) {
      setAvailableLots([])
      return
    }
    fetchAvailableLots(formData.medicamento_id)
  }, [formData.tipo, formData.medicamento_id])

  const loadCatalog = async () => {
    const { data, error } = await supabase
      .from('medicamentos')
      .select('id, nome, dosagem, tipo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) { console.error('Erro ao carregar catálogo:', error); return }
    setCatalog(data ?? [])
  }

  const loadHistory = async () => {
    if (!profile?.id_ubs) return
    const { data, error } = await supabase
      .from('historico')
      .select('id, created_at, tipo, quantidade, destino_saida, nome_destino, documento_destino, telefone_destino, motivo_descarte, estoque(medicamentos(nome, dosagem))')
      .eq('id_ubs', profile.id_ubs)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) { console.error('Erro ao carregar histórico:', error); return }
    setHistory((data as unknown as HistoryItem[]) ?? [])
  }

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
    if (error) { console.error('Erro ao buscar lotes:', error); setAvailableLots([]); return }
    setAvailableLots(data ?? [])
  }

  const resetSaidaFields = () => {
    setDestinoSaida('')
    setNomePaciente('')
    setCpfSus('')
    setTelefonePaciente('')
    setFuncionarioResponsavel('')
    setSetorSala('')
    setMotivoDescarte('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile?.id_ubs) return
    setLoading(true)
    try {
      const nomeDestino =
        destinoSaida === 'paciente'
          ? nomePaciente || null
          : destinoSaida === 'uso_interno'
          ? [funcionarioResponsavel, setorSala].filter(Boolean).join(' (') + (setorSala ? ')' : '')
          : null

      const params = {
        p_medicamento_id:  formData.medicamento_id,
        p_ubs_id:          profile.id_ubs,
        p_tipo:            formData.tipo,
        p_quantidade:      parseInt(formData.quantidade, 10),
        p_lote:            formData.lote            || null,
        p_vencimento:      formData.data_vencimento || null,
        p_destino_saida:   formData.tipo === 'saida' ? (destinoSaida   || null) : null,
        p_nome_destino:    formData.tipo === 'saida' ? (nomeDestino     || null) : null,
        p_documento:       formData.tipo === 'saida' && destinoSaida === 'paciente'  ? (cpfSus            || null) : null,
        p_telefone:        formData.tipo === 'saida' && destinoSaida === 'paciente'  ? (telefonePaciente  || null) : null,
        p_motivo_descarte: formData.tipo === 'saida' && destinoSaida === 'descarte'  ? (motivoDescarte    || null) : null,
      }

      const { error } = await supabase.rpc('process_movement', params)
      if (error) {
        if (error.code === 'P0001' || error.message.toLowerCase().includes('insuficiente')) {
          toast.error('Saldo insuficiente para o lote selecionado.')
        } else {
          toast.error('Erro ao processar movimentação.')
        }
        console.error('[handleSubmit] Erro no RPC:', error.code, error.message)
        return
      }

      toast.success('Movimentação registrada com sucesso!')
      setFormData({ tipo: 'entrada', medicamento_id: '', quantidade: '', lote: '', data_vencimento: '' })
      setAvailableLots([])
      resetSaidaFields()
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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Movimentações</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Registre entradas e saídas de medicamentos no estoque.
        </p>
      </div>

      {/* Formulário */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Registrar Movimentação
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Tipo */}
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => {
                  setFormData({ ...formData, tipo: e.target.value, lote: '' })
                  resetSaidaFields()
                }}
                className={inputCls}
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            {/* Medicamento */}
            <div>
              <label className={labelCls}>Medicamento</label>
              <select
                value={formData.medicamento_id}
                onChange={(e) => setFormData({ ...formData, medicamento_id: e.target.value, lote: '' })}
                className={inputCls}
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
              <label className={labelCls}>Quantidade</label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                className={inputCls}
                required
                min="1"
              />
            </div>

            {/* Lote */}
            <div>
              <label className={labelCls}>Lote</label>
              {formData.tipo === 'saida' ? (
                <select
                  value={formData.lote}
                  onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  className={`${inputCls} disabled:opacity-50`}
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
                  className={inputCls}
                  required
                />
              )}
            </div>

            {/* ── Campos condicionais de Saída ── */}
            {formData.tipo === 'saida' && (
              <>
                <div className="md:col-span-2">
                  <label className={labelCls}>Destino da Saída</label>
                  <select
                    value={destinoSaida}
                    onChange={(e) => {
                      setDestinoSaida(e.target.value as DestinoSaida)
                      setNomePaciente(''); setCpfSus(''); setTelefonePaciente('')
                      setFuncionarioResponsavel(''); setSetorSala(''); setMotivoDescarte('')
                    }}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecione o destino</option>
                    <option value="paciente">Paciente</option>
                    <option value="uso_interno">Uso Interno</option>
                    <option value="descarte">Descarte</option>
                  </select>
                </div>

                {destinoSaida === 'paciente' && (
                  <>
                    <div>
                      <label className={labelCls}>Nome do Paciente</label>
                      <input type="text" value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} placeholder="Nome completo" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>CPF ou Cartão SUS</label>
                      <input type="text" value={cpfSus} onChange={(e) => setCpfSus(e.target.value)} placeholder="000.000.000-00 ou nº do cartão" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Telefone</label>
                      <input type="text" value={telefonePaciente} onChange={(e) => setTelefonePaciente(e.target.value)} placeholder="(99) 99999-9999" className={inputCls} />
                    </div>
                  </>
                )}

                {destinoSaida === 'uso_interno' && (
                  <>
                    <div>
                      <label className={labelCls}>Funcionário Responsável</label>
                      <input type="text" value={funcionarioResponsavel} onChange={(e) => setFuncionarioResponsavel(e.target.value)} placeholder="Nome do funcionário" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Setor / Sala</label>
                      <input type="text" value={setorSala} onChange={(e) => setSetorSala(e.target.value)} placeholder="Ex: Enfermaria, Sala 3" className={inputCls} required />
                    </div>
                  </>
                )}

                {destinoSaida === 'descarte' && (
                  <div className="md:col-span-2">
                    <label className={labelCls}>Motivo do Descarte</label>
                    <textarea
                      value={motivoDescarte}
                      onChange={(e) => setMotivoDescarte(e.target.value)}
                      placeholder="Ex: Medicamento Vencido, Avaria..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* Data de vencimento — apenas na entrada */}
            {formData.tipo === 'entrada' && (
              <div>
                <label className={labelCls}>Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  className={inputCls}
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
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Histórico Recente</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-700">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Medicamento</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Quantidade</th>
                <th className="px-5 py-3.5">Destino / Beneficiário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-700/40">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4 text-slate-900 dark:text-slate-100">
                    {item.estoque?.medicamentos?.nome ?? 'Medicamento não encontrado'}
                    {item.estoque?.medicamentos?.dosagem ? ` — ${item.estoque.medicamentos.dosagem}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {item.quantidade}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {item.tipo === 'entrada' ? (
                      <span className="text-slate-400 dark:text-slate-500">Abastecimento</span>
                    ) : item.destino_saida === 'paciente' ? (
                      <span>Paciente: {item.nome_destino ?? '—'}</span>
                    ) : item.destino_saida === 'uso_interno' ? (
                      <span>Uso Interno: {item.nome_destino ?? '—'}</span>
                    ) : item.destino_saida === 'descarte' ? (
                      <span>Descarte: {item.motivo_descarte ?? '—'}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
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
