// src/app/(app)/layout.tsx

import React from 'react'
import ClientLayout from './client-layout'

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  // Middleware handles all auth checks and redirects
  // This layout can now focus purely on rendering the app
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  )
}

export default AppLayout