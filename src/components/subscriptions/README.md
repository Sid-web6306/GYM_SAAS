# Subscription Plans Component

A reusable subscription plans component with smooth monthly/annual toggle.

## Features

- 🔄 **Smooth Toggle**: Animated billing cycle selector with price transitions
- 💰 **Savings Display**: Shows annual savings percentages dynamically  
- 🎨 **Current Plan Highlight**: Highlights user's current plan and billing cycle
- 📱 **Responsive Design**: Works on all screen sizes
- ⚡ **Dynamic Components**: Uses only dynamic forms as preferred
- 🎯 **Proper Cursor Behavior**: Correct cursor states for all interactive elements

## Usage

### Basic Usage

```tsx
import { SubscriptionPlansComponent } from '@/components/subscriptions'

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>
      <SubscriptionPlansComponent />
    </div>
  )
}
```

### Custom Plan Selection Handler

```tsx
import { SubscriptionPlansComponent } from '@/components/subscriptions'

export default function UpgradePage() {
  const handlePlanSelect = (planId: string, billingCycle: 'monthly' | 'annual') => {
    console.log('Selected plan:', planId, 'billing:', billingCycle)
    // Custom logic here
  }

  return (
    <SubscriptionPlansComponent 
      onPlanSelect={handlePlanSelect}
      showCurrentPlan={true}
      className="max-w-7xl mx-auto"
    />
  )
}
```

### Settings Page Integration

```tsx
import { SubscriptionPlansComponent } from '@/components/subscriptions'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Subscription</h2>
      <SubscriptionPlansComponent 
        showCurrentPlan={true}
        className="border rounded-lg p-6"
      />
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onPlanSelect` | `(planId: string, billingCycle: 'monthly' \| 'annual') => void` | `undefined` | Custom plan selection handler |
| `showCurrentPlan` | `boolean` | `true` | Whether to highlight current plan |
| `className` | `string` | `""` | Additional CSS classes |

## Data Structure

The component expects data in this format from `useSimplifiedPaymentSystem()`:

```typescript
{
  plans: SubscriptionPlan[]
  groupedPlans: {
    "starter_monthly": SubscriptionPlan,
    "starter_annual": SubscriptionPlan,
    "professional_monthly": SubscriptionPlan,
    "professional_annual": SubscriptionPlan,
    "enterprise_monthly": SubscriptionPlan,
    "enterprise_annual": SubscriptionPlan
  }
}
```

## Features

### Smooth Billing Toggle
- Animated toggle between monthly and annual billing
- Price transitions with smooth animations
- Savings percentages displayed for annual plans

### Plan Display
- Three tiers: Starter, Professional, Enterprise
- Feature lists with checkmark icons
- Proper tier coloring and icons
- Member limits and pricing display

### Current Plan Handling
- Highlights current plan with special styling
- Shows "Current Plan" badge
- Disables selection for current plan + billing cycle
- Supports billing cycle changes

### Loading States
- Loading spinner during plan fetch
- Processing state during plan selection
- Disabled states for current plans

## Styling

The component uses Tailwind CSS classes and follows the existing design system:
- Gradient backgrounds for popular/current plans
- Hover animations and scaling effects
- Responsive grid layout
- Consistent spacing and typography