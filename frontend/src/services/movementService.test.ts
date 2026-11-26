import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import { processMovement, type MovementParams } from "./movementService";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const movementParams: MovementParams = {
  p_medicamento_id: 10,
  p_ubs_id: 1,
  p_tipo: "entrada",
  p_quantidade: 5,
  p_lote: "LOTE-TESTE",
  p_vencimento: "2030-12-31",
  p_destino_saida: null,
  p_nome_destino: null,
  p_documento: null,
  p_telefone: null,
  p_motivo_descarte: null,
  p_crm_medico: null,
  p_cpf_paciente: null,
  p_id_estoque: null,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("processMovement", () => {
  it("retorna sucesso quando a movimentação é registrada", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as never);

    const result = await processMovement(movementParams);

    expect(result).toEqual({ success: true, error: null });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "process_movement",
      movementParams,
    );
  });

  it("retorna o erro quando a movimentação falha", async () => {
    const rpcError = {
      code: "P0001",
      message: "Saldo insuficiente",
    };

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: rpcError,
    } as never);

    const result = await processMovement(movementParams);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toEqual(rpcError);
    }
  });
});
