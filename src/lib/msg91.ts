// MSG91 API client for email services
import { logger } from './logger'
import { serverConfig } from './config'

export interface MSG91EmailParams {
  to: string[]
  from: string
  from_name?: string
  reply_to?: string
  subject: string
  html: string
  text?: string
  templateId?: string
  variables?: Record<string, string>
}

interface MSG91TemplateEmailParams {
  to: { email: string; name?: string }[]
  from: {
    email: string
    name: string
  }
  template_id: string
  variables?: Record<string, string>
  domain?: string
}



export interface MSG91EmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send email via MSG91 Template API
 */
export async function sendTemplateEmailViaMSG91(params: MSG91TemplateEmailParams): Promise<MSG91EmailResponse> {
  try {
    const { msg91ApiKey } = serverConfig

    // Prepare conditional message variables for MSG91 template
    const hasMessage = params.variables?.message && params.variables.message.trim() !== ''
    
    const payload = {
      "recipients": [
        {
          "to": [
            {
              "email": params.to[0].email,
              "name": params.to[0].name || params.to[0].email.split('@')[0]
            }
          ],
          "variables": {
            "gymName": params.variables?.gymName || '',
            "inviterName": params.variables?.inviterName || '',
            "role": params.variables?.role || '',
            "#if message": hasMessage ? 'true' : 'false',
            "message": params.variables?.message || '',
            "/if": hasMessage ? 'true' : 'false',
            "inviteUrl": params.variables?.inviteUrl || '',
            "expiresAt": params.variables?.expiresAt || '',
            "recipientEmail": params.to[0].email
          }
        }
      ],
      "from": {
        "email": `no-reply@${params.domain || 'yourgym.com'}`
      },
      "domain": params.domain || serverConfig.msg91EmailDomain || 'yourgym.com',
      "template_id": params.template_id
    }

    logger.info('Sending template email via MSG91:', {
      template_id: params.template_id,
      to: params.to.map((t: { email: string }) => t.email),
      variables: Object.keys(params.variables || {})
    })

    const response = await fetch('https://api.msg91.com/api/v5/email/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authkey': msg91ApiKey
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    // Log full MSG91 response for debugging
    logger.info('MSG91 API Response:', {
      status: response.status,
      ok: response.ok,
      response: responseData
    })

    if (!response.ok) {
      logger.error('MSG91 Template API error:', {
        status: response.status,
        error: responseData
      })
      
      let errorMessage = 'MSG91 Template API error'
      
      if (response.status === 401) {
        errorMessage = 'MSG91 API key is invalid or expired. Please verify your MSG91_API_KEY in the dashboard and update your .env.local file.'
      } else if (response.status === 422) {
        errorMessage = 'MSG91 Template validation error. Please check your template ID and variables. Create and approve templates in MSG91 dashboard first.'
      } else if (responseData.message) {
        errorMessage = `MSG91 Error: ${responseData.message}`
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }

    logger.info('Template email sent successfully via MSG91:', {
      messageId: responseData
    })

    return {
      success: true,
      messageId: responseData.message_id || responseData.data?.unique_id
    }
  } catch (error) {
    logger.error('MSG91 template email error:', { error: String(error) })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown MSG91 template error'
    }
  }
}

/**
 * Send email via MSG91 Email API
 */
// export async function sendEmailViaMSG91(params: MSG91EmailParams): Promise<MSG91EmailResponse> {
//   try {
//     const { msg91ApiKey, msg91EmailDomain, msg91BrandName, msg91InvitationTemplateId } = serverConfig
    
//     if (!msg91ApiKey) {
//       return {
//         success: false,
//         error: 'MSG91_API_KEY environment variable not configured. Please add MSG91_API_KEY to your .env.local file.'
//       }
//     }

//     // Validate API key format
//     if (!msg91ApiKey.match(/^[A-Za-z0-9]{20,}$/)) {
//       return {
//         success: false,
//         error: 'MSG91 API key appears to be invalid. Please check your MSG91_API_KEY in .env.local file.'
//       }
//     }

//     // Check if template ID is provided (either in params or config)
//     const templateId = params.templateId || msg91InvitationTemplateId
    
//     if (templateId) {
//       logger.info('Using MSG91 template for email sending:', { templateId })
      
//       // Use template-based sending
//       const templateParams: MSG91TemplateEmailParams = {
//         to: params.to.map(email => ({ email })),
//         from: {
//           email: params.from,
//           name: params.from_name || msg91BrandName
//         },
//         template_id: templateId,
//         variables: params.variables || {},
//         domain: msg91EmailDomain || undefined
//       }
      
//       return await sendTemplateEmailViaMSG91(templateParams)
//     }

//     // Convert email array to MSG91 format
//     const recipients = params.to.map(email => ({ email }))
    
//     const payload: MSG91EmailPayload = {
//       to: recipients,
//       from: {
//         email: params.from,
//         name: params.from_name || msg91BrandName // Use registered brand name
//       },
//       subject: params.subject,
//       body: {
//         data: params.html,
//         type: 'html'
//       }
//     }

//     // Add optional fields
//     if (params.reply_to) {
//       payload.reply_to = params.reply_to
//     }
    
//     if (params.text) {
//       payload.text_body = params.text
//     }

//     // Only add domain if it's configured and not a default/example domain
//     if (msg91EmailDomain && 
//         !msg91EmailDomain.includes('example.com') && 
//         !msg91EmailDomain.includes('test.com')) {
//       payload.domain = msg91EmailDomain
//     }

//     logger.info('Sending email via MSG91:', {
//       to: params.to,
//       subject: params.subject,
//       from: params.from,
//       brand: params.from_name || msg91BrandName
//     })

//     const response = await fetch('https://api.msg91.com/api/v5/email/send', {
//       method: 'POST',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'Authkey': msg91ApiKey
//       },
//       body: JSON.stringify(payload)
//     })

//     const responseData = await response.json()

//     if (!response.ok) {
//       logger.error('MSG91 API error:', {
//         status: response.status,
//         error: responseData
//       })
      
//       // Provide specific error messages for common issues
//       let errorMessage = 'MSG91 API error'
      
//       if (response.status === 401) {
//         errorMessage = 'MSG91 API key is invalid or expired. Please verify your MSG91_API_KEY in the dashboard and update your .env.local file.'
//       } else if (response.status === 403) {
//         errorMessage = 'MSG91 account does not have permission for email sending. Please check your MSG91 plan and email service activation.'
//       } else if (response.status === 429) {
//         errorMessage = 'MSG91 rate limit exceeded. Please try again in a few minutes.'
//       } else if (response.status === 422) {
//         errorMessage = 'MSG91 validation error. Please check that your brand name matches your registered MSG91 account.'
//       } else if (responseData.message) {
//         errorMessage = `MSG91 Error: ${responseData.message}`
//       }
      
//       return {
//         success: false,
//         error: errorMessage
//       }
//     }

//     logger.info('Email sent successfully via MSG91:', {
//       messageId: responseData.message_id || responseData.data?.message_id
//     })

//     return {
//       success: true,
//       messageId: responseData.message_id || responseData.data?.message_id || 'msg91-' + Date.now()
//     }

//   } catch (error) {
//     logger.error('MSG91 email error:', { error: String(error) })
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown MSG91 error'
//     }
//   }
// }



/**
 * Validate MSG91 configuration
 */
export function validateMSG91Config(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  const { msg91ApiKey, msg91EmailDomain, systemFromEmail } = serverConfig
  
  if (!msg91ApiKey) {
    errors.push('MSG91_API_KEY environment variable is required')
  } else if (!msg91ApiKey.match(/^[A-Za-z0-9]{20,}$/)) {
    errors.push('MSG91_API_KEY appears to be invalid format')
  }
  
  if (!systemFromEmail) {
    warnings.push('SYSTEM_FROM_EMAIL not set - using default')
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(systemFromEmail)) {
      errors.push('SYSTEM_FROM_EMAIL must be a valid email address')
    }
  }
  
  if (!msg91EmailDomain) {
    warnings.push('MSG91_EMAIL_DOMAIN not set - using default MSG91 domain')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Test MSG91 connection and configuration
 */
export async function testMSG91Connection(): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
  try {
    const { msg91ApiKey, msg91EmailDomain, msg91InvitationTemplateId } = serverConfig
    
    if (!msg91ApiKey) {
      return {
        success: false,
        message: 'MSG91_API_KEY not configured'
      }
    }

    if (!msg91EmailDomain) {
      return {
        success: false,
        message: 'MSG91_EMAIL_DOMAIN not configured'
      }
    }

    if (!msg91InvitationTemplateId) {
      return {
        success: false,
        message: 'MSG91_INVITATION_TEMPLATE_ID not configured'
      }
    }

    // Use actual configured values for validation
    // We use the real template but with a clearly invalid test email that won't deliver
    const testPayload = {
      "recipients": [
        {
          "to": [
            {
              "email": "msg91-config-test@invalid-test-domain.local",
              "name": "Config Test"
            }
          ],
          "variables": {
            "gymName": "Test Gym",
            "inviterName": "Test Admin",
            "role": "member",
            "#if message": "false",
            "message": "",
            "/if": "false",
            "inviteUrl": "https://example.com/test",
            "expiresAt": new Date(Date.now() + 86400000).toISOString(),
            "recipientEmail": "msg91-config-test@invalid-test-domain.local"
          }
        }
      ],
      "from": {
        "email": `no-reply@${msg91EmailDomain}`
      },
      "domain": msg91EmailDomain,
      "template_id": msg91InvitationTemplateId
    }

    const response = await fetch('https://api.msg91.com/api/v5/email/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authkey': msg91ApiKey
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    if (response.status === 401) {
      return {
        success: false,
        message: 'MSG91 API key is invalid or expired',
        details: { status: response.status, response: responseData }
      }
    }

    if (response.status === 422) {
      return {
        success: false,
        message: 'MSG91 validation error - check template ID and domain verification',
        details: { status: response.status, response: responseData }
      }
    }

    // Check if MSG91 accepted the request
    if (responseData.status === 'success' || response.ok) {
      return {
        success: true,
        message: 'MSG91 configuration valid - API accepted request',
        details: { 
          status: response.status, 
          response: responseData,
          config: {
            domain: msg91EmailDomain,
            template_id: msg91InvitationTemplateId
          }
        }
      }
    }

    return {
      success: false,
      message: responseData.message || 'MSG91 returned an error',
      details: { status: response.status, response: responseData }
    }
  } catch (error) {
    return {
      success: false,
      message: `MSG91 connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
