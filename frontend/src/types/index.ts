export interface UserProfile {
  id?: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface Profile {
  id: string
  full_name: string
  id_ubs: number
}

export interface Medicine {
  id: number | string
  nome: string
  dosagem: string
  tipo: string
  ativo?: boolean
}

export interface StockItemInterface {
  id: number | string
  id_medicamento: number | string
  lote: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  id_ubs: number
  // Supabase retorna como objeto único (FK N:1), não array
  medicamentos: Medicine | null
}
