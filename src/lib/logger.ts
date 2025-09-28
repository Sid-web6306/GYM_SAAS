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
    // Custom message formatting to include file:line info
    messageKey: 'message',
    // Avoid transport worker threads that cause Next.js bundling issues
    // Pretty formatting will be handled by pino's default console output
  })
}

class Logger {
  private pinoLogger = createPinoLogger()
  private isDev = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'
  
  private getCallerInfo(): { file: string; line: number; function?: string } {
    const stack = new Error().stack
    if (!stack) {
      return { file: 'unknown', line: 0 }
    }

    const stackLines = stack.split('\n')
    
    // Skip the first 3 lines:
    // 1. Error message
    // 2. This function (getCallerInfo)
    // 3. The log method (debug/info/warn/error)
    // 4. The actual caller
    const callerLine = stackLines[3]
    
    if (!callerLine) {
      return { file: 'unknown', line: 0 }
    }

    // Parse different stack trace formats
    // Format 1: "    at Logger.log (/path/to/file.ts:123:45)"
    // Format 2: "    at Object.<anonymous> (/path/to/file.ts:123:45)"
    // Format 3: "    at /path/to/file.ts:123:45"
    const match = callerLine.match(/at\s+(?:.*?\s+)?(?:\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))/) ||
                  callerLine.match(/at\s+(.+?):(\d+):(\d+)/)
    
    if (match) {
      const file = match[1] || match[4] || match[1]
      const line = parseInt(match[2] || match[5] || match[2], 10)
      
      // Extract just the filename from the full path
      const fileName = file.split('/').pop() || file
      
      return {
        file: fileName,
        line: line || 0,
        function: match[0]?.includes('at ') ? match[0].split('at ')[1]?.split(' ')[0] : undefined
      }
    }

    return { file: 'unknown', line: 0 }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    // Enhanced logging with Pino backend but same API
    const callerInfo = this.getCallerInfo()
    
    // Format message with file:line info for better debugging
    const formattedMessage = this.isDev 
      ? `${message} [${callerInfo.file}:${callerInfo.line}]`
      : message
    
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: this.isDev ? 'development' : 'production',
      platform: this.isClient ? 'client' : 'server',
      file: callerInfo.file,
      line: callerInfo.line,
      ...(callerInfo.function && { function: callerInfo.function }),
    }
    
    // Use Pino for high-performance terminal logging
    // Development: Pretty formatted with colors
    // Production: Structured JSON to stdout/stderr
    this.pinoLogger[level](enrichedContext, formattedMessage)
  }
  
  debug = (message: string, context?: LogContext) => 
    this.log('debug', message, context)
  
  info = (message: string, context?: LogContext) => 
    this.log('info', message, context)
  
  warn = (message: string, context?: LogContext) => 
    this.log('warn', message, context)
  
  error = (message: string, context?: LogContext) => 
    this.log('error', message, context)
  
  // Utility method to log with explicit file/line override (useful for debugging)
  logWithLocation = (level: LogLevel, message: string, file: string, line: number, context?: LogContext) => {
    const formattedMessage = this.isDev 
      ? `${message} [${file}:${line}]`
      : message
    
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: this.isDev ? 'development' : 'production',
      platform: this.isClient ? 'client' : 'server',
      file,
      line,
    }
    
    this.pinoLogger[level](enrichedContext, formattedMessage)
  }
  
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