'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, TestTube } from 'lucide-react'
import { logger } from '@/lib/logger'

interface StorageTest {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
}

export function StorageDebug() {
  const [tests, setTests] = useState<StorageTest[]>([])
  const [testing, setTesting] = useState(false)
  const supabase = createClient()

  const runStorageTests = async () => {
    setTesting(true)
    const testResults: StorageTest[] = []

    try {
      // Test 1: Check if user-uploads bucket exists
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets()
        logger.info('Storage Bucket Check', { buckets, error })
        const hasUserUploadsBucket = buckets?.some(bucket => bucket.name === 'user-uploads')
        
        testResults.push({
          name: 'Storage Bucket Exists',
          status: hasUserUploadsBucket ? 'success' : 'error',
          message: hasUserUploadsBucket 
            ? 'user-uploads bucket found' 
            : 'user-uploads bucket not found - create it in Supabase dashboard'
        })
      } catch (error) {
        logger.error('Storage Bucket Check', { error })
        testResults.push({
          name: 'Storage Bucket Check',
          status: 'error',
          message: `Failed to check buckets: ${error}`
        })
      }

      // Test 2: Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      testResults.push({
        name: 'User Authentication',
        status: user ? 'success' : 'warning',
        message: user ? `Authenticated as ${user.email}` : 'Not authenticated - login required for upload'
      })

      // Test 3: Test upload permissions (only if authenticated)
      if (user) {
        try {
          const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
          const testPath = `${user.id}/avatars/test-${Date.now()}.txt`
          
          const { error: uploadError } = await supabase.storage
            .from('user-uploads')
            .upload(testPath, testFile)

          if (uploadError) {
            testResults.push({
              name: 'Upload Permission',
              status: 'error',
              message: `Upload failed: ${uploadError.message}`
            })
          } else {
            testResults.push({
              name: 'Upload Permission',
              status: 'success',
              message: 'Upload test successful'
            })

            // Clean up test file
            await supabase.storage.from('user-uploads').remove([testPath])
          }
        } catch (error) {
          testResults.push({
            name: 'Upload Permission',
            status: 'error',
            message: `Upload test failed: ${error}`
          })
        }
      }

      // Test 4: Check public read access
      try {
        const { data: files } = await supabase.storage
          .from('user-uploads')
          .list('avatars', { limit: 1 })

        logger.info('Public Read Access', { files })
        testResults.push({
          name: 'Public Read Access',
          status: 'success',
          message: 'Can list files in avatars folder'
        })
      } catch (error) {
        logger.error('Public Read Access', { error })
        testResults.push({
          name: 'Public Read Access',
          status: 'warning',
          message: `List files failed: ${error} (may be normal if no files exist)`
        })
      }

    } catch (error) {
      testResults.push({
        name: 'Storage Connection',
        status: 'error',
        message: `Failed to connect to storage: ${error}`
      })
    }

    setTests(testResults)
    setTesting(false)
  }

  const getStatusIcon = (status: StorageTest['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: StorageTest['status']) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-500">Pass</Badge>
      case 'error': return <Badge variant="destructive">Fail</Badge>
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Warning</Badge>
      default: return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Storage Configuration Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runStorageTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Testing Storage...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Storage Tests
            </>
          )}
        </Button>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Test Results:</h3>
            {tests.map((test, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(test.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{test.name}</p>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Setup Required:</p>
          <p>1. Create &apos;user-uploads&apos; bucket in Supabase Storage</p>
          <p>2. Set up RLS policies for secure access</p>
          <p>3. Configure bucket as public for avatar viewing</p>
        </div>
      </CardContent>
    </Card>
  )
}
