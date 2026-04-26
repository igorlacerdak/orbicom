export const roleLabelMap = {
  owner: "Dono",
  admin: "Administrador",
  operator: "Operador",
  finance: "Financeiro",
} as const;

export type RoleValue = keyof typeof roleLabelMap;

export const formatRoleLabel = (role: string): string =>
  roleLabelMap[role as RoleValue] ?? role;
