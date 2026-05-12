export interface UserProfile {
  id?: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface Profile {
  id: string
  full_name: string
  id_ubs: string
}

export interface Medicine {
  id: string
  nome: string
  dosagem: string
  tipo: string
}

export interface StockItemInterface {
  id: string
  id_medicamento: string
  lote: string
  quantidade: number
  quantidade_minima: number
  data_vencimento: string | null
  id_ubs: string
  // Supabase retorna como objeto único (FK N:1), não array
  medicamentos: Medicine | null
}
