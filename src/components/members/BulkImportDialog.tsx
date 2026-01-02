'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { MemberManagementService } from '@/services/members/member-management.service'
import { PortalService } from '@/services/members/portal.service'
import { parseCSVFile, downloadCSVTemplate, type ValidationError } from '@/lib/member-csv'
import { getUserFriendlyErrorMessage } from '@/lib/import-error-messages'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  X, 
  Mail, 
  Eye,
  Info,
  Users,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type ImportStage = 'upload' | 'validating' | 'validated' | 'preview' | 'importing' | 'complete' | 'error'

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const { profile } = useAuth()
  const gymId = profile?.gym_id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<ImportStage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [validMembers, setValidMembers] = useState<number>(0)
  const [totalRows, setTotalRows] = useState<number>(0)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    invitationsSent?: number
    invitationsFailed?: number
    failedMembers?: Array<{ name: string; error: string }>
  }>({ success: 0, failed: 0 })
  const [sendInvitations, setSendInvitations] = useState(false)
  const [membersWithEmail, setMembersWithEmail] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const resetState = () => {
    setStage('upload')
    setFile(null)
    setValidMembers(0)
    setTotalRows(0)
    setErrors([])
    setImportProgress(0)
    setImportResults({ success: 0, failed: 0 })
    setSendInvitations(false)
    setMembersWithEmail(0)
    setIsDragging(false)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  // File change handler
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Invalid file type. Please upload a CSV file.')
      return
    }

    setFile(selectedFile)
    setStage('validating')

    try {
      const result = await parseCSVFile(selectedFile)
      
      setValidMembers(result.validMembers.length)
      setTotalRows(result.totalRows)
      setErrors(result.errors)
      
      // Count members with email addresses
      const withEmail = result.validMembers.filter(m => m.email && m.email.trim() !== '').length
      setMembersWithEmail(withEmail)

      if (result.success) {
        setStage('validated')
        toast.success(`File validated successfully! ${result.validMembers.length} members ready to import.`)
      } else {
        setStage('error')
        toast.error(`Validation failed. Found ${result.errors.length} error(s).`)
      }

      // Store valid members for import
      if (result.validMembers.length > 0) {
        ;(window as Window & { __bulkImportData?: typeof result.validMembers }).__bulkImportData = result.validMembers
      }
    } catch (error) {
      logger.error('CSV parsing error:', { error: error instanceof Error ? error.message : String(error) })
      setStage('error')
      setErrors([
        {
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ])
      toast.error('Failed to parse CSV file')
    }
  }, [])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        toast.error('Invalid file type. Please upload a CSV file.')
        return
      }
      // Create a synthetic event for the file handler
      const syntheticEvent = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileChange(syntheticEvent)
    }
  }, [handleFileChange])

  const handleImport = async () => {
    if (!gymId) {
      toast.error('Gym ID not found')
      return
    }

    const membersToImport = (window as Window & { __bulkImportData?: Array<{ first_name: string; last_name: string; email?: string | null; phone_number?: string | null; status?: 'active' | 'inactive' | 'pending'; join_date?: string; gym_id: string }> }).__bulkImportData
    if (!membersToImport || membersToImport.length === 0) {
      toast.error('No valid members to import')
      return
    }

    setStage('importing')
    const failedMembers: Array<{ name: string; error: string }> = []

    try {
      // Prepare members with gym_id
      const membersWithGym = membersToImport.map(m => ({
        ...m,
        gym_id: gymId,
      }))

      // Bulk import all members in a single database operation
      setImportProgress(10)
      const bulkResult = await MemberManagementService.bulkCreateMembers(membersWithGym)
      setImportProgress(50)

      const successCount = bulkResult.success.length
      const failedCount = bulkResult.failed.length
      const createdMembers = bulkResult.success

      // Map failed members to user-friendly format
      for (const failure of bulkResult.failed) {
        const memberName = `${failure.data.first_name} ${failure.data.last_name}`.trim()
        const userFriendlyError = getUserFriendlyErrorMessage(new Error(failure.error))
        failedMembers.push({ name: memberName, error: userFriendlyError })
      }

      if (failedCount > 0) {
        logger.warn('Some members failed to import', { 
          successCount, 
          failedCount, 
          failures: bulkResult.failed 
        })
      }

      // Send portal invitations if checkbox was selected
      let invitationsSent = 0
      let invitationsFailed = 0

      if (sendInvitations && createdMembers.length > 0) {
        const membersWithEmail = createdMembers.filter(m => m.email && m.email.trim() !== '')
        
        for (let i = 0; i < membersWithEmail.length; i++) {
          const member = membersWithEmail[i]
          try {
            const result = await PortalService.enablePortalAccess(member.id)
            if (result.success) {
              invitationsSent++
            } else {
              invitationsFailed++
            }
          } catch (error) {
            logger.error('Failed to send invitation:', { memberId: member.id, error })
            invitationsFailed++
          }

          // Update progress (50-100% for invitation phase)
          const progress = 50 + Math.round(((i + 1) / membersWithEmail.length) * 50)
          setImportProgress(progress)
        }
      } else {
        setImportProgress(100)
      }

      setImportResults({ 
        success: successCount, 
        failed: failedCount,
        invitationsSent: sendInvitations ? invitationsSent : undefined,
        invitationsFailed: sendInvitations ? invitationsFailed : undefined,
        failedMembers: failedMembers.length > 0 ? failedMembers : undefined,
      })
      setStage('complete')

      if (failedCount === 0) {
        if (sendInvitations && invitationsSent > 0) {
          toast.success(`Successfully imported ${successCount} members and sent ${invitationsSent} portal invitations!`)
        } else {
          toast.success(`Successfully imported ${successCount} members!`)
        }
      } else {
        toast.warning(`Imported ${successCount} members. ${failedCount} failed.`)
      }

      // Clean up
      delete (window as Window & { __bulkImportData?: unknown }).__bulkImportData

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      logger.error('Bulk import error:', { error: error instanceof Error ? error.message : String(error) })
      setStage('error')
      toast.error('Bulk import failed')
    }
  }

  const renderContent = () => {
    switch (stage) {
      case 'upload':
        return (
          <div className="space-y-6">
            {/* Drag and Drop Upload Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
              }`}
            >
              {/* Icon with animation */}
              <div className={`mb-4 transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                {isDragging ? (
                  <FileSpreadsheet className="h-16 w-16 text-primary animate-bounce" />
                ) : (
                  <Upload className="h-16 w-16 text-gray-400" />
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2">
                {isDragging ? 'Drop your CSV file here' : 'Upload Member Data'}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Drag and drop your CSV file here, or click below to browse
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              
              <label htmlFor="csv-upload">
                <Button asChild size="lg" className="cursor-pointer">
                  <span>
                    <FileText className="h-5 w-5 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>

              <p className="text-xs text-muted-foreground mt-4">
                Supported format: .csv (up to 10MB)
              </p>
            </div>

            {/* Quick Start Guide */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Download Template Card */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">New to bulk import?</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Download our template with sample data to get started quickly
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadCSVTemplate}
                      className="w-full bg-white hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>

              {/* Requirements Card */}
              <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Format Requirements</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✓ <strong>Required:</strong> First Name, Last Name</p>
                      <p>✓ <strong>Optional:</strong> Email, Phone, Status, Join Date</p>
                      <p>✓ <strong>Status:</strong> active, inactive, or pending</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portal Invitations Option */}
            <div className="relative overflow-hidden p-5 bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-lg border border-green-200">
              <div className="absolute top-2 right-2">
                <Sparkles className="h-5 w-5 text-green-600 opacity-50" />
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-invitations"
                  checked={sendInvitations}
                  onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-2 flex-1">
                  <Label
                    htmlFor="send-invitations"
                    className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Auto-send portal invitations after import
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Members with valid email addresses will automatically receive an invitation 
                    to access their member portal. They can view their profile, attendance, and payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'validating':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary" />
              <Users className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium mb-1">Validating your data...</p>
              <p className="text-sm text-muted-foreground">
                Checking format and validating member information
              </p>
            </div>
          </div>
        )

      case 'validated':
        return (
          <div className="space-y-5">
            {/* Success Banner */}
            <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800 font-semibold">
                ✨ Validation Successful!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Your file has been validated and {validMembers} member{validMembers !== 1 ? 's are' : ' is'} ready to import
              </AlertDescription>
            </Alert>

            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <p className="text-xs font-medium text-muted-foreground">Total Rows</p>
                </div>
                <p className="text-3xl font-bold text-slate-700">{totalRows}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-muted-foreground">Valid Members</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{validMembers}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-muted-foreground">With Email</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{membersWithEmail}</p>
              </div>
            </div>

            {/* File Info */}
            {file && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <FileSpreadsheet className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetState()
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Preview Data Button */}
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview Data'}
            </Button>

            {/* Data Preview Table */}
            {showPreview && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-semibold">Data Preview (First 5 rows)</h4>
                </div>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">First Name</TableHead>
                        <TableHead className="w-[100px]">Last Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((window as Window & { __bulkImportData?: Array<{ first_name: string; last_name: string; email?: string | null; phone_number?: string | null; status?: string }> }).__bulkImportData || [])
                        .slice(0, 5)
                        .map((member, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{member.first_name}</TableCell>
                            <TableCell>{member.last_name}</TableCell>
                            <TableCell className="text-sm">
                              {member.email || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {member.phone_number || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {member.status || 'active'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {validMembers > 5 && (
                  <div className="bg-gray-50 px-4 py-2 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                      + {validMembers - 5} more member{validMembers - 5 !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Portal Invitations Option */}
            {membersWithEmail > 0 && (
              <div className="relative overflow-hidden p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="absolute top-2 right-2">
                  <Sparkles className="h-5 w-5 text-blue-600 opacity-50" />
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="send-invitations-validated"
                    checked={sendInvitations}
                    onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="space-y-2 flex-1">
                    <Label
                      htmlFor="send-invitations-validated"
                      className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Send portal invitations after import
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      We&apos;ll automatically send invitations to <strong>{membersWithEmail} member{membersWithEmail !== 1 ? 's' : ''}</strong> who have email addresses.
                      They&apos;ll receive an email with instructions to access their member portal.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'importing':
        return (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary" />
                <Users className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {importProgress <= 50 ? '🚀 Importing Members...' : '📧 Sending Invitations...'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {importProgress <= 50 
                  ? 'Creating member profiles in your gym database'
                  : 'Sending portal access invitations via email'}
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{importProgress}% complete</span>
              </div>
              <div className="relative">
                <Progress value={importProgress} className="h-3" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800 text-center">
                ⏱️ This may take a moment. Please don&apos;t close this window.
              </p>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-5">
            {/* Success/Partial Success Banner */}
            {importResults.failed === 0 ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  🎉 Import Complete!
                </h3>
                <p className="text-green-700">
                  All {importResults.success} member{importResults.success !== 1 ? 's have' : ' has'} been imported successfully
                </p>
              </div>
            ) : (
              <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <AlertTitle className="text-yellow-800 font-semibold">
                  Import Partially Complete
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  {importResults.success} member{importResults.success !== 1 ? 's were' : ' was'} imported successfully, but {importResults.failed} failed. Review the errors below.
                </AlertDescription>
              </Alert>
            )}

            {/* Results Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-600 rounded">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Successfully Imported</p>
                </div>
                <p className="text-4xl font-bold text-green-700">{importResults.success}</p>
              </div>
              
              {importResults.failed > 0 && (
                <div className="p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-600 rounded">
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Failed</p>
                  </div>
                  <p className="text-4xl font-bold text-red-700">{importResults.failed}</p>
                </div>
              )}
            </div>

            {/* Invitation Results */}
            {importResults.invitationsSent !== undefined && (
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-sm">Portal Invitations</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sent Successfully</p>
                    <p className="text-3xl font-bold text-blue-700">{importResults.invitationsSent}</p>
                  </div>
                  {importResults.invitationsFailed !== undefined && importResults.invitationsFailed > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Failed to Send</p>
                      <p className="text-3xl font-bold text-orange-600">{importResults.invitationsFailed}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Failed Members Details */}
            {importResults.failedMembers && importResults.failedMembers.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">Import Errors</AlertTitle>
                <AlertDescription>
                  <p className="mb-3 text-sm">The following members could not be imported:</p>
                  <ScrollArea className="h-[180px] border rounded-lg p-3 bg-white">
                    <div className="space-y-3">
                      {importResults.failedMembers.map((member, index) => (
                        <div key={index} className="p-3 bg-red-50/50 rounded border border-red-100">
                          <p className="font-semibold text-sm text-red-900">{member.name}</p>
                          <p className="text-xs text-red-700 mt-1">{member.error}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Next Steps */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                What&apos;s Next?
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Review your imported members in the members list</li>
                {importResults.invitationsSent && importResults.invitationsSent > 0 && (
                  <li>✓ Members will receive their portal invitations via email</li>
                )}
                <li>✓ You can add payment plans and track attendance</li>
              </ul>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="space-y-5">
            {/* Error Header */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-800 mb-2">
                Validation Failed
              </h3>
              <p className="text-red-600">
                Found {errors.length} error{errors.length !== 1 ? 's' : ''} in your CSV file
              </p>
            </div>

            {/* Error Summary */}
            <Alert variant="destructive" className="bg-gradient-to-r from-red-50 to-rose-50">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="font-semibold">What went wrong?</AlertTitle>
              <AlertDescription>
                Your CSV file has some formatting issues. Review the errors below and fix them in your file before uploading again.
              </AlertDescription>
            </Alert>

            {/* Errors List */}
            <div className="border-2 border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Errors Found ({errors.length})
                </h4>
              </div>
              <ScrollArea className="h-[280px] bg-white">
                <div className="p-4 space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-red-900 mb-1">
                            Row {error.row} • {error.field}
                          </p>
                          <p className="text-sm text-red-700 mb-2">{error.message}</p>
                          {error.value && (
                            <div className="p-2 bg-white border border-red-200 rounded text-xs font-mono text-red-600">
                              Value: &quot;{error.value}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* How to Fix */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-900">
                <Info className="h-4 w-4" />
                How to Fix These Errors
              </h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li>1. Open your CSV file in Excel or any spreadsheet editor</li>
                <li>2. Go to the row numbers mentioned above</li>
                <li>3. Fix the values according to the error messages</li>
                <li>4. Save the file and upload it again</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={downloadCSVTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Get Template
              </Button>
              <Button
                onClick={() => {
                  resetState()
                }}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderFooter = () => {
    switch (stage) {
      case 'validated':
        return (
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleImport} size="lg" className="flex-1 sm:flex-none">
              <Users className="h-4 w-4 mr-2" />
              Import {validMembers} Member{validMembers !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        )

      case 'complete':
        return (
          <DialogFooter>
            <Button onClick={handleClose} size="lg" className="w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          </DialogFooter>
        )

      case 'importing':
        return null

      default:
        return (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogFooter>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            Bulk Import Members
          </DialogTitle>
          <DialogDescription className="text-base">
            Import multiple members at once using a CSV file. Fast, easy, and reliable.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}

