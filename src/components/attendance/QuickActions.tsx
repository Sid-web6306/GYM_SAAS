'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, BookUser, Plus, Zap, Clock, TrendingUp } from 'lucide-react'
import { CheckInModal } from './CheckInModal'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  membersPresentCount: number
  staffPresentCount: number
  totalPresentCount: number
  className?: string
}

export function QuickActions({ 
  membersPresentCount, 
  staffPresentCount, 
  totalPresentCount,
  className 
}: QuickActionsProps) {
  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean
    type: 'member' | 'staff'
  }>({
    isOpen: false,
    type: 'member'
  })

  const openCheckInModal = (type: 'member' | 'staff') => {
    setCheckInModal({ isOpen: true, type })
  }

  const closeCheckInModal = () => {
    setCheckInModal({ isOpen: false, type: 'member' })
  }

  return (
    <>
      <Card className={cn("border-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5", className)}>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Check-in Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Quick Check-in</h3>
              </div>
              
              <div className="grid gap-3">
                {/* Member Check-in */}
                <Button
                  onClick={() => openCheckInModal('member')}
                  className="h-auto p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Check In Member</p>
                        <p className="text-blue-100 text-sm">Quick member check-in</p>
                      </div>
                    </div>
                    <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                  </div>
                </Button>

                {/* Staff Check-in */}
                <Button
                  onClick={() => openCheckInModal('staff')}
                  className="h-auto p-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <BookUser className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Check In Staff</p>
                        <p className="text-green-100 text-sm">Staff member check-in</p>
                      </div>
                    </div>
                    <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                  </div>
                </Button>
              </div>
            </div>

            {/* Live Stats */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Live Stats</h3>
              </div>
              
              <div className="grid gap-3">
                {/* Members Present */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Members Present</p>
                      <p className="text-xs text-blue-600">Currently checked in</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    {membersPresentCount}
                  </Badge>
                </div>

                {/* Staff Present */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <BookUser className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Staff Present</p>
                      <p className="text-xs text-green-600">On duty now</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    {staffPresentCount}
                  </Badge>
                </div>

                {/* Total Present */}
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Present</p>
                      <p className="text-xs text-muted-foreground">All active now</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                    {totalPresentCount}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={checkInModal.isOpen}
        onClose={closeCheckInModal}
        type={checkInModal.type}
      />
    </>
  )
}
