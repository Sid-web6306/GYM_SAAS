/**
 * RBAC Constants - Static role and permission definitions
 * Centralized constants for role-based access control
 */

import type { GymRole, Permission } from '@/types/rbac.types'

// Role hierarchy levels for comparison
export const ROLE_LEVELS: Record<GymRole, number> = {
  member: 10,
  trainer: 20,
  staff: 30,
  manager: 40,
  owner: 50
} as const

// Permission sets by role
export const ROLE_PERMISSIONS: Record<GymRole, Permission[]> = {
  member: [
    'profile.read',
    'profile.update',
    'activities.read',
    'activities.create'
  ],
  trainer: [
    'profile.read',
    'profile.update',
    'activities.read',
    'activities.create',
    'members.read',
    'members.update',
    'activities.update'
  ],
  staff: [
    'profile.read',
    'profile.update',
    'activities.read',
    'activities.create',
    'members.read',
    'members.update',
    'activities.update',
    'members.create',
    'members.delete',
    'analytics.read',
    'billing.read',
    'gym.read'
  ],
  manager: [
    'profile.read',
    'profile.update',
    'activities.read',
    'activities.create',
    'members.read',
    'members.update',
    'activities.update',
    'members.create',
    'members.delete',
    'analytics.read',
    'billing.read',
    'gym.read',
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.delete',
    'billing.update',
    'gym.update'
  ],
  owner: [
    'profile.read',
    'profile.update',
    'activities.read',
    'activities.create',
    'members.read',
    'members.update',
    'activities.update',
    'members.create',
    'members.delete',
    'analytics.read',
    'billing.read',
    'gym.read',
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.delete',
    'billing.update',
    'gym.update',
    'gym.create',
    'analytics.export'
  ]
} as const

// Role display names and descriptions
export const ROLE_METADATA: Record<GymRole, { 
  name: string
  description: string
  color: string
  icon: string
}> = {
  member: {
    name: 'Member',
    description: 'Gym member with basic access',
    color: '#6B7280',
    icon: '👤'
  },
  trainer: {
    name: 'Trainer',
    description: 'Personal trainer with member management',
    color: '#F59E0B',
    icon: '🏋️'
  },
  staff: {
    name: 'Staff',
    description: 'Gym staff with administrative access',
    color: '#10B981',
    icon: '👷'
  },
  manager: {
    name: 'Manager',
    description: 'Gym manager with full operational access',
    color: '#3B82F6',
    icon: '📊'
  },
  owner: {
    name: 'Owner',
    description: 'Gym owner with complete control',
    color: '#8B5CF6',
    icon: '👑'
  }
} as const

// Permission metadata
export const PERMISSION_METADATA: Record<Permission, {
  name: string
  description: string
  category: string
}> = {
  // Member Management
  'members.create': {
    name: 'Create Members',
    description: 'Create new gym member accounts',
    category: 'members'
  },
  'members.read': {
    name: 'View Members',
    description: 'View gym member information',
    category: 'members'
  },
  'members.update': {
    name: 'Update Members',
    description: 'Update gym member information',
    category: 'members'
  },
  'members.delete': {
    name: 'Delete Members',
    description: 'Delete gym member accounts',
    category: 'members'
  },
  
  // Analytics & Reports
  'analytics.read': {
    name: 'View Analytics',
    description: 'View gym analytics and insights',
    category: 'analytics'
  },
  'analytics.export': {
    name: 'Export Analytics',
    description: 'Export analytics data',
    category: 'analytics'
  },
  
  // Gym Settings
  'gym.create': {
    name: 'Create Gym',
    description: 'Create new gym locations',
    category: 'gym'
  },
  'gym.read': {
    name: 'View Gym Settings',
    description: 'View gym configuration and settings',
    category: 'gym'
  },
  'gym.update': {
    name: 'Update Gym Settings',
    description: 'Update gym configuration and settings',
    category: 'gym'
  },
  
  // Staff Management
  'staff.create': {
    name: 'Create Staff',
    description: 'Create new staff accounts',
    category: 'staff'
  },
  'staff.read': {
    name: 'View Staff',
    description: 'View staff information',
    category: 'staff'
  },
  'staff.update': {
    name: 'Update Staff',
    description: 'Update staff information',
    category: 'staff'
  },
  'staff.delete': {
    name: 'Delete Staff',
    description: 'Delete staff accounts',
    category: 'staff'
  },
  
  // Financial
  'billing.read': {
    name: 'View Billing',
    description: 'View billing and payment information',
    category: 'billing'
  },
  'billing.update': {
    name: 'Update Billing',
    description: 'Update billing and payment information',
    category: 'billing'
  },
  
  // Member Activities
  'activities.create': {
    name: 'Create Activities',
    description: 'Create member activity records',
    category: 'activities'
  },
  'activities.read': {
    name: 'View Activities',
    description: 'View member activity records',
    category: 'activities'
  },
  'activities.update': {
    name: 'Update Activities',
    description: 'Update member activity records',
    category: 'activities'
  },
  'activities.delete': {
    name: 'Delete Activities',
    description: 'Delete member activity records',
    category: 'activities'
  },
  
  // Personal Data
  'profile.read': {
    name: 'View Profile',
    description: 'View user profile information',
    category: 'profile'
  },
  'profile.update': {
    name: 'Update Profile',
    description: 'Update user profile information',
    category: 'profile'
  }
} as const

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = [
  'members',
  'analytics',
  'gym',
  'staff',
  'billing',
  'activities',
  'profile'
] as const

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number]
