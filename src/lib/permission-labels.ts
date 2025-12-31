// Permission labels and icons for user-friendly display
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX,
  BarChart3,
  Download,
  Building2,
  Settings,
  CreditCard,
  Activity,
  User,
  Shield,
  Edit,
  Eye,
  Trash2,
  Calendar,
  Star,
  DollarSign,
  type LucideIcon
} from 'lucide-react'
import type { Permission } from '@/types/rbac.types'

export interface PermissionLabel {
  permission: Permission
  title: string
  description: string
  icon: LucideIcon
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  color: string
}

export const PERMISSION_LABELS: Record<Permission, PermissionLabel> = {
  // Member Management
  'members.create': {
    permission: 'members.create',
    title: 'Add New Members',
    description: 'Register new gym members and create member profiles',
    icon: UserPlus,
    category: 'Member Management',
    severity: 'medium',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  'members.read': {
    permission: 'members.read',
    title: 'View Members',
    description: 'View member profiles, contact information, and status',
    icon: Users,
    category: 'Member Management',
    severity: 'low',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  'members.update': {
    permission: 'members.update',
    title: 'Edit Members',
    description: 'Update member information, status, and contact details',
    icon: Edit,
    category: 'Member Management',
    severity: 'medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'members.delete': {
    permission: 'members.delete',
    title: 'Remove Members',
    description: 'Delete member accounts and remove their data permanently',
    icon: Trash2,
    category: 'Member Management',
    severity: 'critical',
    color: 'bg-red-100 text-red-800 border-red-200'
  },

  // Analytics & Reports
  'analytics.read': {
    permission: 'analytics.read',
    title: 'View Analytics',
    description: 'Access gym performance metrics, member statistics, and reports',
    icon: BarChart3,
    category: 'Analytics & Reports',
    severity: 'low',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  'analytics.export': {
    permission: 'analytics.export',
    title: 'Export Reports',
    description: 'Download and export analytics data and detailed reports',
    icon: Download,
    category: 'Analytics & Reports',
    severity: 'medium',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },

  // Gym Settings
  'gym.create': {
    permission: 'gym.create',
    title: 'Create Gym',
    description: 'Create new gyms and manage facility setup',
    icon: Building2,
    category: 'Gym Settings',
    severity: 'critical',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  'gym.read': {
    permission: 'gym.read',
    title: 'View Gym Settings',
    description: 'View gym information, operating hours, and basic settings',
    icon: Building2,
    category: 'Gym Settings',
    severity: 'low',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  },
  'gym.update': {
    permission: 'gym.update',
    title: 'Manage Gym Settings',
    description: 'Modify gym details, operating hours, policies, and configurations',
    icon: Settings,
    category: 'Gym Settings',
    severity: 'high',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },

  // Staff Management
  'staff.create': {
    permission: 'staff.create',
    title: 'Add Staff Members',
    description: 'Invite and register new staff members with role assignments',
    icon: UserCheck,
    category: 'Staff Management',
    severity: 'high',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  'staff.read': {
    permission: 'staff.read',
    title: 'View Staff',
    description: 'View staff profiles, roles, and contact information',
    icon: Eye,
    category: 'Staff Management',
    severity: 'low',
    color: 'bg-slate-100 text-slate-800 border-slate-200'
  },
  'staff.update': {
    permission: 'staff.update',
    title: 'Manage Staff',
    description: 'Update staff roles, permissions, and profile information',
    icon: Shield,
    category: 'Staff Management',
    severity: 'high',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  'staff.delete': {
    permission: 'staff.delete',
    title: 'Remove Staff',
    description: 'Remove staff access and delete staff member accounts',
    icon: UserX,
    category: 'Staff Management',
    severity: 'critical',
    color: 'bg-rose-100 text-rose-800 border-rose-200'
  },

  // Financial
  'billing.read': {
    permission: 'billing.read',
    title: 'View Billing',
    description: 'Access subscription details, payment history, and invoices',
    icon: CreditCard,
    category: 'Financial',
    severity: 'medium',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  'billing.update': {
    permission: 'billing.update',
    title: 'Manage Billing',
    description: 'Update payment methods, manage subscriptions, and process refunds',
    icon: DollarSign,
    category: 'Financial',
    severity: 'critical',
    color: 'bg-red-100 text-red-800 border-red-200'
  },

  // Member Activities
  'activities.create': {
    permission: 'activities.create',
    title: 'Create Activities',
    description: 'Schedule workouts, classes, and member activities',
    icon: Calendar,
    category: 'Activities',
    severity: 'medium',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  'activities.read': {
    permission: 'activities.read',
    title: 'View Activities',
    description: 'View scheduled activities, member progress, and workout logs',
    icon: Activity,
    category: 'Activities',
    severity: 'low',
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  'activities.update': {
    permission: 'activities.update',
    title: 'Modify Activities',
    description: 'Edit activity schedules, update workout plans, and modify classes',
    icon: Edit,
    category: 'Activities',
    severity: 'medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'activities.delete': {
    permission: 'activities.delete',
    title: 'Cancel Activities',
    description: 'Cancel scheduled activities and remove workout sessions',
    icon: Trash2,
    category: 'Activities',
    severity: 'medium',
    color: 'bg-red-100 text-red-800 border-red-200'
  },

  // Personal Data
  'profile.read': {
    permission: 'profile.read',
    title: 'View Profile',
    description: 'Access personal profile information and account details',
    icon: User,
    category: 'Personal',
    severity: 'low',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  'profile.update': {
    permission: 'profile.update',
    title: 'Edit Profile',
    description: 'Update personal information, preferences, and account settings',
    icon: Edit,
    category: 'Personal',
    severity: 'low',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
}

// Group permissions by category
export const PERMISSION_CATEGORIES = {
  'Member Management': [
    'members.create',
    'members.read', 
    'members.update',
    'members.delete'
  ],
  'Analytics & Reports': [
    'analytics.read',
    'analytics.export'
  ],
  'Gym Settings': [
    'gym.create',
    'gym.read',
    'gym.update'
  ],
  'Staff Management': [
    'staff.create',
    'staff.read',
    'staff.update', 
    'staff.delete'
  ],
  'Financial': [
    'billing.read',
    'billing.update'
  ],
  'Activities': [
    'activities.create',
    'activities.read',
    'activities.update',
    'activities.delete'
  ],
  'Personal': [
    'profile.read',
    'profile.update'
  ]
} as const

// Utility functions
export const getPermissionLabel = (permission: Permission): PermissionLabel => {
  return PERMISSION_LABELS[permission]
}

export const getPermissionsByCategory = (category: keyof typeof PERMISSION_CATEGORIES): Permission[] => {
  return [...PERMISSION_CATEGORIES[category]] as Permission[]
}

export const getCategoryIcon = (category: string): LucideIcon => {
  switch (category) {
    case 'Member Management': return Users
    case 'Analytics & Reports': return BarChart3
    case 'Gym Settings': return Building2
    case 'Staff Management': return Shield
    case 'Financial': return CreditCard
    case 'Activities': return Activity
    case 'Personal': return User
    default: return Star
  }
}

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Member Management': return 'bg-blue-50 border-blue-200'
    case 'Analytics & Reports': return 'bg-purple-50 border-purple-200'
    case 'Gym Settings': return 'bg-orange-50 border-orange-200'
    case 'Staff Management': return 'bg-emerald-50 border-emerald-200'
    case 'Financial': return 'bg-green-50 border-green-200'
    case 'Activities': return 'bg-teal-50 border-teal-200'
    case 'Personal': return 'bg-gray-50 border-gray-200'
    default: return 'bg-gray-50 border-gray-200'
  }
}
