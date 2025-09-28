import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// Document interface to match our database schema
interface Document {
  id: string
  user_id: string
  type: 'invoice' | 'receipt' | 'statement' | 'contract'
  title: string
  description: string | null
  razorpay_id: string | null
  download_url: string | null
  hosted_url: string | null
  amount: number | null
  currency: string
  status: string | null
  document_date: string
  tags: string[]
  metadata: Record<string, unknown>
  file_size_bytes: number | null
  mime_type: string
  created_at: string
  updated_at: string
}



// GET /api/documents?type=invoice&id=xxx - Get document download URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'invoice' or 'receipt'
    const documentId = searchParams.get('id') // Document ID from our database

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's gym_id first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.gym_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if gym has subscription access
    const { data: hasAccess, error: accessError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('check_gym_subscription_access', {
      p_gym_id: profile.gym_id
    })

    if (accessError || !hasAccess) {
      return NextResponse.json({ error: 'Access denied. Active subscription required.' }, { status: 403 })
    }

    // Get document from database (using type assertion until types are regenerated)
    const { data: document, error: docError } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              single: () => Promise<{ data: Document | null, error: unknown }>
            }
          }
        }
      }
    })
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id) // Ensure user owns this document
      .single()

    if (docError || !document) {
      logger.error('Document not found:', { 
        error: docError ? String(docError) : 'Unknown error', 
        userId: user.id, 
        documentId 
      })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if type filter is provided and matches
    if (type && document.type !== type) {
      return NextResponse.json({ error: `Document is not of type ${type}` }, { status: 400 })
    }

    // Check if download URL exists
    if (!document.download_url) {
      return NextResponse.json({ error: 'Download URL not available for this document' }, { status: 404 })
    }

    logger.info('Document download successful:', {
      userId: user.id,
      documentId: document.id,
      type: document.type,
      amount: document.amount,
      razorpayId: document.razorpay_id
    })

    // Return download information (compatible with old format)
    return NextResponse.json({
      success: true,
      download_url: document.download_url,
      hosted_url: document.hosted_url,
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        description: document.description,
        razorpay_id: document.razorpay_id,
        amount: document.amount,
        currency: document.currency,
        status: document.status,
        document_date: document.document_date,
        created_at: document.created_at,
        tags: document.tags,
        metadata: document.metadata
      }
    })

  } catch (error) {
    logger.error('Documents GET error:', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents - List user's documents with filtering and pagination
export async function POST(request: NextRequest) {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      type = null, // Filter by document type
      startDate = null, // Filter by date range
      endDate = null,
      search = null, // Search in title/description
      tags = null // Filter by tags
    } = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's gym_id first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.gym_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if gym has subscription access
    const { data: hasAccess, error: accessError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('check_gym_subscription_access', {
      p_gym_id: profile.gym_id
    })

    if (accessError || !hasAccess) {
      return NextResponse.json({ error: 'Access denied. Active subscription required.' }, { status: 403 })
    }

    // Build query with filters (using simple type assertion)
    let query = (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string, options?: { count: string }) => {
          eq: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => {
              order: (column: string, options: { ascending: boolean }) => {
                range: (from: number, to: number) => {
                  eq: (column: string, value: string) => unknown
                  gte: (column: string, value: string) => unknown
                  lte: (column: string, value: string) => unknown
                  or: (condition: string) => unknown
                  overlaps: (column: string, values: string[]) => unknown
                } & Promise<{ data: Document[] | null, error: unknown, count: number | null }>
              }
            }
          }
        }
      }
    })
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('document_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type) {
      query = (query as unknown as { eq: (column: string, value: string) => unknown }).eq('type', type) as typeof query
    }

    if (startDate) {
      query = (query as unknown as { gte: (column: string, value: string) => unknown }).gte('document_date', startDate) as typeof query
    }

    if (endDate) {
      query = (query as unknown as { lte: (column: string, value: string) => unknown }).lte('document_date', endDate) as typeof query
    }

    if (search) {
      query = (query as unknown as { or: (condition: string) => unknown }).or(`title.ilike.%${search}%,description.ilike.%${search}%`) as typeof query
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      query = (query as unknown as { overlaps: (column: string, values: string[]) => unknown }).overlaps('tags', tags) as typeof query
    }

    // Execute query
    const { data: documents, error: docsError, count } = await query

    if (docsError) {
      logger.error('Documents query error:', { 
        error: String(docsError), 
        userId: user.id 
      })
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Format documents for backward compatibility with old API
    const formattedDocuments = documents?.map(doc => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      
      // For backward compatibility with old format
      number: (doc.metadata as Record<string, unknown>)?.number || null,
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      created: doc.created_at ? Math.floor(new Date(doc.created_at).getTime() / 1000) : null,
      document_date: doc.document_date,
      
      // URLs
      pdf_url: doc.download_url,
      download_url: doc.download_url,
      hosted_url: doc.hosted_url,
      
      // Additional fields
      razorpay_id: doc.razorpay_id,
      tags: doc.tags,
      metadata: doc.metadata,
    })) || []

    // Separate by type for backward compatibility
    const invoices = formattedDocuments.filter(doc => doc.type === 'invoice')
    const receipts = formattedDocuments.filter(doc => doc.type === 'receipt')
    const statements = formattedDocuments.filter(doc => doc.type === 'statement')
    const contracts = formattedDocuments.filter(doc => doc.type === 'contract')

    logger.info('Documents listed successfully:', {
      userId: user.id,
      totalCount: count || 0,
      invoicesCount: invoices.length,
      receiptsCount: receipts.length,
      statementsCount: statements.length,
      contractsCount: contracts.length,
      filters: { type, startDate, endDate, search, tags }
    })

    return NextResponse.json({
      // New enhanced format
      documents: formattedDocuments,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        type,
        startDate,
        endDate,
        search,
        tags
      },
      
      // Legacy format for backward compatibility
      invoices,
      receipts,
      hasMore: (count || 0) > offset + limit,
      
      // Summary statistics
      summary: {
        totalDocuments: count || 0,
        invoiceCount: invoices.length,
        receiptCount: receipts.length,
        statementCount: statements.length,
        contractCount: contracts.length,
        totalAmount: formattedDocuments.reduce((sum, doc) => sum + (doc.amount || 0), 0)
      }
    })

  } catch (error) {
    logger.error('Documents POST error:', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
  }
}

// PUT /api/documents - Update document metadata (title, description, tags)
export async function PUT(request: NextRequest) {
  try {
    const { 
      documentId, 
      title, 
      description, 
      tags 
    } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update document
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) updateData.tags = tags

    const { data: document, error: updateError } = await (supabase as unknown as {
      from: (table: string) => {
        update: (data: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              select: () => {
                single: () => Promise<{ data: Document | null, error: unknown }>
              }
            }
          }
        }
      }
    })
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('user_id', user.id) // Ensure user owns this document
      .select()
      .single()

    if (updateError || !document) {
      logger.error('Document update error:', { 
        error: updateError ? String(updateError) : 'Unknown error', 
        userId: user.id, 
        documentId 
      })
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    logger.info('Document updated successfully:', {
      userId: user.id,
      documentId: document.id,
      updates: updateData
    })

    return NextResponse.json({
      success: true,
      document
    })

  } catch (error) {
    logger.error('Documents PUT error:', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// DELETE /api/documents - Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete document
    const { error: deleteError } = await (supabase as unknown as {
      from: (table: string) => {
        delete: () => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<{ error: unknown }>
          }
        }
      }
    })
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id) // Ensure user owns this document

    if (deleteError) {
      logger.error('Document delete error:', { 
        error: String(deleteError), 
        userId: user.id, 
        documentId 
      })
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    logger.info('Document deleted successfully:', {
      userId: user.id,
      documentId
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    logger.error('Documents DELETE error:', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
} 