import { useEffect, useMemo, useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../context/AuthContext'

interface MedicationInfo {
  nome: string
  dosagem: string
  tipo: string
}

// Supabase retorna medicamentos como objeto único (FK muitos-para-um via id_medicamento)
interface StockItem {
  id: string
  lote: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  id_ubs: string
  medicamentos: MedicationInfo | null
}

function Inventory() {
  const { profile } = useAuth()
  const [inventory, setInventory] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile?.id_ubs) {
      setInventory([])
      return
    }

    const loadInventory = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('estoque')
        .select(
          'id, lote, quantidade, quantidade_minima, data_vencimento, id_ubs, medicamentos(nome, dosagem, tipo)'
        )
        .eq('id_ubs', profile.id_ubs)

      setLoading(false)

      if (error) {
        console.error('Erro na busca de estoque:', error)
        setInventory([])
        return
      }

      setInventory(data ?? [])
    }

    loadInventory()
  }, [profile?.id_ubs])

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) =>
        item.medicamentos?.nome
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      ),
    [inventory, searchTerm],
  )

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false
    const currentDate = new Date()
    const expiryDate = new Date(expirationDate)
    const diffTime = expiryDate.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-brand-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Estoque</h2>
            <p className="mt-2 text-slate-600">
              Controle os medicamentos da UBS e acompanhe vencimento e níveis mínimos.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 text-brand-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar medicamento"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-brand-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Medicamento</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map((item) => {
                const quantityAlert = item.quantidade <= item.quantidade_minima
                const expirationAlert = isExpiringSoon(item.data_vencimento)
                return (
                  <tr key={item.id} className="transition hover:bg-brand-50/50">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {item.medicamentos?.nome ?? 'Medicamento não encontrado'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.medicamentos?.dosagem ?? '—'} • {item.medicamentos?.tipo ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{item.lote}</td>
                    <td
                      className={`px-4 py-4 align-top font-semibold ${
                        quantityAlert ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {item.quantidade}
                      {quantityAlert && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Crítico
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{item.quantidade_minima}</td>
                    <td
                      className={`px-4 py-4 align-top ${
                        expirationAlert ? 'text-orange-600' : 'text-slate-700'
                      }`}
                    >
                      {item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : 'Sem data'}
                      {expirationAlert && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                          Vence em menos de 30 dias
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum medicamento encontrado para o filtro atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default Inventory
