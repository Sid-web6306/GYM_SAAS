// Simple Service Worker for PWA functionality
// No hardcoded chunk precaching to avoid build conflicts

const CACHE_NAME = 'gym-saas-v1'
const STATIC_CACHE = 'gym-saas-static-v1'

// Basic files to cache (avoiding dynamic chunks)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline'
]

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline')))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip API calls and auth callbacks
  if (request.url.includes('/api/') || request.url.includes('/auth/')) return
  
  // Network first for HTML pages, Cache first for static assets
  if (request.headers.get('accept')?.includes('text/html')) {
    // Network first strategy for pages
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/')
            })
        })
    )
  } else {
    // Cache first strategy for static assets  
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          
          return fetch(request)
            .then((response) => {
              if (response.ok && response.url.includes('/_next/static/')) {
                const responseClone = response.clone()
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone)
                })
              }
              return response
            })
        })
    )
  }
})

// Handle background sync (optional)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered')
})

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('Push notification received')
})
