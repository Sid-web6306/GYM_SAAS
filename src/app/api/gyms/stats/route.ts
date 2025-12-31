import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// GET /api/gyms/stats - Get gym statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gym_id')

    if (!gymId) {
      return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 })
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, gymId, 'gym.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch members data for stats
    const { data: members, error } = await supabase
      .from('members')
      .select('created_at, status, join_date')
      .eq('gym_id', gymId)

    if (error) {
      logger.error('Failed to fetch members for stats:', { error })
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    
    // Calculate comprehensive stats
    const totalMembers = members.length
    const activeMembers = members.filter(m => m.status === 'active').length
    const inactiveMembers = members.filter(m => m.status === 'inactive').length
    const pendingMembers = members.filter(m => m.status === 'pending').length
    
    const newMembersThisMonth = members.filter(m => 
      new Date(m.created_at) >= startOfMonth
    ).length
    
    const newMembersThisWeek = members.filter(m => 
      new Date(m.created_at) >= startOfWeek
    ).length

    // Revenue calculations (you can adjust pricing logic)
    const monthlyRevenue = activeMembers * 50 // $50 per active member
    const projectedMonthlyRevenue = totalMembers * 50 // Potential if all were active
    
    // Mock check-in data (replace with actual data when available)
    const todayCheckins = Math.floor(Math.random() * (activeMembers * 0.5)) + Math.floor(activeMembers * 0.1)
    const averageDailyCheckins = Math.floor(activeMembers * 0.3)
    
    // Calculate retention rate (simplified - you may want more sophisticated calculation)
    const memberRetentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0
    
    // Average membership length (simplified calculation)
    const averageMembershipLength = members.reduce((acc, member) => {
      const joinDate = new Date(member.join_date || member.created_at)
      const monthsDiff = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return acc + Math.max(monthsDiff, 0)
    }, 0) / Math.max(totalMembers, 1)

    const stats = {
      totalMembers,
      activeMembers,
      inactiveMembers,
      pendingMembers,
      newMembersThisMonth,
      newMembersThisWeek,
      monthlyRevenue,
      projectedMonthlyRevenue,
      todayCheckins,
      averageDailyCheckins,
      memberRetentionRate: Math.round(memberRetentionRate * 100) / 100,
      averageMembershipLength: Math.round(averageMembershipLength * 100) / 100,
    }

    return NextResponse.json({ stats })

  } catch (error) {
    logger.error('Gym stats GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
