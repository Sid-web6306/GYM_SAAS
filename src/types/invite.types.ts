import type { GymRole } from './rbac.types'
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

// Core invitation types
export interface Invitation {
  id: string
  gym_id: string
  invited_by: string
  email: string
  role: GymRole
  token: string
  expires_at: string
  accepted_at?: string
  accepted_by?: string
  status: InvitationStatus
  metadata: InvitationMetadata
  created_at: string
  updated_at: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface InvitationMetadata {
  message?: string
  notify_user?: boolean
  invited_by_name?: string
  custom_permissions?: Record<string, boolean>
  [key: string]: JsonValue | undefined
}

// API request/response types
export interface CreateInvitationRequest {
  email: string
  role: GymRole
  gym_id?: string
  expires_in_hours?: number
  message?: string
  notify_user?: boolean
}

export interface CreateInvitationResponse {
  success: boolean
  error?: string
  invitation?: {
    id: string
    email: string
    role: string
    expires_at: string
    invite_url: string
  }
}

export interface VerifyInvitationResponse {
  valid: boolean
  error?: string
  invitation?: {
    id: string
    email: string
    role: GymRole
    gym: {
      id: string
      name: string
    }
    invited_by: {
      name: string
      email?: string
    }
    expires_at: string
    created_at: string
    message?: string
  }
  user_status?: {
    exists: boolean
    has_role_in_gym: boolean
    current_role?: GymRole
  }
}

export interface AcceptInvitationResponse {
  success: boolean
  error?: string
  message?: string
  assignment?: {
    gym_id: string
    gym_name: string
    role: GymRole
  }
}

// Database join types
export interface InvitationWithDetails extends Omit<Invitation, 'invited_by' | 'accepted_by'> {
  invited_by?: {
    id: string
    full_name?: string
    email: string
  }
  accepted_by?: {
    id: string
    full_name?: string
    email: string
  }
  gym?: {
    id: string
    name: string
  }
}

// Form types
export interface InvitationFormData {
  email: string
  role: GymRole
  expires_in_hours: number
  message?: string
  notify_user: boolean
}

export interface InvitationUpdateData {
  status?: InvitationStatus
  role?: GymRole
  expires_at?: string
}

// Hook return types
export interface UseInvitationsResult {
  invitations: InvitationWithDetails[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  createInvitation: (data: CreateInvitationRequest) => Promise<CreateInvitationResponse>
  revokeInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>
  resendInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>
}

export interface UseInviteVerificationResult {
  invitation: VerifyInvitationResponse['invitation'] | null
  userStatus: VerifyInvitationResponse['user_status'] | null
  isValid: boolean
  isLoading: boolean
  error: string | null
  acceptInvitation: () => Promise<AcceptInvitationResponse>
}

// Utility types
export interface InvitationSummary {
  total: number
  pending: number
  accepted: number
  expired: number
  revoked: number
}

export interface InvitationFilters {
  status?: InvitationStatus | 'all'
  role?: GymRole | 'all'
  search?: string
  date_from?: string
  date_to?: string
}

export interface InvitationPagination {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

// Email template types
export interface InvitationEmailData {
  recipientEmail: string
  gymName: string
  role: GymRole
  invitedBy: string
  inviteUrl: string
  expiresAt: string
  customMessage?: string
}

// Error types
export class InvitationError extends Error {
  constructor(
    message: string,
    public code: string = 'INVITATION_ERROR',
    public details?: JsonValue
  ) {
    super(message)
    this.name = 'InvitationError'
  }
}

// Constants
export const INVITATION_EXPIRY_OPTIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' }
] as const

export const INVITATION_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  revoked: 'bg-red-100 text-red-800'
} as const

export const INVITATION_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked'
} as const

// Type guards
export function isValidInvitationStatus(status: string): status is InvitationStatus {
  return ['pending', 'accepted', 'expired', 'revoked'].includes(status)
}

export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function canResendInvitation(invitation: Pick<Invitation, 'status' | 'expires_at'>): boolean {
  return invitation.status === 'pending' || invitation.status === 'expired'
}

export function canRevokeInvitation(invitation: Pick<Invitation, 'status'>): boolean {
  return invitation.status === 'pending'
}
