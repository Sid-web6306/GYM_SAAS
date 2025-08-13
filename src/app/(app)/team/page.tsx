'use client'
import { PageHeader } from '@/components/layout/PageHeader'
import { TeamTab } from '@/components/settings/TeamTab'
import { ManagerOnly, AccessDenied } from '@/components/rbac/rbac-guards'

export default function TeamPage() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Team"
        description="Invite and manage team members for your gym"
      />

      <ManagerOnly
        fallback={
          <div className="p-8">
            <AccessDenied message="Team management is only available to managers and gym owners. Contact your gym owner to request manager privileges." />
          </div>
        }
      >
        <TeamTab />
      </ManagerOnly>
    </div>
  )
}


