'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Palette,
  Settings,
} from 'lucide-react'
import { ThemeSelector } from '@/components/ui/theme-selector'

export const AppearanceTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance Settings
        </CardTitle>
        <CardDescription>
          Customize the appearance of your application to match your preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ThemeSelector />
        
        {/* Theme Preview Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Theme Preview</h3>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Sample Components</h4>
                <Button size="sm" variant="outline">
                  Preview Button
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 bg-primary rounded-full w-3/4"></div>
                  <div className="h-3 bg-secondary rounded-full w-1/2"></div>
                  <div className="h-3 bg-muted rounded-full w-2/3"></div>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-accent rounded text-accent-foreground text-sm">
                    Accent Card
                  </div>
                  <div className="p-2 bg-muted rounded text-muted-foreground text-sm">
                    Muted Card
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 