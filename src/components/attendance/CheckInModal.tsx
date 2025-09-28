'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/logger'
import { Separator } from '@/components/ui/separator'
import { Search, Users, BookUser, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { useStartAttendance } from '@/hooks/use-attendance'
import { useMembers } from '@/hooks/use-members-data'
import { useStaffData, useCurrentUserAsStaff } from '@/hooks/use-staff-data'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type CheckInType = 'member' | 'staff'

interface CheckInModalProps {
  isOpen: boolean
  onClose: () => void
  type: CheckInType
}

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  status: string | null
}

interface StaffMember {
  id: string
  full_name: string | null
  email: string | null
  default_role: string | null
}

export function CheckInModal({ isOpen, onClose, type }: CheckInModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Member | StaffMember | null>(null)

  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'select' | 'details' | 'success'>('select')
  
  const { profile } = useAuth()
  const gymId = profile?.gym_id
  
  // For members, use the existing members data hook
  const { data: membersData } = useMembers(gymId && isOpen && type === 'member' ? gymId : null, {
    search: searchTerm,
    limit: 20
  })
  
  // For staff, fetch real staff data
  const { data: staffData } = useStaffData(gymId || '', {
    search: searchTerm,
    limit: 20,
    enabled: isOpen && type === 'staff' && !!gymId
  })
  
  // Get current user as staff option
  const { data: currentUserAsStaff } = useCurrentUserAsStaff(gymId || '')
  
  const startAttendance = useStartAttendance(gymId)
  
  const filteredData = type === 'member' 
    ? (membersData?.members || []).filter((m) => 
        m.status === 'active' && (
          `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : (() => {
        let staffList = staffData?.staff || []
        // Always include current user as first option if they're staff
        if (currentUserAsStaff && !staffList.find(s => s.id === currentUserAsStaff.id)) {
          staffList = [currentUserAsStaff, ...staffList]
        }
        return staffList.filter((s: StaffMember) => 
          (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      })()

  const handleCheckIn = async () => {
    if (!selectedPerson) return
    
    try {
      // Automatically determine method: 'self' if user checks themselves, 'via_owner' if admin checks someone else
      const checkInMethod = selectedPerson.id === profile?.id ? 'self' : 'via_owner'
      
      await startAttendance.mutateAsync({
        subjectType: type,
        memberId: type === 'member' ? selectedPerson.id : undefined,
        staffUserId: type === 'staff' ? selectedPerson.id : undefined,
        method: checkInMethod,
        notes: notes || undefined
      })
      
      setStep('success')
      toast.success(`${type === 'member' ? 'Member' : 'Staff'} checked in successfully! 🎉`)
      
      // Auto-close after showing success
      setTimeout(() => {
        handleClose()
      }, 2000)
      
    } catch (error) {
      logger.error('Check-in failed:', {error})
      toast.error('Check-in failed. Please try again.')
    }
  }

  const handleClose = () => {
    setStep('select')
    setSelectedPerson(null)
    setSearchTerm('')
    setNotes('')
    onClose()
  }

  const handlePersonSelect = (person: Member | StaffMember) => {
    setSelectedPerson(person)
    setStep('details')
  }

  const getPersonName = (person: Member | StaffMember) => {
    if (type === 'member') {
      const member = person as Member
      return `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Unknown'
    } else {
      const staff = person as StaffMember
      return staff.full_name || staff.email
    }
  }

  const getPersonRole = (person: Member | StaffMember) => {
    if (type === 'member') {
      return 'Member'
    } else {
      const staff = person as StaffMember
      return staff.default_role || 'Staff'
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select')
      setSelectedPerson(null)
      setSearchTerm('')
      setNotes('')
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            {type === 'member' ? (
              <Users className="h-6 w-6 text-blue-600" />
            ) : (
              <BookUser className="h-6 w-6 text-green-600" />
            )}
            Check In {type === 'member' ? 'Member' : 'Staff'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Person Selection */}
        {step === 'select' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${type === 'member' ? 'members' : 'staff'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Person List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No {type === 'member' ? 'active members' : 'staff'} found</p>
                  {searchTerm && <p className="text-sm">Try a different search term</p>}
                </div>
              ) : (
                filteredData.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                        type === 'member' ? 'bg-blue-600' : 'bg-green-600'
                      )}>
                        {person ? getPersonName(person)?.charAt(0)?.toUpperCase() || '?' : '?'}
                      </div>
                      <div>
                        <p className="font-medium">{person ? getPersonName(person) : 'Unknown'}</p>
                        <div className="flex items-center gap-2">
                          {type === 'member' && (person as Member).email && (
                            <p className="text-sm text-muted-foreground">{(person as Member).email}</p>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {getPersonRole(person)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Check-in Details */}
        {step === 'details' && selectedPerson && (
          <div className="space-y-6">
            {/* Selected Person Summary */}
            <div className="flex items-center gap-3 p-4 bg-accent/30 rounded-lg">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                type === 'member' ? 'bg-blue-600' : 'bg-green-600'
              )}>
                {selectedPerson ? getPersonName(selectedPerson)?.charAt(0)?.toUpperCase() || '?' : '?'}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selectedPerson ? getPersonName(selectedPerson) : 'Unknown'}</p>
                <Badge variant="secondary" className="text-xs">
                  {selectedPerson ? getPersonRole(selectedPerson) : 'Unknown'}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep('select')}
                className="text-muted-foreground hover:text-foreground"
              >
                Change
              </Button>
            </div>

            <Separator />

            {/* Check-in Method - Auto-determined */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Check-in Method</Label>
              <div className="p-3 bg-accent/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {selectedPerson?.id === profile?.id ? (
                    <>🏃‍♂️ <strong>Self Check-in</strong> - You are checking yourself in</>
                  ) : (
                    <>👨‍💼 <strong>Manual Check-in</strong> - Checked in by gym admin</>
                  )}
                </p>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this check-in..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleCheckIn}
                disabled={startAttendance.isPending}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {startAttendance.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Check In Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success State */}
        {step === 'success' && selectedPerson && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">Check-in Successful!</h3>
              <p className="text-muted-foreground">
                <strong>{getPersonName(selectedPerson)}</strong> has been checked in
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleTimeString()} • {selectedPerson?.id === profile?.id ? 'Self Check-in' : 'Manual Check-in'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
