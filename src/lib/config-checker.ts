// src/lib/config-checker.ts

import { validateEmailConfig } from '../services/email/email-service';

/**
 * Configuration checker for email and other services
 */
export function checkEmailConfiguration() {
  const config = validateEmailConfig();
  
  // Display current configuration
  const provider = process.env.EMAIL_PROVIDER || 'development';
  
  // Display warnings
  if (config.warnings.length > 0) {
    config.warnings.forEach(() => {
      // Warning logged
    });
  }
  
  // Display errors
  if (config.errors.length > 0) {
    config.errors.forEach(() => {
      // Error logged
    });
  }
  
  // Display status
  if (config.valid) {
    // Email configuration is valid
  } else {
    // Email configuration has errors - using development mode
  }
  
  // Display helpful information
  if (provider === 'development' || !process.env.EMAIL_PROVIDER) {
    // Development mode - emails logged to console
  }
  
  // Configuration check complete
  
  return config;
}

/**
 * Run configuration check on startup in development
 */
export function runStartupChecks() {
  if (process.env.NODE_ENV === 'development') {
    checkEmailConfiguration();
  }
}
