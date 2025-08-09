// src/lib/config-checker.ts

import { validateEmailConfig } from './email-service';

/**
 * Configuration checker for email and other services
 */
export function checkEmailConfiguration() {
  console.log('\n🔧 === EMAIL CONFIGURATION CHECK ===');
  
  const config = validateEmailConfig();
  
  // Display current configuration
  const provider = process.env.EMAIL_PROVIDER || 'development';
  const fromEmail = process.env.FROM_EMAIL || 'not set';
  
  console.log(`Provider: ${provider}`);
  console.log(`From Email: ${fromEmail}`);
  
  // Display warnings
  if (config.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    config.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  // Display errors
  if (config.errors.length > 0) {
    console.log('\n❌ Errors:');
    config.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  // Display status
  if (config.valid) {
    console.log('\n✅ Email configuration is valid!');
  } else {
    console.log('\n❌ Email configuration has errors - using development mode');
  }
  
  // Display helpful information
  if (provider === 'development' || !process.env.EMAIL_PROVIDER) {
    console.log('\n📧 Development Mode:');
    console.log('   • Emails will be logged to console');
    console.log('   • No real emails will be sent');
    console.log('   • Safe for testing invitation flow');
    console.log('\n🚀 To enable Resend:');
    console.log('   1. Add EMAIL_PROVIDER=resend to .env.local');
    console.log('   2. Add RESEND_API_KEY=re_xxx to .env.local');
    console.log('   3. Add FROM_EMAIL=noreply@yourdomain.com to .env.local');
    console.log('   4. Restart your development server');
  }
  
  console.log('=====================================\n');
  
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
