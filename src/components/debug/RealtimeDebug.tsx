'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRealtimeStatus } from '@/components/providers/realtime-provider-simple'
import { useMembers, useMembersStats } from '@/hooks/use-members-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function RealtimeDebug({ debugVisibleProp }: { debugVisibleProp: boolean }) {
  const { profile, isAuthenticated } = useAuth()
  const { isConnected, subscriptionCount } = useRealtimeStatus()
  const [debugVisible, setDebugVisible] = useState(debugVisibleProp)
  
  const { data: members, refetch: refetchMembers } = useMembers(profile?.gym_id || null)
  const { data: stats, refetch: refetchStats } = useMembersStats(profile?.gym_id || null)

  if (!debugVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setDebugVisible(true)}
        >
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Realtime Debug
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setDebugVisible(false)}
            >
              ✕
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Subscriptions:</span>
            <Badge variant="secondary">{subscriptionCount}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Authenticated:</span>
            <Badge variant={isAuthenticated ? "default" : "destructive"}>
              {isAuthenticated ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Gym ID:</span>
            <span className="font-mono text-xs truncate w-32">
              {profile?.gym_id || 'None'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Members Count:</span>
            <Badge variant="outline">{members?.totalCount || 0}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Stats Total:</span>
            <Badge variant="outline">{stats?.total || 0}</Badge>
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={() => {
                console.log('🔄 Manual refetch - Members')
                refetchMembers()
              }}
            >
              Refetch Members
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={() => {
                console.log('🔄 Manual refetch - Stats')
                refetchStats()
              }}
            >
              Refetch Stats
            </Button>
            <div className="text-xs text-muted-foreground pt-1 space-y-1">
              <div>Last update: {new Date().toLocaleTimeString()}</div>
              <div className="text-blue-600">Multi-tab sync: Enabled</div>
              <div className="text-green-600">Window focus refetch: Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 