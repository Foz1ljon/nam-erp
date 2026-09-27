import type { Role } from './constants'
import type { Stage } from './stages'
import { STAGE_CONFIG } from './stages'

export type Permission =
  | 'users.manage'
  | 'catalog.manage'
  | 'counterparties.manage'
  | 'stock.view'
  | 'receipts.manage'
  | 'adjustments.manage'
  | 'transfers.use'
  | 'production.view'
  | 'qc.manage'
  | 'sales.view'
  | 'sales.manage'
  | 'crm.use'
  | 'reports.view'
  | 'channels.use'
  | 'ai.use'
  | 'ai.settings'
  | `stage.${Stage}`

const PRODUCTION_ROLES: Role[] = ['foundry', 'fettling', 'cnc', 'assembly', 'painter']

const MATRIX: Record<Exclude<Permission, `stage.${Stage}`>, Role[]> = {
  'users.manage': [],
  'catalog.manage': ['warehouse', 'supply'],
  'counterparties.manage': ['supply', 'sales', 'warehouse', 'director'],
  'stock.view': ['director', 'warehouse', 'supply', 'qc', 'sales', ...PRODUCTION_ROLES],
  'receipts.manage': ['warehouse', 'supply'],
  'adjustments.manage': ['warehouse'],
  'transfers.use': ['director', 'warehouse', 'supply', 'qc', ...PRODUCTION_ROLES],
  'production.view': ['director', 'warehouse', 'qc', ...PRODUCTION_ROLES],
  'qc.manage': ['qc'],
  'sales.view': ['director', 'sales', 'warehouse'],
  'sales.manage': ['sales', 'director'],
  'crm.use': ['sales', 'director'],
  'reports.view': ['director', 'warehouse', 'supply'],
  'channels.use': ['sales', 'director'],
  'ai.use': ['director'],
  'ai.settings': ['director'],
}

/** Administrators can do everything; everyone else follows the matrix. */
export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false
  if (role === 'admin') return true
  if (permission.startsWith('stage.')) {
    const stage = permission.slice(6) as Stage
    return role === 'director' || STAGE_CONFIG[stage]?.roles.includes(role) === true
  }
  return MATRIX[permission as keyof typeof MATRIX].includes(role)
}
