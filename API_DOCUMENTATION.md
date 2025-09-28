# Gym SaaS API Documentation

This document provides comprehensive documentation for all API endpoints in the Gym SaaS application.

## Table of Contents

- [Authentication APIs](#authentication-apis)
- [Member Management APIs](#member-management-apis)
- [Invitation Management APIs](#invitation-management-apis)
- [Subscription Management APIs](#subscription-management-apis)
- [Payment APIs](#payment-apis)
- [Document Management APIs](#document-management-apis)
- [Communication APIs](#communication-apis)
- [Email APIs](#email-apis)
- [Webhook APIs](#webhook-apis)
- [Error Handling](#error-handling)
- [Authentication](#authentication)

---

## Authentication APIs

### POST /api/auth

Handles OTP verification and resend functionality.

**Request Body:**
```json
{
  "action": "verify-otp" | "resend-otp",
  "email": "string",
  "token": "string" // Required for verify-otp
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully" // or "OTP sent successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid action or missing parameters
- `500` - Internal server error

---

### GET /api/auth-check

Check authentication status of the current user.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "string",
    "user_metadata": {}
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthenticated

---

## Member Management APIs

### GET /api/members/me

Get the authenticated user's member profile.

**Response:**
```json
{
  "success": true,
  "member": {
    "id": "uuid",
    "user_id": "uuid",
    "gym_id": "uuid",
    "member_id": "string",
    "status": "active" | "inactive" | "suspended",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required
- `404` - No member record found
- `500` - Internal server error

---

### POST /api/members/checkin

Start an attendance session for the authenticated member.

**Request Body:**
```json
{
  "method": "portal" | "qr" | "manual",
  "notes": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "member_id": "uuid",
    "check_in_at": "datetime",
    "method": "string",
    "notes": "string"
  },
  "message": "Successfully checked in"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request data
- `401` - Authentication required
- `404` - No member record found
- `500` - Internal server error

---

### POST /api/members/checkout

End the current attendance session for the authenticated member.

**Request Body:**
```json
{
  "checkout_at": "datetime" // Optional, defaults to current time
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "member_id": "uuid",
    "check_in_at": "datetime",
    "check_out_at": "datetime",
    "total_seconds": "number"
  },
  "message": "Successfully checked out"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request data
- `401` - Authentication required
- `404` - No open attendance session found
- `500` - Internal server error

---

### GET /api/members/attendance

Get attendance history for the authenticated member.

**Query Parameters:**
- `from` (optional) - Start date (ISO string)
- `to` (optional) - End date (ISO string)
- `limit` (optional) - Number of records (default: 50, max: 100)
- `offset` (optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "attendance": [
    {
      "id": "uuid",
      "check_in_at": "datetime",
      "check_out_at": "datetime",
      "total_seconds": "number",
      "method": "string"
    }
  ],
  "current_status": {
    "is_checked_in": "boolean",
    "session_id": "uuid" | null,
    "check_in_at": "datetime" | null,
    "total_seconds": "number" | null
  },
  "pagination": {
    "limit": "number",
    "offset": "number",
    "has_more": "boolean"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required
- `500` - Internal server error

---

### GET /api/members/status

Get current member status and check-in information.

**Response:**
```json
{
  "is_checked_in": "boolean",
  "session_id": "uuid" | null,
  "check_in_at": "datetime" | null,
  "total_seconds": "number" | null
}
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required
- `500` - Internal server error

---

## Invitation Management APIs

### GET /api/invites

Get gym invitations with filtering and pagination.

**Query Parameters:**
- `gym_id` (optional) - Filter by gym ID
- `status` (optional) - Filter by status: `pending`, `accepted`, `expired`, `revoked`, `all` (default: `pending`)
- `limit` (optional) - Number of records (default: 50)
- `offset` (optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "string",
      "role": "owner" | "manager" | "staff" | "trainer" | "member",
      "status": "pending" | "accepted" | "expired" | "revoked",
      "expires_at": "datetime",
      "accepted_at": "datetime" | null,
      "metadata": {},
      "created_at": "datetime",
      "updated_at": "datetime",
      "invited_by": {
        "id": "uuid",
        "full_name": "string",
        "email": "string"
      },
      "accepted_by": {
        "id": "uuid",
        "full_name": "string",
        "email": "string"
      } | null
    }
  ],
  "pagination": {
    "total": "number",
    "limit": "number",
    "offset": "number",
    "hasMore": "boolean"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - No gym association found
- `401` - Unauthorized
- `403` - Insufficient permissions
- `500` - Internal server error

---

### POST /api/invites

Create a new gym invitation.

**Request Body:**
```json
{
  "email": "string", // Required, valid email
  "role": "owner" | "manager" | "staff" | "trainer" | "member", // Required
  "gym_id": "uuid", // Optional, defaults to user's gym
  "expires_in_hours": "number", // Optional, 1-168, default: 72
  "message": "string", // Optional, max 500 chars
  "notify_user": "boolean" // Optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "string",
    "role": "string",
    "status": "pending",
    "expires_at": "datetime",
    "created_at": "datetime",
    "invite_link": "string"
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation failed or no gym association
- `401` - Unauthorized
- `403` - Insufficient permissions
- `409` - User already has role or active invitation exists
- `429` - Rate limit exceeded
- `500` - Internal server error

---

### PUT /api/invites

Update an existing invitation.

**Request Body:**
```json
{
  "invite_id": "uuid", // Required
  "status": "pending" | "accepted" | "expired" | "revoked", // Optional
  "role": "owner" | "manager" | "staff" | "trainer" | "member", // Optional
  "expires_at": "datetime" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "string",
    "role": "string",
    "status": "string",
    "expires_at": "datetime",
    "updated_at": "datetime"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation failed
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - Invitation not found
- `500` - Internal server error

---

### DELETE /api/invites

Delete/revoke an invitation.

**Query Parameters:**
- `invite_id` (required) - ID of the invitation to revoke

**Response:**
```json
{
  "success": true,
  "message": "Invitation revoked successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing invite_id
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - Invitation not found
- `500` - Internal server error

---

### GET /api/invites/verify

Verify an invitation token.

**Query Parameters:**
- `invite` (required) - Invitation token

**Response:**
```json
{
  "valid": true,
  "invitation": {
    "id": "uuid",
    "email": "string",
    "role": "string",
    "gym_id": "uuid",
    "expires_at": "datetime",
    "gym_name": "string"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing invite token
- `404` - Invalid or expired token
- `500` - Internal server error

---

### POST /api/invites/verify

Accept an invitation (for authenticated users).

**Request Body:**
```json
{
  "token": "string" // Required, invitation token
}
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "gym_id": "uuid",
    "role": "string",
    "user_id": "uuid"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing token or different email
- `401` - Authentication required
- `404` - Invalid or expired token
- `409` - User already has role in gym
- `500` - Internal server error

---

## Subscription Management APIs

### GET /api/subscriptions

Get subscription plans and current user's subscription.

**Query Parameters:**
- `action` (optional) - `plans`, `current`, or `billing-portal`

**Response (default):**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "price": "number",
      "billing_cycle": "monthly" | "annual",
      "features": ["string"],
      "is_popular": "boolean"
    }
  ],
  "groupedPlans": {
    "monthly": [...],
    "annual": [...]
  },
  "currentSubscription": {
    "id": "uuid",
    "plan_id": "uuid",
    "status": "active" | "inactive" | "past_due" | "canceled",
    "current_period_start": "datetime",
    "current_period_end": "datetime"
  } | null,
  "hasAccess": "boolean"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Internal server error

---

### POST /api/subscriptions

Create or modify a subscription.

**Request Body:**
```json
{
  "planId": "uuid", // Required
  "billingCycle": "monthly" | "annual", // Required
  "metadata": {} // Optional
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "plan_id": "uuid",
    "status": "string",
    "razorpay_subscription_id": "string"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `500` - Internal server error

---

### POST /api/subscriptions/feedback

Submit feedback for a subscription.

**Request Body:**
```json
{
  "subscriptionId": "uuid", // Required
  "reason": "string", // Required
  "feedbackText": "string", // Optional
  "rating": "number", // Optional, 1-5
  "wouldRecommend": "boolean" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `401` - Unauthorized
- `404` - Subscription not found
- `409` - Feedback already submitted
- `500` - Internal server error

---

## Payment APIs

### POST /api/payments

Create a Razorpay subscription.

**Request Body:**
```json
{
  "planId": "uuid", // Required
  "billingCycle": "monthly" | "annual", // Required
  "metadata": {} // Optional
}
```

**Response:**
```json
{
  "subscription": {
    "id": "string",
    "plan_id": "string",
    "status": "string",
    "short_url": "string"
  },
  "customer": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `404` - Plan not found
- `500` - Internal server error

---

### GET /api/payment-methods

Get user's payment methods.

**Response:**
```json
{
  "paymentMethods": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "razorpay_payment_method_id": "string",
      "type": "card" | "netbanking" | "wallet",
      "card": {
        "last4": "string",
        "brand": "string",
        "exp_month": "number",
        "exp_year": "number"
      },
      "is_active": "boolean",
      "created_at": "datetime"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Internal server error

---

### POST /api/payment-methods

Add a new payment method.

**Request Body:**
```json
{
  "razorpay_payment_method_id": "string", // Required
  "type": "card" | "netbanking" | "wallet", // Required
  "card": {
    "last4": "string",
    "brand": "string",
    "exp_month": "number",
    "exp_year": "number"
  } // Required for card type
}
```

**Response:**
```json
{
  "success": true,
  "paymentMethod": {
    "id": "uuid",
    "type": "string",
    "is_active": "boolean"
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request
- `401` - Unauthorized
- `500` - Internal server error

---

## Document Management APIs

### GET /api/documents

Get user's documents with basic filtering.

**Query Parameters:**
- `limit` (optional) - Number of records (default: 20)
- `offset` (optional) - Offset for pagination (default: 0)
- `type` (optional) - Filter by document type
- `startDate` (optional) - Filter by start date
- `endDate` (optional) - Filter by end date
- `search` (optional) - Search in title/description
- `tags` (optional) - Filter by tags

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "type": "string",
      "file_url": "string",
      "file_size": "number",
      "tags": ["string"],
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "pagination": {
    "total": "number",
    "limit": "number",
    "offset": "number",
    "has_more": "boolean"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Access denied (subscription required)
- `500` - Internal server error

---

### POST /api/documents

List documents with advanced filtering and pagination.

**Request Body:**
```json
{
  "limit": "number", // Optional, default: 20
  "offset": "number", // Optional, default: 0
  "type": "string", // Optional, filter by document type
  "startDate": "datetime", // Optional, filter by date range
  "endDate": "datetime", // Optional, filter by date range
  "search": "string", // Optional, search in title/description
  "tags": ["string"] // Optional, filter by tags
}
```

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "type": "string",
      "file_url": "string",
      "file_size": "number",
      "tags": ["string"],
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "pagination": {
    "total": "number",
    "limit": "number",
    "offset": "number",
    "has_more": "boolean"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Access denied (subscription required)
- `500` - Internal server error

---

## Communication APIs

### POST /api/communications/otp

Send or verify OTP for phone number verification.

**Request Body:**
```json
{
  "action": "send" | "verify", // Required
  "phone": "string", // Required
  "userId": "uuid" // Required for verify action
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing parameters
- `500` - Internal server error

---

## Email APIs

### POST /api/email/send-test

Send a test email.

**Request Body:**
```json
{
  "to": "string", // Required
  "subject": "string", // Required
  "body": "string" // Required
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "string"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `500` - Internal server error

---

### GET /api/email/send-test

Get email sending status.

**Response:**
```json
{
  "status": "string",
  "lastSent": "datetime" | null
}
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

---

## Webhook APIs

### POST /api/webhooks/razorpay

Handle Razorpay webhook events for payments and subscriptions.

**Headers:**
- `x-razorpay-signature` - Webhook signature for verification

**Request Body:**
```json
{
  "event": "payment.captured" | "payment.failed" | "subscription.activated" | "subscription.charged" | "subscription.cancelled" | "subscription.paused" | "subscription.resumed" | "subscription.pending" | "subscription.completed",
  "created_at": "number",
  "payload": {
    "payment": {
      "entity": {
        "id": "string",
        "amount": "number",
        "currency": "string",
        "status": "string",
        "method": "string",
        "captured": "boolean",
        "created_at": "number",
        "email": "string",
        "contact": "string",
        "error_code": "string",
        "error_description": "string",
        "notes": {}
      }
    },
    "subscription": {
      "entity": {
        "id": "string",
        "plan_id": "string",
        "customer_id": "string",
        "status": "string",
        "current_start": "number",
        "current_end": "number",
        "ended_at": "number",
        "charge_at": "number",
        "total_count": "number",
        "paid_count": "number",
        "remaining_count": "number",
        "plan": {
          "item": {
            "amount": "number"
          }
        },
        "notes": {}
      }
    }
  }
}
```

**Response:**
```json
{
  "received": true,
  "event_type": "string",
  "processing_time_ms": "number"
}
```

**Status Codes:**
- `200` - Success
- `400` - Webhook signature verification failed
- `500` - Webhook processing failed

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "string", // Error message
  "details": {} // Optional additional error details
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, missing parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource, already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Rate Limiting

Some endpoints have rate limiting:
- **Invitation creation**: 5 invitations per minute per user
- **OTP sending**: Rate limited to prevent abuse

---

## Authentication

### Authentication Methods

1. **Session-based**: Uses Supabase Auth with HTTP-only cookies
2. **API Key**: Not currently implemented
3. **JWT**: Handled by Supabase Auth

### Required Headers

For authenticated endpoints:
```
Authorization: Bearer <token>
```

### Authentication Flow

1. User signs up/logs in through Supabase Auth
2. Session is established with HTTP-only cookies
3. API endpoints verify session using Supabase client
4. User context is extracted from verified session

---

## Rate Limiting

### Current Rate Limits

- **Invitation Creation**: 5 requests per minute per user
- **OTP Sending**: Rate limited (exact limits TBD)
- **General API**: No global rate limiting currently implemented

### Rate Limit Headers

When rate limited, the following headers are included:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

---

## Data Models

### Common Types

```typescript
// User Role
type GymRole = 'owner' | 'manager' | 'staff' | 'trainer' | 'member'

// Subscription Status
type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused' | 'pending' | 'completed'

// Invitation Status
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

// Billing Cycle
type BillingCycle = 'monthly' | 'annual'

// Payment Method Type
type PaymentMethodType = 'card' | 'netbanking' | 'wallet'
```

---

## Changelog

### Version 1.0.0
- Initial API documentation
- 25 endpoints documented
- Authentication and authorization flows
- Error handling standards
- Rate limiting information

---

## Support

For API support and questions:
- Check the error responses for specific error details
- Verify authentication status using `/api/auth-check`
- Ensure proper request formatting and required parameters
- Check rate limits if receiving 429 status codes

---

*Last updated: December 2024*
