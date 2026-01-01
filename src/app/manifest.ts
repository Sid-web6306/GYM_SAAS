import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Centric Fit - Fitness Management System',
    short_name: 'centricfit',
    description: 'Complete gym management solution with member tracking, analytics, and subscription management',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    id: 'centric-fit-pwa',
    scope: '/',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View gym analytics and overview',
        url: '/dashboard',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Members',
        short_name: 'Members',
        description: 'Manage gym members',
        url: '/members',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Settings',
        short_name: 'Settings',
        description: 'App settings and preferences',
        url: '/settings',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      }
    ],
  }
}
