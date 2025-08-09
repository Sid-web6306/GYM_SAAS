'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  generateInvitationEmailHTML, 
  generateInvitationEmailText, 
  generateInvitationSubject,
  generateInvitationPreview,
  type InvitationEmailData 
} from '@/lib/email-templates/invitation-email'
import { Eye, Copy, Mail } from 'lucide-react'

export default function EmailPreviewPage() {
  const [emailData, setEmailData] = useState<InvitationEmailData>({
    recipientEmail: 'john.doe@example.com',
    recipientName: 'John Doe',
    inviterName: 'Sarah Johnson',
    inviterEmail: 'sarah.johnson@example.com',
    gymName: 'FitZone Premium',
    role: 'manager',
    message: 'Welcome to our team! We\'re excited to have you join FitZone Premium as a manager. Your experience in fitness management will be a great addition to our team.',
    inviteUrl: 'https://yourgym.com/onboarding?invite=abc123def456ghi789',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours from now
  })

  const [activeTab, setActiveTab] = useState('preview')

  const htmlContent = generateInvitationEmailHTML(emailData)
  const textContent = generateInvitationEmailText(emailData)
  const subject = generateInvitationSubject(emailData.gymName, emailData.role)
  const preview = generateInvitationPreview(emailData.inviterName, emailData.gymName)

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      trainer: 'bg-orange-100 text-orange-800',
      member: 'bg-gray-100 text-gray-800'
    }
    return colors[role as keyof typeof colors] || colors.member
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Email Template Preview</h1>
          <p className="text-gray-600">Preview and test the invitation email templates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Configuration
                </CardTitle>
                <CardDescription>
                  Customize the email content to see how it looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    value={emailData.recipientEmail}
                    onChange={(e) => setEmailData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                    placeholder="recipient@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                  <Input
                    id="recipientName"
                    value={emailData.recipientName || ''}
                    onChange={(e) => setEmailData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="inviterName">Inviter Name</Label>
                  <Input
                    id="inviterName"
                    value={emailData.inviterName}
                    onChange={(e) => setEmailData(prev => ({ ...prev, inviterName: e.target.value }))}
                    placeholder="Sarah Johnson"
                  />
                </div>

                <div>
                  <Label htmlFor="gymName">Gym Name</Label>
                  <Input
                    id="gymName"
                    value={emailData.gymName}
                    onChange={(e) => setEmailData(prev => ({ ...prev, gymName: e.target.value }))}
                    placeholder="FitZone Premium"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={emailData.role} onValueChange={(value) => setEmailData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={emailData.message || ''}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Add a personal message..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="inviteUrl">Invite URL</Label>
                  <Input
                    id="inviteUrl"
                    value={emailData.inviteUrl}
                    onChange={(e) => setEmailData(prev => ({ ...prev, inviteUrl: e.target.value }))}
                    placeholder="https://yourgym.com/onboarding?invite=..."
                  />
                </div>

                {/* Email Metadata */}
                <div className="pt-4 border-t space-y-2">
                  <div className="text-sm">
                    <strong>Subject:</strong> {subject}
                  </div>
                  <div className="text-sm">
                    <strong>Preview:</strong> {preview}
                  </div>
                  <div className="text-sm">
                    <strong>Role Badge:</strong> 
                    <Badge className={`ml-2 ${getRoleBadgeColor(emailData.role)}`}>
                      {emailData.role.charAt(0).toUpperCase() + emailData.role.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    <CardTitle>Email Preview</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(htmlContent)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy HTML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textContent)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Text
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preview">HTML Preview</TabsTrigger>
                    <TabsTrigger value="text">Text Version</TabsTrigger>
                    <TabsTrigger value="code">HTML Code</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 text-sm font-medium border-b">
                        Email Client Preview
                      </div>
                      <div 
                        className="bg-white min-h-[600px] overflow-auto"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 text-sm font-medium border-b">
                        Plain Text Version
                      </div>
                      <pre className="p-4 text-sm bg-white whitespace-pre-wrap overflow-auto max-h-[600px]">
                        {textContent}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="code" className="mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 text-sm font-medium border-b flex items-center justify-between">
                        <span>HTML Source Code</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(htmlContent)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="p-4 text-xs bg-white overflow-auto max-h-[600px]">
                        <code>{htmlContent}</code>
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 How to Test the Complete Flow</CardTitle>
            <CardDescription>
              Follow these steps to test the complete invitation system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-blue-800 font-semibold mb-2">1. Send Invitation</div>
                <div className="text-blue-700 text-sm">
                  Go to Settings → Team Management and send an invitation to test the email generation.
                </div>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800 font-semibold mb-2">2. Check Logs</div>
                <div className="text-green-700 text-sm">
                  In development mode, emails are logged to the console. Check for the email content.
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-orange-800 font-semibold mb-2">3. Test Signup</div>
                <div className="text-orange-700 text-sm">
                  Copy the invite URL from the logs and test the signup flow in an incognito window.
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-purple-800 font-semibold mb-2">4. Verify Onboarding</div>
                <div className="text-purple-700 text-sm">
                  Complete the signup and verify that the invitation acceptance flow works correctly.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
