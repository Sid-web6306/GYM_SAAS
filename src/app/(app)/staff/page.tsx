'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Mail, BookUser, Crown, Dumbbell } from 'lucide-react'
import { ROLE_COLORS } from '@/components/layout/RoleContextIndicator'
import { StaffManagementGuard, AccessDenied } from '@/components/rbac/rbac-guards'

type StaffProfile = {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  default_role: 'owner' | 'manager' | 'staff' | 'trainer' | 'member'
}

export default function StaffPage() {
  const { profile } = useAuth()
  const gymId = profile?.gym_id || null

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', 'list', gymId],
    enabled: !!gymId,
    queryFn: async (): Promise<StaffProfile[]> => {
      if (!gymId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, default_role')
        .eq('gym_id', gymId)
        .in('default_role', ['staff', 'trainer', 'owner'])
        .order('full_name', { ascending: true })
      if (error) throw error
      return (data || []) as StaffProfile[]
    }
  })

  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const list = data || []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(p =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Staff Directory"
        description="All staff and trainers in your gym"
      />

      <StaffManagementGuard
        action="read"
        fallback={<AccessDenied message="You don't have permission to view staff." />}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookUser className="h-5 w-5" /> Owners, Staff & Trainers
                </CardTitle>
                <CardDescription>All staff and trainers associated with your gym</CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground">Loading staff...</div>
            ) : error ? (
              <div className="text-destructive">Failed to load staff</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No staff or trainers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name || 'Unnamed'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5" /> {p.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {p.default_role === 'trainer' && (
                                <>
                                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline" className={`${ROLE_COLORS.trainer} capitalize`}>Trainer</Badge>
                                </>
                              )}
                              {p.default_role === 'staff' && (
                                <>
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline" className={`${ROLE_COLORS.staff} capitalize`}>Staff</Badge>
                                </>
                              )}
                              {p.default_role === 'owner' && (
                                <>
                                  <Crown className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline" className={`${ROLE_COLORS.owner} capitalize`}>Owner</Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </StaffManagementGuard>
    </div>
  )
}


