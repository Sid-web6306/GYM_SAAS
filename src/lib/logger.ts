interface LogContext {
  [key: string]: unknown
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// const isDev = process.env.NODE_ENV === 'development'
const minLevel: LogLevel = 'info'

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const icons: Record<LogLevel, string> = { debug: '🔍', info: '✅', warn: '⚠️', error: '❌' }
const colors: Record<LogLevel, string> = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' }
const reset = '\x1b[0m'

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[minLevel]
}

function formatContext(ctx?: LogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return ''
  return ` ${JSON.stringify(ctx)}`
}

function log(level: LogLevel, message: string, context?: LogContext) {
  // Completely suppress all logs in the browser environment (Inspect console)
  if (typeof window !== 'undefined') {
    return
  }

  if (!shouldLog(level)) return
  
  const time = new Date().toISOString().slice(11, 19) // HH:MM:SS
  const ctx = formatContext(context)
  
  // Colored server logs for the terminal
  const color = colors[level]
  const icon = icons[level]
  const logMessage = `${color}${icon} [${time}] ${message}${ctx}${reset}\n`

  // Use process.stdout.write if available (better for server-only logs in some environments)
  // otherwise fallback to console.
  const g = globalThis as any
  if (typeof g.process !== 'undefined' && g.process.stdout) {
    g.process.stdout.write(logMessage)
  } else {
    console[level](logMessage.trim())
  }
}

class Logger {
  // Core logging methods - clean and simple
  debug = (message: string, context?: LogContext) => log('debug', message, context)
  info = (message: string, context?: LogContext) => log('info', message, context)
  warn = (message: string, context?: LogContext) => log('warn', message, context)
  error = (message: string, context?: LogContext) => log('error', message, context)
  
  // Domain-specific loggers - cleaner prefixes
  auth = {
    login: (msg: string, ctx?: LogContext) => this.info(`[AUTH] ${msg}`, { ...ctx, action: 'login' }),
    logout: (msg: string, ctx?: LogContext) => this.info(`[AUTH] ${msg}`, { ...ctx, action: 'logout' }),
    signup: (msg: string, ctx?: LogContext) => this.info(`[AUTH] ${msg}`, { ...ctx, action: 'signup' }),
    error: (msg: string, ctx?: LogContext) => this.error(`[AUTH] ${msg}`, ctx),
  }
  
  db = {
    query: (msg: string, ctx?: LogContext) => this.debug(`[DB] ${msg}`, ctx),
    error: (msg: string, ctx?: LogContext) => this.error(`[DB] ${msg}`, ctx),
  }
  
  realtime = {
    connect: (msg: string, ctx?: LogContext) => this.info(`[RT] ${msg}`, ctx),
    disconnect: (msg: string, ctx?: LogContext) => this.info(`[RT] ${msg}`, ctx),
    update: (msg: string, ctx?: LogContext) => this.debug(`[RT] ${msg}`, ctx),
    error: (msg: string, ctx?: LogContext) => this.error(`[RT] ${msg}`, ctx),
  }
  
  email = {
    send: (msg: string, ctx?: LogContext) => this.info(`[EMAIL] ${msg}`, ctx),
    error: (msg: string, ctx?: LogContext) => this.error(`[EMAIL] ${msg}`, ctx),
  }
  
  payment = {
    process: (msg: string, ctx?: LogContext) => this.info(`[PAY] ${msg}`, ctx),
    error: (msg: string, ctx?: LogContext) => this.error(`[PAY] ${msg}`, ctx),
  }
}

export const logger = new Logger()

// Utility to help identify and manage logs
export const logUtils = {
  // Helper to create a log message that's easy to search for
  withTag: (tag: string, message: string) => `[${tag}] ${message}`,
  
  // Helper to create consistent component-based logging
  component: (componentName: string) => ({
    info: (message: string, context?: LogContext) => 
      logger.info(logUtils.withTag(componentName.toUpperCase(), message), { component: componentName, ...context }),
    
    debug: (message: string, context?: LogContext) => 
      logger.debug(logUtils.withTag(componentName.toUpperCase(), message), { component: componentName, ...context }),
    
    warn: (message: string, context?: LogContext) => 
      logger.warn(logUtils.withTag(componentName.toUpperCase(), message), { component: componentName, ...context }),
    
    error: (message: string, context?: LogContext) => 
      logger.error(logUtils.withTag(componentName.toUpperCase(), message), { component: componentName, ...context }),
  }),
  
  // Helper to create temporary logs that can be easily found and removed
  temp: {
    info: (message: string, context?: LogContext) => 
      logger.info(logUtils.withTag('TEMP', message), { isTemporary: true, ...context }),
    
    debug: (message: string, context?: LogContext) => 
      logger.debug(logUtils.withTag('TEMP', message), { isTemporary: true, ...context }),
    
    warn: (message: string, context?: LogContext) => 
      logger.warn(logUtils.withTag('TEMP', message), { isTemporary: true, ...context }),
    
    error: (message: string, context?: LogContext) => 
      logger.error(logUtils.withTag('TEMP', message), { isTemporary: true, ...context }),
  }
}

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