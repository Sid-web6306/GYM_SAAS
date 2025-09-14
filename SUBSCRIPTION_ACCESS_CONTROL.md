# Subscription Access Control Implementation

This document outlines the comprehensive subscription access control system implemented in the gym SaaS application.

## Overview

The system provides multiple layers of subscription access control:
1. **Middleware-level checks** - Basic access validation at the route level
2. **Component-level guards** - Fine-grained feature access control
3. **UI indicators** - Status displays and upgrade prompts
4. **Hooks** - Easy access to subscription status information

## Components

### 1. TrialGuard (Enhanced)

The main component for protecting features based on subscription status.

```tsx
import { TrialGuard } from '@/components/trial/TrialGuard'

// Basic usage - allow trial and active subscriptions
<TrialGuard feature="Advanced Analytics" description="View detailed member analytics">
  <AdvancedAnalyticsComponent />
</TrialGuard>

// Require active subscription only
<TrialGuard 
  feature="Premium Features" 
  requireActiveSubscription={true}
  showFullScreenBlock={true}
>
  <PremiumFeaturesComponent />
</TrialGuard>

// Custom status control
<TrialGuard 
  feature="Member Management"
  allowedStatuses={['trial', 'active']}
  description="Manage your gym members"
>
  <MemberManagementComponent />
</TrialGuard>
```

#### Props:
- `children`: ReactNode - Content to protect
- `feature`: string - Name of the feature (for display)
- `description?`: string - Custom description
- `requiredPlan?`: 'Professional' | 'Enterprise' - Plan requirement
- `memberLimit?`: number - Member limit for trial
- `fallback?`: ReactNode - Custom fallback UI
- `showUpgrade?`: boolean - Show upgrade buttons (default: true)
- `allowedStatuses?`: ('trial' | 'active' | 'expired')[] - Allowed subscription statuses
- `requireActiveSubscription?`: boolean - Require active subscription only
- `showFullScreenBlock?`: boolean - Show full-screen upgrade prompt

### 2. SubscriptionStatusDisplay

Displays current subscription information in various formats.

```tsx
import { SubscriptionStatusDisplay } from '@/components/subscriptions/SubscriptionStatusDisplay'

// Card format (default)
<SubscriptionStatusDisplay />

// Compact format for headers
<SubscriptionStatusDisplay variant="compact" />

// Detailed format for settings pages
<SubscriptionStatusDisplay variant="detailed" showActions={true} />
```

#### Variants:
- `card` (default): Full card with status, plan info, and actions
- `compact`: Minimal inline display
- `detailed`: Comprehensive information with all details

### 3. SubscriptionStatusBanner

Shows contextual upgrade prompts and status alerts.

```tsx
import { SubscriptionStatusBanner, SubscriptionStatusIndicator } from '@/components/subscriptions/SubscriptionStatusBanner'

// Banner for page-level notifications
<SubscriptionStatusBanner 
  dismissible={true}
  hideOnPages={['/upgrade', '/settings']}
/>

// Compact indicator for navigation
<SubscriptionStatusIndicator />
```

### 4. SubscriptionStatusBanner Props:
- `className?`: string - Additional CSS classes
- `dismissible?`: boolean - Allow user to dismiss (default: true)
- `showOnPages?`: string[] - Only show on specific pages
- `hideOnPages?`: string[] - Hide on specific pages

## Hooks

### 1. useSubscriptionAccess

Main hook for subscription access control.

```tsx
import { useSubscriptionAccess } from '@/hooks/use-subscription-access'

function MyComponent() {
  const { 
    hasAccess, 
    isLoading, 
    currentStatus, 
    statusInfo,
    shouldShowUpgrade,
    getDaysRemaining 
  } = useSubscriptionAccess({
    allowedStatuses: ['trial', 'active'],
    requireActiveSubscription: false
  })

  if (isLoading) return <LoadingSpinner />
  
  if (!hasAccess) {
    return <UpgradePrompt />
  }

  return <ProtectedContent />
}
```

### 2. Convenience Hooks

```tsx
import { 
  useTrialAccess,
  useActiveSubscriptionAccess,
  useAnySubscriptionAccess 
} from '@/hooks/use-subscription-access'

// Allow trial and active subscriptions
const trialAccess = useTrialAccess()

// Require active subscription only
const activeAccess = useActiveSubscriptionAccess()

// Allow any subscription status
const anyAccess = useAnySubscriptionAccess()
```

## Usage Examples

### 1. Protecting a Feature

```tsx
import { TrialGuard } from '@/components/trial/TrialGuard'

function AnalyticsPage() {
  return (
    <TrialGuard 
      feature="Advanced Analytics"
      description="View detailed analytics and reports"
      requiredPlan="Professional"
    >
      <div>
        <h1>Analytics Dashboard</h1>
        <AnalyticsCharts />
        <ReportsSection />
      </div>
    </TrialGuard>
  )
}
```

### 2. Full-Screen Upgrade Prompt

```tsx
function PremiumFeature() {
  return (
    <TrialGuard 
      feature="Premium Features"
      requireActiveSubscription={true}
      showFullScreenBlock={true}
    >
      <PremiumContent />
    </TrialGuard>
  )
}
```

### 3. Custom Status Control

```tsx
function MemberManagement() {
  return (
    <TrialGuard 
      feature="Member Management"
      allowedStatuses={['trial', 'active']}
      memberLimit={50}
    >
      <MemberList />
    </TrialGuard>
  )
}
```

### 4. Page-Level Status Banner

```tsx
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner'

function DashboardLayout({ children }) {
  return (
    <div>
      <SubscriptionStatusBanner 
        hideOnPages={['/upgrade', '/settings']}
        dismissible={true}
      />
      <main>{children}</main>
    </div>
  )
}
```

### 5. Navigation Status Indicator

```tsx
import { SubscriptionStatusIndicator } from '@/components/subscriptions/SubscriptionStatusBanner'

function Navigation() {
  return (
    <nav>
      <div className="flex items-center space-x-4">
        <Logo />
        <NavigationLinks />
        <SubscriptionStatusIndicator />
      </div>
    </nav>
  )
}
```

## Middleware Integration

The middleware now includes basic subscription access checks:

```typescript
// In middleware.ts
const { data: hasAccess } = await supabase.rpc('check_subscription_access', {
  p_user_id: user.id
})

if (!hasAccess && !pathname.startsWith('/upgrade')) {
  return NextResponse.redirect(new URL('/upgrade', request.url))
}
```

## Subscription Statuses

The system recognizes these subscription statuses:

1. **`trial`**: User is on active trial
2. **`active`**: User has active paid subscription
3. **`expired`**: Trial has expired, no active subscription
4. **`none`**: No trial or subscription

## Status Information

Each status includes:p
- `title`: Human-readable status name
- `description`: Detailed status description
- `color`: UI color theme
- `urgency`: Level of urgency ('none', 'low', 'medium', 'high')

## Best Practices

1. **Use TrialGuard for feature protection**: Wrap components that require subscription access
2. **Provide clear upgrade paths**: Always include upgrade buttons and links
3. **Show status contextually**: Use banners and indicators appropriately
4. **Handle loading states**: Always check `isLoading` before rendering
5. **Fail gracefully**: Provide fallbacks for subscription check failures
6. **Use appropriate urgency levels**: Match UI urgency to subscription status urgency

## Integration with Existing Components

The system integrates seamlessly with existing components:

- **Upgrade Page**: Uses `SubscriptionPlansComponent` for plan selection
- **Settings**: Uses `CurrentSubscriptionDisplay` for subscription management
- **Billing**: Uses existing payment and subscription hooks
- **RBAC**: Works alongside existing role-based access control

## Error Handling

The system includes comprehensive error handling:

- Network failures: Graceful degradation with fallback access
- Invalid subscriptions: Clear error messages and upgrade prompts
- Loading states: Proper loading indicators
- Edge cases: Fallback to trial access when appropriate

This implementation provides a robust, user-friendly subscription access control system that guides users through the upgrade process while maintaining a smooth user experience.
