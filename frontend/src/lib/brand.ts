export const APP_NAME = 'MediGestão CN'

/** Nome da unidade exibido no painel logado, com base no id_ubs do perfil. */
export function getUnitLabel(
  idUbs: number | string | null | undefined,
  options?: { profileLoading?: boolean },
): string {
  if (options?.profileLoading) return 'Painel de Gestão'
  if (idUbs == null || idUbs === '') return 'Painel de Gestão'

  const id = Number(idUbs)
  if (id === 1) return 'CAF - Central de Abastecimento Farmacêutico'
  if (id === 2) return 'CAPS - Centro de Atenção Psicossocial'

  return 'Painel de Gestão'
}
