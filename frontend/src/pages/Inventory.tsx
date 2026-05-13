import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, AlertCircle, Plus, X, Pencil, Trash2, Eye, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Medicamento do catálogo com campo ativo para soft delete
interface MedicationInfo {
  id: string
  nome: string
  dosagem: string
  tipo: string
  ativo: boolean
}

// Item de estoque com join para medicamentos
interface StockItem {
  id: string
  lote: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  id_ubs: string
  id_medicamento: string
  medicamentos: MedicationInfo | null
}

// Formulário de edição/criação de medicamento
interface MedForm {
  nome: string
  dosagem: string
  tipo: string
}

// Modal de confirmação de inativação
interface DeactivateTarget {
  medicamentoId: string
  nome: string
}

// Item de estoque selecionado para visualizar histórico
interface HistoryTarget {
  estoqueId: string
  medicamentoNome: string
  lote: string
}

// Linha do histórico de movimentações
interface HistoryEntry {
  id: string
  created_at: string
  tipo: string
  quantidade: number
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Inventory() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [inventory, setInventory] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)
  const [createForm, setCreateForm] = useState<MedForm>({ nome: '', dosagem: '', tipo: '' })

  // Modal de edição
  const [editTarget, setEditTarget] = useState<MedicationInfo | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState<MedForm>({ nome: '', dosagem: '', tipo: '' })

  // Modal de confirmação de inativação
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null)
  const [savingDeactivate, setSavingDeactivate] = useState(false)

  // Toast de "Deseja registrar entrada?" após cadastro
  const [newMedId, setNewMedId] = useState<string | null>(null)
  const [newMedNome, setNewMedNome] = useState<string>('')

  const createModalRef = useRef<HTMLDivElement>(null)
  const editModalRef = useRef<HTMLDivElement>(null)
  const deactivateModalRef = useRef<HTMLDivElement>(null)
  const historyModalRef = useRef<HTMLDivElement>(null)

  // Modal de histórico de movimentações
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ─── Carga de dados ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile?.id_ubs) { setInventory([]); return }
    loadInventory()
  }, [profile?.id_ubs])

  // Fecha modais com Escape — ordem de prioridade: mais recente primeiro
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (historyTarget)    { closeHistoryModal(); return }
      if (deactivateTarget) { setDeactivateTarget(null); return }
      if (editTarget)       { closeEditModal(); return }
      if (showCreateModal)  { closeCreateModal(); return }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showCreateModal, editTarget, deactivateTarget, historyTarget])

  const loadInventory = async () => {
    if (!profile?.id_ubs) return
    setLoading(true)
    const { data, error } = await supabase
      .from('estoque')
      .select('id, lote, quantidade, quantidade_minima, data_vencimento, id_ubs, id_medicamento, medicamentos(id, nome, dosagem, tipo, ativo)')
      .eq('id_ubs', profile.id_ubs)
      .order('id', { ascending: true })

    setLoading(false)
    if (error) {
      console.error('Erro na busca de estoque:', error)
      setInventory([])
      return
    }
    setInventory((data ?? []) as StockItem[])
  }

  // ─── Filtro de busca ─────────────────────────────────────────────────────────

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) =>
        (item.medicamentos?.nome ?? '')
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      ),
    [inventory, searchTerm],
  )

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // Retorna diferença em dias entre hoje e a data de vencimento.
  // Negativo = já vencido. null = sem data cadastrada.
  const getDaysToExpiry = (date: string | null): number | null => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  }

  const handleBackdropClick = (
    e: React.MouseEvent,
    ref: React.RefObject<HTMLDivElement | null>,
    onClose: () => void,
  ) => {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose()
  }

  // ─── Modal Criar ─────────────────────────────────────────────────────────────

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateForm({ nome: '', dosagem: '', tipo: '' })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCreate(true)
    try {
      // ativo = true por padrão no banco; id gerado automaticamente (uuid)
      const { data, error } = await supabase
        .from('medicamentos')
        .insert({
          nome: createForm.nome.trim(),
          dosagem: createForm.dosagem.trim(),
          tipo: createForm.tipo.trim(),
        })
        .select('id, nome')
        .single()

      if (error) {
        toast.error('Erro ao cadastrar medicamento.')
        console.error('Erro ao cadastrar medicamento:', error.code, error.message)
        return
      }

      closeCreateModal()
      await loadInventory()

      // Guarda o novo medicamento para o prompt de "registrar entrada"
      setNewMedId(data.id)
      setNewMedNome(data.nome)
    } catch (err) {
      toast.error('Erro inesperado.')
      console.error(err)
    } finally {
      setSavingCreate(false)
    }
  }

  // ─── Prompt pós-cadastro: "Deseja registrar uma entrada?" ────────────────────

  // Exibido como toast customizado com dois botões
  useEffect(() => {
    if (!newMedId) return

    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-900">
            <span className="text-blue-600">{newMedNome}</span> cadastrado com sucesso!
          </p>
          <p className="text-xs text-slate-500">
            Deseja registrar uma entrada para ele agora?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                // Navega para Movimentações passando o id via location.state
                navigate('/transactions', { state: { preselectedMedId: newMedId } })
                setNewMedId(null)
              }}
              className="flex-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Sim, registrar
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); setNewMedId(null) }}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Agora não
            </button>
          </div>
        </div>
      ),
      { duration: 8000, style: { maxWidth: '320px' } },
    )
  }, [newMedId])

  // ─── Modal Editar ─────────────────────────────────────────────────────────────

  const openEditModal = (med: MedicationInfo) => {
    setEditTarget(med)
    setEditForm({ nome: med.nome, dosagem: med.dosagem, tipo: med.tipo })
  }

  const closeEditModal = () => {
    setEditTarget(null)
    setEditForm({ nome: '', dosagem: '', tipo: '' })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('medicamentos')
        .update({
          nome: editForm.nome.trim(),
          dosagem: editForm.dosagem.trim(),
          tipo: editForm.tipo.trim(),
        })
        .eq('id', editTarget.id)  // editTarget.id = id do medicamento (não do estoque)

      if (error) {
        toast.error('Erro ao atualizar medicamento.')
        console.error('Erro ao atualizar medicamento:', error.code, error.message)
        return
      }

      // Atualiza estado local imediatamente — sem round-trip ao banco
      const updatedMed: MedicationInfo = {
        ...editTarget,
        nome: editForm.nome.trim(),
        dosagem: editForm.dosagem.trim(),
        tipo: editForm.tipo.trim(),
      }
      setInventory(prev =>
        prev.map(item =>
          item.id_medicamento === editTarget.id
            ? { ...item, medicamentos: updatedMed }
            : item
        )
      )

      toast.success('Medicamento atualizado com sucesso!')
      closeEditModal()
    } catch (err) {
      toast.error('Erro inesperado.')
      console.error(err)
    } finally {
      setSavingEdit(false)
    }
  }

  // ─── Modal Inativar ───────────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setSavingDeactivate(true)
    try {
      const { error } = await supabase
        .from('medicamentos')
        .update({ ativo: false })
        .eq('id', deactivateTarget.medicamentoId)

      if (error) {
        toast.error('Erro ao inativar medicamento.')
        console.error('Erro ao inativar medicamento:', error.code, error.message)
        return
      }

      // Atualiza estado local imediatamente — reflete ativo: false sem round-trip
      setInventory(prev =>
        prev.map(item =>
          item.id_medicamento === deactivateTarget.medicamentoId
            ? {
                ...item,
                medicamentos: item.medicamentos
                  ? { ...item.medicamentos, ativo: false }
                  : null,
              }
            : item
        )
      )

      toast.success(`${deactivateTarget.nome} inativado. Histórico preservado.`)
      setDeactivateTarget(null)
    } catch (err) {
      toast.error('Erro inesperado.')
      console.error(err)
    } finally {
      setSavingDeactivate(false)
    }
  }

  // ─── Modal Histórico ─────────────────────────────────────────────────────────

  const openHistoryModal = async (item: StockItem) => {
    if (!item.medicamentos) return

    setHistoryTarget({
      estoqueId: item.id,
      medicamentoNome: item.medicamentos.nome,
      lote: item.lote,
    })
    setHistoryEntries([])
    setLoadingHistory(true)

    // Filtra pelo id da linha de estoque — identifica unicamente medicamento + lote + UBS
    const { data, error } = await supabase
      .from('historico')
      .select('id, created_at, tipo, quantidade')
      .eq('id_estoque', item.id)
      .order('created_at', { ascending: false })

    setLoadingHistory(false)

    if (error) {
      console.error('Erro ao carregar histórico do lote:', error.code, error.message)
      return
    }

    setHistoryEntries(data ?? [])
  }

  const closeHistoryModal = () => {
    setHistoryTarget(null)
    setHistoryEntries([])
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Estoque</h2>
            <p className="mt-1 text-sm text-slate-500">
              Controle os medicamentos da UBS e acompanhe vencimento e níveis mínimos.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar medicamento"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Novo Medicamento
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de estoque */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-500">Carregando estoque...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Medicamento</th>
                  <th className="px-5 py-3.5">Lote</th>
                  <th className="px-5 py-3.5">Quantidade</th>
                  <th className="px-5 py-3.5">Validade</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const daysToExpiry = getDaysToExpiry(item.data_vencimento)
                  const isCritical   = item.quantidade <= item.quantidade_minima
                  const isExpired    = daysToExpiry !== null && daysToExpiry <= 0
                  const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30
                  const hasAlert     = isCritical || isExpiringSoon || isExpired
                  const isInactive   = item.medicamentos?.ativo === false

                  return (
                    <tr
                      key={item.id}
                      className={
                        isInactive
                          ? 'opacity-50 grayscale pointer-events-none select-none'
                          : 'transition-all duration-150 hover:bg-blue-50/40'
                      }
                    >
                      {/* ── Medicamento ── */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-2">
                          {hasAlert && !isInactive && (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.medicamentos?.nome ?? 'Medicamento não encontrado'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.medicamentos?.dosagem ?? '—'} • {item.medicamentos?.tipo ?? '—'}
                            </p>
                            {isInactive && (
                              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                Inativo
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ── Lote ── */}
                      <td className="whitespace-nowrap px-5 py-4 align-top text-slate-600">
                        {item.lote}
                      </td>

                      {/* ── Quantidade — badge + subtexto ── */}
                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isCritical
                                ? 'bg-red-50 text-red-600'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {item.quantidade} un.
                          </span>
                          {isCritical && (
                            <span className="text-xs text-red-500">
                              Abaixo do mínimo ({item.quantidade_minima} un.)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ── Validade — data + subtexto ── */}
                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        {item.data_vencimento ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`text-sm font-medium ${
                                isExpired
                                  ? 'font-bold text-red-600'
                                  : isExpiringSoon
                                  ? 'text-orange-500'
                                  : 'text-slate-700'
                              }`}
                            >
                              {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
                            </span>
                            {isExpired && (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                ⚠️ Lote Vencido
                              </span>
                            )}
                            {isExpiringSoon && (
                              <span className="inline-flex w-fit rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                                &lt; {daysToExpiry} dias
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Sem data</span>
                        )}
                      </td>

                      {/* ── Ações: histórico + editar + inativar ── */}
                      <td className="whitespace-nowrap px-5 py-4 align-top text-right">
                        {item.medicamentos && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="Ver histórico do lote"
                              onClick={() => openHistoryModal(item)}
                              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Ver histórico do lote"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar medicamento"
                              onClick={() => openEditModal(item.medicamentos!)}
                              className="rounded-xl p-2 text-blue-500 transition-all hover:bg-blue-50 hover:text-blue-700"
                              aria-label="Editar medicamento"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {item.medicamentos.ativo !== false && (
                              <button
                                type="button"
                                title="Inativar medicamento"
                                onClick={() =>
                                  setDeactivateTarget({
                                    medicamentoId: item.medicamentos!.id,
                                    nome: item.medicamentos!.nome,
                                  })
                                }
                                className="rounded-xl p-2 text-red-400 transition-all hover:bg-red-50 hover:text-red-600"
                                aria-label="Inativar medicamento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                      Nenhum medicamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Novo Medicamento ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => handleBackdropClick(e, createModalRef, closeCreateModal)}
          role="dialog"
          aria-modal="true"
          aria-label="Cadastrar novo medicamento"
        >
          <div ref={createModalRef} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Novo Medicamento</h3>
              <button type="button" onClick={closeCreateModal} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <MedFormFields form={createForm} onChange={setCreateForm} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeCreateModal} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={savingCreate} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {savingCreate ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Medicamento ── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => handleBackdropClick(e, editModalRef, closeEditModal)}
          role="dialog"
          aria-modal="true"
          aria-label="Editar medicamento"
        >
          <div ref={editModalRef} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-500" />
                <h3 className="text-base font-semibold text-slate-900">Editar Medicamento</h3>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4 p-6">
              <MedFormFields form={editForm} onChange={setEditForm} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeEditModal} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={savingEdit} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Inativação ── */}
      {deactivateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => handleBackdropClick(e, deactivateModalRef, () => setDeactivateTarget(null))}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar inativação"
        >
          <div ref={deactivateModalRef} className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-red-50 bg-red-50 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-red-700">Inativar Medicamento</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700">
                Deseja realmente inativar{' '}
                <span className="font-semibold text-slate-900">{deactivateTarget.nome}</span>?
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Ele não aparecerá mais em novas movimentações, mas o histórico será preservado.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={savingDeactivate}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingDeactivate ? 'Inativando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal: Histórico de Movimentações ── */}
      {historyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => handleBackdropClick(e, historyModalRef, closeHistoryModal)}
          role="dialog"
          aria-modal="true"
          aria-label="Histórico de movimentações do lote"
        >
          <div
            ref={historyModalRef}
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{ maxHeight: '85vh' }}
          >
            {/* Cabeçalho */}
            <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Histórico de Movimentações
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{historyTarget.medicamentoNome}</span>
                    {' · '}Lote{' '}
                    <span className="font-mono font-medium text-slate-700">{historyTarget.lote}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo — tabela com scroll */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-slate-500">Carregando histórico...</p>
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ClipboardList className="h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">
                    Nenhuma movimentação registrada para este lote.
                  </p>
                  <p className="text-xs text-slate-400">
                    As entradas e saídas aparecerão aqui após a primeira movimentação.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Tipo</th>
                      <th className="px-6 py-3">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyEntries.map((entry) => (
                      <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">
                          {new Date(entry.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              entry.tipo === 'entrada'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5 font-semibold text-slate-900">
                          {entry.tipo === 'entrada' ? '+' : '−'}{entry.quantidade} un.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-3">
              <p className="text-xs text-slate-400">
                {historyEntries.length > 0
                  ? `${historyEntries.length} registro${historyEntries.length !== 1 ? 's' : ''} encontrado${historyEntries.length !== 1 ? 's' : ''}`
                  : ''}
              </p>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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

// ─── Subcomponente: campos reutilizados nos dois modais de formulário ─────────

interface MedFormFieldsProps {
  form: { nome: string; dosagem: string; tipo: string }
  onChange: (form: { nome: string; dosagem: string; tipo: string }) => void
}

function MedFormFields({ form, onChange }: MedFormFieldsProps) {
  const inputClass =
    'mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700">Nome</label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => onChange({ ...form, nome: e.target.value })}
          placeholder="Ex: Dipirona"
          className={inputClass}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Dosagem</label>
        <input
          type="text"
          value={form.dosagem}
          onChange={(e) => onChange({ ...form, dosagem: e.target.value })}
          placeholder="Ex: 500mg"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Tipo</label>
        <input
          type="text"
          value={form.tipo}
          onChange={(e) => onChange({ ...form, tipo: e.target.value })}
          placeholder="Ex: Comprimido, Xarope, Injetável"
          className={inputClass}
          required
        />
      </div>
    </>
  )
}

export default Inventory
