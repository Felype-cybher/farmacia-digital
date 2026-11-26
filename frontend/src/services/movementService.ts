import { supabase } from "@/lib/supabase";

export type MovementParams = {
  p_medicamento_id: number;
  p_ubs_id: number;
  p_tipo: string;
  p_quantidade: number;
  p_lote: string | null;
  p_vencimento: string | null;
  p_destino_saida: string | null;
  p_nome_destino: string | null;
  p_documento: string | null;
  p_telefone: string | null;
  p_motivo_descarte: string | null;
  p_crm_medico: string | null;
  p_cpf_paciente: string | null;
  p_id_estoque: number | null;
};

export const processMovement = async (params: MovementParams) => {
  const { error } = await supabase.rpc("process_movement", params);

  if (error) {
    return { success: false as const, error };
  }

  return { success: true as const, error: null };
};
