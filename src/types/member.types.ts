export type MemberStatus = 'active' | 'inactive' | 'pending'

export interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  status: MemberStatus
  join_date?: string | null
  created_at: string
  updated_at: string
  gym_id: string
}

export interface MemberStats {
  total: number
  active: number
  inactive: number
  pending: number
  newThisMonth: number
  newThisWeek: number
}

export const MEMBER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
] as const

export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'created_at-desc', label: 'Newest First' },
  { value: 'created_at-asc', label: 'Oldest First' },
  { value: 'join_date-desc', label: 'Join Date (Recent)' },
  { value: 'join_date-asc', label: 'Join Date (Oldest)' },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Members' },
  ...MEMBER_STATUS_OPTIONS,
] as const 