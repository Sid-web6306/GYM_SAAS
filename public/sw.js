const CACHE_NAME = 'centric-fit-v2'
const STATIC_CACHE = 'centric-fit-static-v2'

// Basic files to cache
const STATIC_ASSETS = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
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

  // Skip API calls, auth callbacks, and external resources
  if (
    request.url.includes('/api/') ||
    request.url.includes('/auth/') ||
    request.url.includes('supabase.co') ||
    request.url.includes('googleusercontent.com') ||
    request.url.includes('razorpay.com')
  ) return

  // Strategy: Network First for HTML, Cache First for assets
  if (request.headers.get('accept')?.includes('text/html') || request.url.includes('_rsc=')) {
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
              if (cachedResponse) return cachedResponse
              // For navigation requests, return the offline page
              if (request.mode === 'navigate') {
                return caches.match('/offline')
              }
              return null
            })
        })
    )
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse

          return fetch(request).then((response) => {
            // Only cache valid responses and static assets
            const isManifest = response.url.includes('manifest.json') || response.url.includes('manifest.webmanifest')

            if (response.ok && !isManifest && (
              response.url.includes('/_next/static/') ||
              response.url.includes('.png') ||
              response.url.includes('.svg') ||
              response.url.includes('.json')
            )) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          }).catch(() => {
            // Fallback for manifest or navigation if fetch fails
            if (request.url.includes('manifest.json')) {
              return caches.match('/manifest.json') // Fallback if we happen to have it, though we try not to cache it
            }
            return caches.match(request)
          })
        })
    )
  }
})
