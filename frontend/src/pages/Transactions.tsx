import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MedicationCatalogItem {
  id: number | string;
  nome: string;
  dosagem: string;
  tipo: string;
}

interface AvailableLot {
  id: number | string;
  lote: string;
  quantidade: number;
  medicamentos?: { ativo: boolean } | { ativo: boolean }[] | null;
}

interface HistoryItem {
  id: number | string;
  created_at: string;
  tipo: string;
  quantidade: number;
  destino_saida: string | null;
  nome_destino: string | null;
  documento_destino: string | null;
  telefone_destino: string | null;
  motivo_descarte: string | null;
  crm_medico: string | null;
  cpf_paciente: string | null;
  estoque: {
    medicamentos: { nome: string; dosagem: string } | null;
  } | null;
}

// ─── Classes reutilizáveis ────────────────────────────────────────────────────

const inputCls =
  "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-500";

const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300";

const todayMinDate = () => new Date().toISOString().split("T")[0];

// ─── Componente ───────────────────────────────────────────────────────────────

function Transactions() {
  const { profile, triggerInventoryReload } = useAuth();
  const idUbs = profile?.id_ubs;
  const location = useLocation();
  const formFieldId = useId();
  const preselectedMedId =
    (location.state as { preselectedMedId?: string } | null)
      ?.preselectedMedId ?? "";

  const [catalog, setCatalog] = useState<MedicationCatalogItem[]>([]);
  const [availableLots, setAvailableLots] = useState<AvailableLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    tipo: string;
    medicamento_id: string | number;
    quantidade: string;
    lote: string;
    data_vencimento: string;
  }>({
    tipo: "entrada",
    medicamento_id: preselectedMedId,
    quantidade: "",
    lote: "",
    data_vencimento: "",
  });

  const [selectedMedLabel, setSelectedMedLabel] = useState("");

  // ── Modal de busca de medicamento ──
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const lotsRequestId = useRef(0);

  type DestinoSaida = "" | "paciente" | "uso_interno" | "descarte";
  const [destinoSaida, setDestinoSaida] = useState<DestinoSaida>("");
  const [nomePaciente, setNomePaciente] = useState("");
  const [cpfSus, setCpfSus] = useState("");
  const [crmMedico, setCrmMedico] = useState("");
  const [telefonePaciente, setTelefonePaciente] = useState("");
  const [funcionarioResponsavel, setFuncionarioResponsavel] = useState("");
  const [setorSala, setSetorSala] = useState("");
  const [motivoDescarte, setMotivoDescarte] = useState("");

  const filteredCatalog = catalog.filter((med) => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return true;

    return (
      med.nome.toLowerCase().includes(term) ||
      med.dosagem.toLowerCase().includes(term) ||
      med.tipo.toLowerCase().includes(term)
    );
  });

  const openSearchModal = () => {
    setSearchQuery("");
    setIsSearchModalOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchQuery("");
    setTimeout(() => searchButtonRef.current?.focus(), 0);
  };

  const resetSaidaFields = () => {
    setDestinoSaida("");
    setNomePaciente("");
    setCpfSus("");
    setCrmMedico("");
    setTelefonePaciente("");
    setFuncionarioResponsavel("");
    setSetorSala("");
    setMotivoDescarte("");
  };

  const selectMedication = (med: MedicationCatalogItem) => {
    lotsRequestId.current += 1;
    setAvailableLots([]);
    setLoadingLots(false);
    setFormData((prev) => ({ ...prev, medicamento_id: med.id, lote: "" }));
    setSelectedMedLabel(`${med.nome} — ${med.dosagem}`);
    closeSearchModal();
  };

  const loadCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from("medicamentos")
      .select("id, nome, dosagem, tipo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar catálogo:", error);
      return;
    }

    const items = (data ?? []) as MedicationCatalogItem[];
    setCatalog(items);

    if (preselectedMedId) {
      const found = items.find(
        (med) => String(med.id) === String(preselectedMedId),
      );
      if (found) {
        setSelectedMedLabel(`${found.nome} — ${found.dosagem}`);
      }
    }
  }, [preselectedMedId]);

  const loadHistory = useCallback(async () => {
    if (!idUbs) return;

    const { data, error } = await supabase
      .from("historico")
      .select(
        "id, created_at, tipo, quantidade, destino_saida, nome_destino, documento_destino, telefone_destino, motivo_descarte, crm_medico, cpf_paciente, estoque(medicamentos(nome, dosagem))",
      )
      .eq("id_ubs", idUbs)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao carregar histórico:", error);
      return;
    }

    setHistory((data as unknown as HistoryItem[]) ?? []);
  }, [idUbs]);

  const fetchAvailableLots = useCallback(
    async (medicamentoId: string | number) => {
      if (!idUbs) return;

      const requestId = ++lotsRequestId.current;
      setLoadingLots(true);

      try {
        const { data, error } = await supabase
          .from("estoque")
          .select("id, lote, quantidade, medicamentos(ativo)")
          .eq("id_ubs", idUbs)
          .eq("id_medicamento", medicamentoId)
          .gt("quantidade", 0)
          .order("lote", { ascending: true });

        if (requestId !== lotsRequestId.current) return;

        if (error) {
          console.error("Erro ao buscar lotes:", error);
          setAvailableLots([]);
          return;
        }

        const lots = (data ?? []) as unknown as AvailableLot[];
        const activeLots = lots.filter((item) => {
          const medication = Array.isArray(item.medicamentos)
            ? item.medicamentos[0]
            : item.medicamentos;

          return medication?.ativo === true;
        });

        setAvailableLots(activeLots);
      } catch (error) {
        if (requestId === lotsRequestId.current) {
          console.error("Erro ao buscar lotes:", error);
          setAvailableLots([]);
        }
      } finally {
        if (requestId === lotsRequestId.current) {
          setLoadingLots(false);
        }
      }
    },
    [idUbs],
  );

  useEffect(() => {
    if (!idUbs) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      void loadCatalog();
      void loadHistory();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [idUbs, loadCatalog, loadHistory]);

  useEffect(() => {
    if (!idUbs || !formData.medicamento_id) {
      lotsRequestId.current += 1;
      return;
    }

    let cancelled = false;
    const medicamentoId = formData.medicamento_id;

    const timer = setTimeout(() => {
      if (!cancelled) {
        void fetchAvailableLots(medicamentoId);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      lotsRequestId.current += 1;
    };
  }, [idUbs, formData.tipo, formData.medicamento_id, fetchAvailableLots]);

  // Funções de máscara e formatação
  const formatCPFOrSUS = (value: string) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .slice(0, 14);
    }

    return numbers.slice(0, 15);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");

    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const formatCRM = (value: string) => value.toUpperCase();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idUbs) return;

    setLoading(true);

    try {
      const nomeDestino =
        destinoSaida === "paciente"
          ? nomePaciente || null
          : destinoSaida === "uso_interno"
            ? [funcionarioResponsavel, setorSala].filter(Boolean).join(" (") +
              (setorSala ? ")" : "")
            : null;

      const selectedLotObj = availableLots.find(
        (lot) => String(lot.id) === String(formData.lote),
      );

      const params = {
        p_medicamento_id: Number(formData.medicamento_id),
        p_ubs_id: Number(idUbs),
        p_tipo: formData.tipo,
        p_quantidade: Number(formData.quantidade),
        p_lote:
          formData.tipo === "saida"
            ? selectedLotObj
              ? selectedLotObj.lote
              : formData.lote
            : formData.lote || null,
        p_vencimento: formData.data_vencimento || null,
        p_destino_saida:
          formData.tipo === "saida" ? destinoSaida || null : null,
        p_nome_destino: formData.tipo === "saida" ? nomeDestino || null : null,
        p_documento:
          formData.tipo === "saida" && destinoSaida === "paciente"
            ? cpfSus || null
            : null,
        p_telefone:
          formData.tipo === "saida" && destinoSaida === "paciente"
            ? telefonePaciente || null
            : null,
        p_motivo_descarte:
          formData.tipo === "saida" && destinoSaida === "descarte"
            ? motivoDescarte || null
            : null,
        p_crm_medico:
          formData.tipo === "saida" && destinoSaida === "paciente"
            ? crmMedico || null
            : null,
        p_cpf_paciente:
          formData.tipo === "saida" && destinoSaida === "paciente"
            ? cpfSus || null
            : null,
        p_id_estoque:
          formData.tipo === "saida" && selectedLotObj
            ? Number(selectedLotObj.id)
            : null,
      };

      const { error } = await supabase.rpc("process_movement", params);

      if (error) {
        if (
          error.code === "P0003" ||
          error.message.toLowerCase().includes("bloqueio:")
        ) {
          toast.error(`Atenção: ${error.message}`);
        } else if (
          error.code === "P0001" ||
          error.message.toLowerCase().includes("insuficiente")
        ) {
          toast.error("Saldo insuficiente para o lote selecionado.");
        } else {
          toast.error("Erro ao processar movimentação.");
        }

        console.error("[handleSubmit] Erro no RPC:", error.code, error.message);
        return;
      }

      toast.success("Movimentação registrada com sucesso!");
      triggerInventoryReload();

      if (formData.tipo === "saida" && formData.medicamento_id) {
        await fetchAvailableLots(formData.medicamento_id);
      }

      lotsRequestId.current += 1;
      setAvailableLots([]);
      setLoadingLots(false);
      setFormData({
        tipo: "entrada",
        medicamento_id: "",
        quantidade: "",
        lote: "",
        data_vencimento: "",
      });
      setSelectedMedLabel("");
      resetSaidaFields();
      await loadHistory();
    } catch (err) {
      toast.error("Erro inesperado.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Movimentações
        </h2>
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
              <label htmlFor={`${formFieldId}-tipo`} className={labelCls}>
                Tipo
              </label>
              <select
                id={`${formFieldId}-tipo`}
                value={formData.tipo}
                onChange={(e) => {
                  lotsRequestId.current += 1;
                  setAvailableLots([]);
                  setLoadingLots(false);
                  setFormData({
                    ...formData,
                    tipo: e.target.value,
                    lote: "",
                  });
                  resetSaidaFields();
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
              <span className={labelCls}>Medicamento</span>
              <div className="mt-1.5 flex gap-2">
                <div
                  className={`flex min-w-0 flex-1 items-center rounded-2xl border px-4 py-3 text-sm ${
                    formData.medicamento_id
                      ? "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500"
                  }`}
                >
                  <span className="truncate">
                    {selectedMedLabel || "Nenhum medicamento selecionado"}
                  </span>
                </div>
                <button
                  ref={searchButtonRef}
                  type="button"
                  onClick={openSearchModal}
                  className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
                  aria-label="Buscar medicamento"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </div>
              <input type="hidden" value={formData.medicamento_id} required />
            </div>

            {/* Quantidade */}
            <div>
              <label htmlFor={`${formFieldId}-quantidade`} className={labelCls}>
                Quantidade
              </label>
              <input
                id={`${formFieldId}-quantidade`}
                type="number"
                value={formData.quantidade}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (Number(value) > 0 && !isNaN(Number(value)))
                  ) {
                    setFormData({ ...formData, quantidade: value });
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    !/[0-9]/.test(e.key) &&
                    ![
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      "Home",
                      "End",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                  }
                }}
                className={inputCls}
                required
                min="1"
              />
            </div>

            {/* Lote */}
            <div>
              <label htmlFor={`${formFieldId}-lote`} className={labelCls}>
                Lote
              </label>
              {formData.tipo === "saida" ? (
                <select
                  id={`${formFieldId}-lote`}
                  value={formData.lote}
                  onChange={(e) =>
                    setFormData({ ...formData, lote: e.target.value })
                  }
                  className={`${inputCls} disabled:opacity-50`}
                  required
                  disabled={loadingLots || !formData.medicamento_id}
                >
                  <option value="">
                    {loadingLots
                      ? "Carregando lotes..."
                      : !formData.medicamento_id
                        ? "Selecione um medicamento primeiro"
                        : availableLots.length === 0
                          ? "Nenhum lote com saldo disponível"
                          : "Selecione o lote"}
                  </option>
                  {availableLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lote} — {lot.quantidade} un.
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id={`${formFieldId}-lote`}
                    type="text"
                    list="available-lots-inputs"
                    value={formData.lote}
                    onChange={(e) =>
                      setFormData({ ...formData, lote: e.target.value })
                    }
                    placeholder="Ex: LOTE2025A"
                    className={inputCls}
                    required
                    disabled={loadingLots || !formData.medicamento_id}
                  />
                  <datalist id="available-lots-inputs">
                    {availableLots.map((lot) => (
                      <option key={lot.id} value={lot.lote} />
                    ))}
                  </datalist>
                </>
              )}
            </div>

            {/* Campos condicionais de saída */}
            {formData.tipo === "saida" && (
              <>
                <div className="md:col-span-2">
                  <label
                    htmlFor={`${formFieldId}-destino`}
                    className={labelCls}
                  >
                    Destino da Saída
                  </label>
                  <select
                    id={`${formFieldId}-destino`}
                    value={destinoSaida}
                    onChange={(e) => {
                      setDestinoSaida(e.target.value as DestinoSaida);
                      setNomePaciente("");
                      setCpfSus("");
                      setCrmMedico("");
                      setTelefonePaciente("");
                      setFuncionarioResponsavel("");
                      setSetorSala("");
                      setMotivoDescarte("");
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

                {destinoSaida === "paciente" && (
                  <>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-nome-paciente`}
                        className={labelCls}
                      >
                        Nome do Paciente
                      </label>
                      <input
                        id={`${formFieldId}-nome-paciente`}
                        type="text"
                        value={nomePaciente}
                        onChange={(e) => setNomePaciente(e.target.value)}
                        placeholder="Nome completo"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-cpf-sus`}
                        className={labelCls}
                      >
                        CPF ou Cartão SUS do Paciente
                      </label>
                      <input
                        id={`${formFieldId}-cpf-sus`}
                        type="text"
                        value={cpfSus}
                        onChange={(e) =>
                          setCpfSus(formatCPFOrSUS(e.target.value))
                        }
                        placeholder="000.000.000-00 ou nº do Cartão SUS"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-crm-medico`}
                        className={labelCls}
                      >
                        CRM do Médico
                      </label>
                      <input
                        id={`${formFieldId}-crm-medico`}
                        type="text"
                        value={crmMedico}
                        onChange={(e) =>
                          setCrmMedico(formatCRM(e.target.value))
                        }
                        placeholder="CRM/UF"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-telefone`}
                        className={labelCls}
                      >
                        Telefone
                      </label>
                      <input
                        id={`${formFieldId}-telefone`}
                        type="text"
                        value={telefonePaciente}
                        onChange={(e) =>
                          setTelefonePaciente(formatPhone(e.target.value))
                        }
                        placeholder="(99) 99999-9999"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                {destinoSaida === "uso_interno" && (
                  <>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-funcionario`}
                        className={labelCls}
                      >
                        Funcionário Responsável
                      </label>
                      <input
                        id={`${formFieldId}-funcionario`}
                        type="text"
                        value={funcionarioResponsavel}
                        onChange={(e) =>
                          setFuncionarioResponsavel(e.target.value)
                        }
                        placeholder="Nome do funcionário"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formFieldId}-setor`}
                        className={labelCls}
                      >
                        Setor / Sala
                      </label>
                      <input
                        id={`${formFieldId}-setor`}
                        type="text"
                        value={setorSala}
                        onChange={(e) => setSetorSala(e.target.value)}
                        placeholder="Ex: Enfermaria, Sala 3"
                        className={inputCls}
                        required
                      />
                    </div>
                  </>
                )}

                {destinoSaida === "descarte" && (
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`${formFieldId}-motivo-descarte`}
                      className={labelCls}
                    >
                      Motivo do Descarte
                    </label>
                    <textarea
                      id={`${formFieldId}-motivo-descarte`}
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
            {formData.tipo === "entrada" && (
              <div>
                <label
                  htmlFor={`${formFieldId}-data-vencimento`}
                  className={labelCls}
                >
                  Data de Vencimento
                </label>
                <input
                  id={`${formFieldId}-data-vencimento`}
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_vencimento: e.target.value,
                    })
                  }
                  className={inputCls}
                  min={todayMinDate()}
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
            {loading ? "Salvando..." : "Salvar Movimentação"}
          </button>
        </form>
      </div>

      {/* Histórico recente */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Histórico Recente
          </h3>
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
                <th className="px-5 py-3.5">CRM Médico</th>
                <th className="px-5 py-3.5">CPF Paciente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-700/40"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 text-slate-900 dark:text-slate-100">
                    {item.estoque?.medicamentos?.nome ??
                      "Medicamento não encontrado"}
                    {item.estoque?.medicamentos?.dosagem
                      ? ` — ${item.estoque.medicamentos.dosagem}`
                      : ""}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.tipo === "entrada"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {item.tipo === "entrada" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {item.quantidade}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {item.tipo === "entrada" ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        Abastecimento
                      </span>
                    ) : item.destino_saida === "paciente" ? (
                      <span>Paciente: {item.nome_destino ?? "—"}</span>
                    ) : item.destino_saida === "uso_interno" ? (
                      <span>Uso Interno: {item.nome_destino ?? "—"}</span>
                    ) : item.destino_saida === "descarte" ? (
                      <span>Descarte: {item.motivo_descarte ?? "—"}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {item.crm_medico ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {item.cpf_paciente ?? "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de busca de medicamento */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh] backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSearchModal();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeSearchModal();
              return;
            }

            if (event.key !== "Tab") return;

            const focusableElements =
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
              );

            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];

            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar medicamento"
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
            style={{ maxHeight: "75vh" }}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <Search className="h-4 w-4 shrink-0 text-blue-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome, dosagem ou tipo..."
                aria-label="Buscar medicamento por nome, dosagem ou tipo"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={closeSearchModal}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Fechar busca"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto">
              {filteredCatalog.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {catalog.length === 0
                      ? "Nenhum medicamento cadastrado."
                      : "Nenhum resultado para sua busca."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredCatalog.map((med) => (
                    <li key={med.id}>
                      <button
                        type="button"
                        onClick={() => selectMedication(med)}
                        className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-blue-50 dark:hover:bg-slate-700/60 ${
                          formData.medicamento_id === med.id
                            ? "bg-blue-50 dark:bg-slate-700/60"
                            : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {med.nome}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {med.dosagem} · {med.tipo}
                          </p>
                        </div>
                        {formData.medicamento_id === med.id && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            Selecionado
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-2.5 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filteredCatalog.length} medicamento
                {filteredCatalog.length !== 1 ? "s" : ""} encontrado
                {filteredCatalog.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Transactions;
