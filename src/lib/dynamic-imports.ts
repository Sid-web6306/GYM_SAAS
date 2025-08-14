'use client'

import dynamic from 'next/dynamic'
import React from 'react'

// UI Components
export const DynamicCard = dynamic(() => import('@/components/ui/card').then(mod => ({ default: mod.Card })), {
  ssr: false
})

export const DynamicCardContent = dynamic(() => import('@/components/ui/card').then(mod => ({ default: mod.CardContent })), {
  ssr: false
})

export const DynamicCardDescription = dynamic(() => import('@/components/ui/card').then(mod => ({ default: mod.CardDescription })), {
  ssr: false
})

export const DynamicCardHeader = dynamic(() => import('@/components/ui/card').then(mod => ({ default: mod.CardHeader })), {
  ssr: false
})

export const DynamicCardTitle = dynamic(() => import('@/components/ui/card').then(mod => ({ default: mod.CardTitle })), {
  ssr: false
})

export const DynamicButton = dynamic(() => import('@/components/ui/button').then(mod => ({ default: mod.Button })), {
  ssr: false
})

export const DynamicBadge = dynamic(() => import('@/components/ui/badge').then(mod => ({ default: mod.Badge })), {
  ssr: false
})

export const DynamicSeparator = dynamic(() => import('@/components/ui/separator').then(mod => ({ default: mod.Separator })), {
  ssr: false
})

export const DynamicInput = dynamic(() => import('@/components/ui/input').then(mod => ({ default: mod.Input })), {
  ssr: false
})

export const DynamicDialog = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.Dialog })), {
  ssr: false
})

export const DynamicDialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogContent })), {
  ssr: false
})

export const DynamicDialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogDescription })), {
  ssr: false
})

export const DynamicDialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogFooter })), {
  ssr: false
})

export const DynamicDialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogHeader })), {
  ssr: false
})

export const DynamicDialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogTitle })), {
  ssr: false
})

export const DynamicDialogTrigger = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogTrigger })), {
  ssr: false
})

export const DynamicLabel = dynamic(() => import('@/components/ui/label').then(mod => ({ default: mod.Label })), {
  ssr: false
})

export const DynamicForm = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.Form })), {
  ssr: false
})

export const DynamicFormControl = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.FormControl })), {
  ssr: false
})

export const DynamicFormField = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.FormField })), {
  ssr: false
})

export const DynamicFormItem = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.FormItem })), {
  ssr: false
})

export const DynamicFormLabel = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.FormLabel })), {
  ssr: false
})

export const DynamicFormMessage = dynamic(() => import('@/components/ui/form').then(mod => ({ default: mod.FormMessage })), {
  ssr: false
})

export const DynamicRadioGroup = dynamic(() => import('../components/ui/radio-group').then(mod => ({ default: mod.RadioGroup })), {
  ssr: false
})

export const DynamicRadioGroupItem = dynamic(() => import('../components/ui/radio-group').then(mod => ({ default: mod.RadioGroupItem })), {
  ssr: false
})

export const DynamicTextarea = dynamic(() => import('../components/ui/textarea').then(mod => ({ default: mod.Textarea })), {
  ssr: false
})

// Icons
export const DynamicTrendingUp = dynamic(() => import('lucide-react').then(mod => ({ default: mod.TrendingUp })), {
  ssr: false
})

export const DynamicUsers = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Users })), {
  ssr: false
})

export const DynamicDollarSign = dynamic(() => import('lucide-react').then(mod => ({ default: mod.DollarSign })), {
  ssr: false
})

export const DynamicActivity = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Activity })), {
  ssr: false
})

export const DynamicUserPlus = dynamic(() => import('lucide-react').then(mod => ({ default: mod.UserPlus })), {
  ssr: false
})

export const DynamicDumbbell = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Dumbbell })), {
  ssr: false
})

export const DynamicClock = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Clock })), {
  ssr: false
})

export const DynamicSettings = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Settings })), {
  ssr: false
})

export const DynamicAlertCircle = dynamic(() => import('lucide-react').then(mod => ({ default: mod.AlertCircle })), {
  ssr: false
})

export const DynamicShield = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Shield })), {
  ssr: false
})

export const DynamicTimer = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Timer })), {
  ssr: false
})

export const DynamicDatabase = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Database })), {
  ssr: false
})

export const DynamicCrown = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Crown })), {
  ssr: false
})

export const DynamicCheck = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Check })), {
  ssr: false
})

export const DynamicCheckCircle = dynamic(() => import('lucide-react').then(mod => ({ default: mod.CheckCircle })), {
  ssr: false
})

export const DynamicStar = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Star })), {
  ssr: false
})

export const DynamicAlertTriangle = dynamic(() => import('lucide-react').then(mod => ({ default: mod.AlertTriangle })), {
  ssr: false
})

export const DynamicArrowRight = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowRight })), {
  ssr: false
})

export const DynamicArrowUpRight = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ArrowUpRight })), {
  ssr: false
})


export const DynamicX = dynamic(() => import('lucide-react').then(mod => ({ default: mod.X })), {
  ssr: false
})

export const DynamicCalendar = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Calendar })), {
  ssr: false
})

export const DynamicCreditCard = dynamic(() => import('lucide-react').then(mod => ({ default: mod.CreditCard })), {
  ssr: false
})

export const DynamicLock = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Lock })), {
  ssr: false
})

export const DynamicWifiOff = dynamic(() => import('lucide-react').then(mod => ({ default: mod.WifiOff })), {
  ssr: false
})

export const DynamicWifi = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Wifi })), {
  ssr: false
})

export const DynamicDownload = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Download })), {
  ssr: false
})

export const DynamicSmartphone = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Smartphone })), {
  ssr: false
})

export const DynamicZap = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Zap })), {
  ssr: false
})

// Next.js Components
export const DynamicLink = dynamic(() => import('next/link').then(mod => ({ default: mod.default })), {
  ssr: false
})

// Chart Components
export const DynamicAreaChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.AreaChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
})

export const DynamicBarChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.BarChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
})

export const DynamicLineChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.LineChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
})

export const DynamicTremorCard = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.Card })), {
  ssr: false
})

export const DynamicTitle = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.Title })), {
  ssr: false
})

export const DynamicText = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.Text })), {
  ssr: false
})

// External Libraries
export const DynamicToast = dynamic(() => import('sonner').then(mod => ({ default: mod.toast })), {
  ssr: false
})

// Custom Components
export const DynamicTrialStatus = dynamic(() => import('@/components/trial/TrialStatus').then(mod => ({ default: mod.TrialStatus })), {
  ssr: false
})

export const DynamicInstallPrompt = dynamic(() => import('@/components/pwa/InstallPrompt').then(mod => ({ default: mod.InstallPrompt })), {
  ssr: false
})

export const DynamicOfflineStatus = dynamic(() => import('@/components/pwa/OfflineStatus').then(mod => ({ default: mod.OfflineStatus })), {
  ssr: false
})

export const DynamicUpdatePrompt = dynamic(() => import('@/components/pwa/UpdatePrompt').then(mod => ({ default: mod.UpdatePrompt })), {
  ssr: false
})

export const DynamicMemberGrowthChart = dynamic(() => import('@/components/charts/member-growth-chart').then(mod => ({ default: mod.MemberGrowthChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
})

export const DynamicRevenueChart = dynamic(() => import('@/components/charts/revenue-chart').then(mod => ({ default: mod.RevenueChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
})

export const DynamicCheckinTrendsChart = dynamic(() => import('@/components/charts/checkin-trends-chart').then(mod => ({ default: mod.CheckinTrendsChart })), {
  ssr: false,
  loading: () => React.createElement('div', { className: 'h-64 bg-gray-100 rounded animate-pulse' })
}) 