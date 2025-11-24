import { NextResponse } from 'next/server'
import { sendInvitationEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Partial<{
      to: string
      inviterName: string
      inviterEmail: string
      gymName: string
      role: string
      message: string
      expiresInHours: number
      inviteUrl: string
    }>

    const recipientEmail = body.to || 'test-recipient@example.com'
    const inviterName = body.inviterName || 'Gym Admin'
    const inviterEmail = body.inviterEmail || 'test-inviter@example.com'
    const gymName = body.gymName || 'Centric Fit Demo'
    const role = body.role || 'manager'
    const message = body.message || 'Welcome to the team! This is a test invitation email sent via Resend.'
    const expiresAt = new Date(Date.now() + (body.expiresInHours || 72) * 60 * 60 * 1000).toISOString()

    // Use provided inviteUrl if present (for e2e tests); otherwise use a placeholder
    const inviteUrl = body.inviteUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/onboarding?invite=sample-token`

    const result = await sendInvitationEmail({
      recipientEmail,
      inviterName,
      inviterEmail,
      gymName,
      role,
      message,
      inviteUrl,
      expiresAt,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Unknown error' }, { status: 400 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: 'POST to this endpoint with JSON: { to, inviterName?, gymName?, role?, message?, expiresInHours?, inviteUrl? }',
  })
}
