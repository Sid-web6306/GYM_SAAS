'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, UserX, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RequireAuth } from '@/components/auth/AuthGuard'
import { useLogout } from '@/hooks/use-auth'
import Link from 'next/link'

const InactiveUserContent = () => {
  const router = useRouter()
  const logoutMutation = useLogout()

  const handleCreateNewGym = () => {
    router.push('/onboarding')
  }

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  // Show options for inactive users
  return (
    <Card className="w-full max-w-lg shadow-lg border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <UserX className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <CardTitle className="text-center text-xl font-bold text-gray-900">
          Access Suspended
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Your access to the gym has been temporarily suspended. You can create a new gym or contact support for assistance.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Button 
            onClick={handleCreateNewGym}
            variant="outline"
            className="w-full"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Create New Gym
          </Button>
          
          <Button 
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          <p>Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link></p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InactiveUserPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
        <Suspense fallback={
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        }>
          <InactiveUserContent />
        </Suspense>
      </div>
    </RequireAuth>
  )
}
