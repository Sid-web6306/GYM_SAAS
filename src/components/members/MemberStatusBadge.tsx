import { Badge } from '@/components/ui/badge'
import type { MemberStatus } from '@/types/member.types'

interface MemberStatusBadgeProps {
  status: MemberStatus | null
}

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
          Active
        </Badge>
      )
    case 'inactive':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Inactive
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
          Pending
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          Unknown
        </Badge>
      )
  }
} 