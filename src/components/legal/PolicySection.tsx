import type { ReactNode } from 'react'

interface PolicySectionProps {
  title: string
  children: ReactNode
}

export default function PolicySection({ title, children }: PolicySectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-700 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  )
}