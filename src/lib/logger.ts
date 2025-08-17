type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    // Skip debug logs in production
    if (!this.isDev && level === 'debug') return
    
    const timestamp = new Date().toISOString()
    const logData = { 
      timestamp, 
      level, 
      message, 
      environment: this.isDev ? 'development' : 'production',
      platform: this.isClient ? 'client' : 'server',
      ...context 
    }
    
    // Use appropriate console method
    const consoleMethod: keyof Console = level === 'debug' ? 'log' : level
    
    if (this.isDev) {
      // Pretty print in development
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '')
    } else {
      // Structured logging in production
      console[consoleMethod](JSON.stringify(logData))
    }
    
    // In production, could send to external logging service here
    if (!this.isDev && (level === 'error' || level === 'warn')) {
      // TODO: Send to external logging service (e.g., Sentry, LogRocket)
    }
  }
  
  debug = (message: string, context?: LogContext) => 
    this.log('debug', message, context)
  
  info = (message: string, context?: LogContext) => 
    this.log('info', message, context)
  
  warn = (message: string, context?: LogContext) => 
    this.log('warn', message, context)
  
  error = (message: string, context?: LogContext) => 
    this.log('error', message, context)
  
  // Auth-specific logging methods
  auth = {
    login: (message: string, context?: LogContext) => 
      this.info(`[AUTH] ${message}`, { component: 'auth', action: 'login', ...context }),
    
    logout: (message: string, context?: LogContext) => 
      this.info(`[AUTH] ${message}`, { component: 'auth', action: 'logout', ...context }),
    
    signup: (message: string, context?: LogContext) => 
      this.info(`[AUTH] ${message}`, { component: 'auth', action: 'signup', ...context }),
    
    error: (message: string, context?: LogContext) => 
      this.error(`[AUTH] ${message}`, { component: 'auth', ...context })
  }
  
  // Database-specific logging methods
  db = {
    query: (message: string, context?: LogContext) => 
      this.debug(`[DB] ${message}`, { component: 'database', ...context }),
    
    error: (message: string, context?: LogContext) => 
      this.error(`[DB] ${message}`, { component: 'database', ...context })
  }
  
  // Real-time specific logging methods
  realtime = {
    connect: (message: string, context?: LogContext) => 
      this.info(`[REALTIME] ${message}`, { component: 'realtime', action: 'connect', ...context }),
    
    disconnect: (message: string, context?: LogContext) => 
      this.info(`[REALTIME] ${message}`, { component: 'realtime', action: 'disconnect', ...context }),
    
    update: (message: string, context?: LogContext) => 
      this.debug(`[REALTIME] ${message}`, { component: 'realtime', action: 'update', ...context }),
    
    error: (message: string, context?: LogContext) => 
      this.error(`[REALTIME] ${message}`, { component: 'realtime', ...context })
  }
}

export const logger = new Logger()

// Performance measurement utility
export const performanceTracker = {
  start: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`)
    }
  },
  
  end: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
      
      const measure = performance.getEntriesByName(label)[0]
      if (measure) {
        logger.debug(`Performance: ${label}`, { duration: `${measure.duration.toFixed(2)}ms` })
      }
    }
  }
} 