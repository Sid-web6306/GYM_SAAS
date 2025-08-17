'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Calendar, Clock, Edit3, Save, X, AlertTriangle, Info } from 'lucide-react'
import { useUpdateAttendanceSession } from '@/hooks/use-attendance'
import type { AttendanceRow } from '@/hooks/use-attendance'

interface EditSessionModalProps {
  session: AttendanceRow | null
  open: boolean
  onClose: () => void
  gymId: string
}

export function EditSessionModal({ session, open, onClose, gymId }: EditSessionModalProps) {
  const [checkInDate, setCheckInDate] = useState('')
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  const updateSession = useUpdateAttendanceSession(gymId)

  // Initialize form when session changes
  React.useEffect(() => {
    if (session) {
      const checkIn = new Date(session.check_in_at)
      setCheckInDate(checkIn.toISOString().split('T')[0])
      setCheckInTime(checkIn.toTimeString().slice(0, 5))
      
      if (session.check_out_at) {
        const checkOut = new Date(session.check_out_at)
        setCheckOutDate(checkOut.toISOString().split('T')[0])
        setCheckOutTime(checkOut.toTimeString().slice(0, 5))
      } else {
        setCheckOutDate('')
        setCheckOutTime('')
      }
      
      setNotes(session.notes || '')
      setErrors({})
      setWarnings({})
      setShowConfirmation(false)
    }
  }, [session])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const newWarnings: Record<string, string> = {}

    if (!checkInDate || !checkInTime) {
      newErrors.checkIn = 'Check-in date and time are required'
      setErrors(newErrors)
      setWarnings({})
      return false
    }

    const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`)
    const now = new Date()

    // Check for invalid dates
    if (isNaN(checkInDateTime.getTime())) {
      newErrors.checkIn = 'Invalid check-in date or time'
    }

    // Prevent future check-in times
    if (checkInDateTime > now) {
      newErrors.checkIn = 'Check-in cannot be in the future'
    }

    // Check if check-in is too far in the past (more than 1 year)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (checkInDateTime < oneYearAgo) {
      newErrors.checkIn = 'Check-in date cannot be more than 1 year ago'
    }

    // Warning for sessions older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (checkInDateTime < thirtyDaysAgo) {
      newWarnings.checkIn = 'This check-in is more than 30 days old'
    }

    // Check-out validation (only if provided)
    if (checkOutDate && checkOutTime) {
      const checkOutDateTime = new Date(`${checkOutDate}T${checkOutTime}`)
      
      // Check for invalid dates
      if (isNaN(checkOutDateTime.getTime())) {
        newErrors.checkOut = 'Invalid check-out date or time'
      } else {
        // Check-out must be after check-in
        if (checkOutDateTime <= checkInDateTime) {
          newErrors.checkOut = 'Check-out must be after check-in'
        }
        
        // Prevent future times
        if (checkOutDateTime > now) {
          newErrors.checkOut = 'Check-out cannot be in the future'
        }

        // Check for unreasonably long sessions (more than 24 hours)
        const sessionDuration = checkOutDateTime.getTime() - checkInDateTime.getTime()
        const maxDuration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        if (sessionDuration > maxDuration) {
          newErrors.checkOut = 'Session duration cannot exceed 24 hours. Please verify the times.'
        }

        // Check for very short sessions (less than 1 minute) as potential mistakes
        const minDuration = 60 * 1000 // 1 minute in milliseconds
        if (sessionDuration < minDuration) {
          newErrors.checkOut = 'Session duration is very short (less than 1 minute). Please verify the times.'
        }

        // Warning for very long sessions (more than 8 hours)
        const longDuration = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
        if (sessionDuration > longDuration && sessionDuration <= maxDuration) {
          newWarnings.checkOut = 'This is a very long session (over 8 hours). Please verify the times.'
        }
      }
    } else if (checkOutDate && !checkOutTime) {
      newErrors.checkOut = 'Check-out time is required when date is provided'
    } else if (!checkOutDate && checkOutTime) {
      newErrors.checkOut = 'Check-out date is required when time is provided'
    }

    setErrors(newErrors)
    setWarnings(newWarnings)
    return Object.keys(newErrors).length === 0
  }

  const checkForSignificantChanges = () => {
    if (!session) return false

    const originalCheckIn = new Date(session.check_in_at)
    const newCheckIn = new Date(`${checkInDate}T${checkInTime}`)
    
    // Check if check-in time changed by more than 1 hour
    const checkInDiff = Math.abs(newCheckIn.getTime() - originalCheckIn.getTime())
    const oneHour = 60 * 60 * 1000

    if (checkInDiff > oneHour) return true

    // Check if check-out was added/removed/significantly changed
    const hadCheckOut = !!session.check_out_at
    const hasCheckOut = !!(checkOutDate && checkOutTime)

    if (hadCheckOut !== hasCheckOut) return true

    if (hadCheckOut && hasCheckOut) {
      const originalCheckOut = new Date(session.check_out_at!)
      const newCheckOut = new Date(`${checkOutDate}T${checkOutTime}`)
      const checkOutDiff = Math.abs(newCheckOut.getTime() - originalCheckOut.getTime())
      
      if (checkOutDiff > oneHour) return true
    }

    return false
  }

  const handleSave = async () => {
    if (!session || !validateForm()) return

    // Check for significant changes that might need confirmation
    if (checkForSignificantChanges() && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    try {
      const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`)
      const checkOutDateTime = checkOutDate && checkOutTime 
        ? new Date(`${checkOutDate}T${checkOutTime}`) 
        : null

      await updateSession.mutateAsync({
        sessionId: session.session_id,
        checkInAt: checkInDateTime.toISOString(),
        checkOutAt: checkOutDateTime?.toISOString() || null,
        notes: notes.trim() || null
      })

      toast.success('Session updated successfully! ✅')
      onClose()
    } catch (error) {
      console.error('Failed to update session:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to update session: ${errorMessage}`)
    }
  }

  const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return ''
    return new Date(`${dateStr}T${timeStr}`).toLocaleString()
  }

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit Session
          </DialogTitle>
          <DialogDescription>
            Modify attendance times and add notes for <strong>{session.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Check-in Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-4 w-4 text-green-600" />
              Check-in Time
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="checkin-date" className="text-sm text-muted-foreground">Date</Label>
                <Input
                  id="checkin-date"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className={errors.checkIn ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="checkin-time" className="text-sm text-muted-foreground">Time</Label>
                <Input
                  id="checkin-time"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className={errors.checkIn ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {checkInDate && checkInTime && (
              <p className="text-xs text-muted-foreground">
                Preview: {formatDateTime(checkInDate, checkInTime)}
              </p>
            )}
            {errors.checkIn && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {errors.checkIn}
              </p>
            )}
            {warnings.checkIn && !errors.checkIn && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <Info className="h-4 w-4" />
                {warnings.checkIn}
              </p>
            )}
          </div>

          {/* Check-out Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-4 w-4 text-red-600" />
              Check-out Time
              <span className="text-sm text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="checkout-date" className="text-sm text-muted-foreground">Date</Label>
                <Input
                  id="checkout-date"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className={errors.checkOut ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="checkout-time" className="text-sm text-muted-foreground">Time</Label>
                <Input
                  id="checkout-time"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className={errors.checkOut ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {checkOutDate && checkOutTime && (
              <p className="text-xs text-muted-foreground">
                Preview: {formatDateTime(checkOutDate, checkOutTime)}
              </p>
            )}
            {errors.checkOut && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {errors.checkOut}
              </p>
            )}
            {warnings.checkOut && !errors.checkOut && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <Info className="h-4 w-4" />
                {warnings.checkOut}
              </p>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-medium">
              Notes
              <span className="text-sm text-muted-foreground font-normal ml-2">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Confirmation Dialog for Significant Changes */}
        {showConfirmation && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="font-medium">Significant Time Changes Detected</h4>
            </div>
            <p className="text-sm text-amber-700">
              You&apos;re making significant changes to this session&apos;s timing (more than 1 hour difference). 
              Please confirm these changes are correct:
            </p>
            <div className="text-xs text-amber-600 space-y-1">
              <p><strong>Original:</strong> {new Date(session!.check_in_at).toLocaleString()} - {session!.check_out_at ? new Date(session!.check_out_at).toLocaleString() : 'Still active'}</p>
              <p><strong>New:</strong> {formatDateTime(checkInDate, checkInTime)} - {checkOutDate && checkOutTime ? formatDateTime(checkOutDate, checkOutTime) : 'Will remain active'}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                Review Changes
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowConfirmation(false)
                  handleSave()
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Changes
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updateSession.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSession.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {updateSession.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
