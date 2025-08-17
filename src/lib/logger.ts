import pino from 'pino'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

// Centralized logging configuration
const createPinoLogger = () => {
  const isDev = process.env.NODE_ENV === 'development'
  const isClient = typeof window !== 'undefined'
  
  // Use simple console-based logging to avoid worker thread issues in Next.js
  return pino({
    level: isDev ? 'debug' : 'info',
    browser: {
      asObject: true,
    },
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: {
      environment: isDev ? 'development' : 'production',
      platform: isClient ? 'client' : 'server',
    },
    // Avoid transport worker threads that cause Next.js bundling issues
    // Pretty formatting will be handled by pino's default console output
  })
}

class Logger {
  private pinoLogger = createPinoLogger()
  private isDev = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    // Enhanced logging with Pino backend but same API
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: this.isDev ? 'development' : 'production',
      platform: this.isClient ? 'client' : 'server',
    }
    
    // Use Pino for high-performance terminal logging
    // Development: Pretty formatted with colors
    // Production: Structured JSON to stdout/stderr
    this.pinoLogger[level](enrichedContext, message)
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