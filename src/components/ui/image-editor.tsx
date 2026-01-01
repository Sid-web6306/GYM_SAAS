'use client'

import React, { useState, useRef } from 'react'
import { Cropper, CircleStencil, CropperRef } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Crop, 
  Square, 
  Maximize,
  Smartphone,
  RotateCcw
} from 'lucide-react'

interface ImageEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (processedFile: File) => void
  originalFile: File
  originalUrl: string
}

interface PresetSize {
  name: string
  width: number
  height: number
  icon: React.ReactNode
  aspect: number
}



const PRESET_SIZES: PresetSize[] = [
  { name: 'Small', width: 200, height: 200, icon: <Square className="h-4 w-4" />, aspect: 1 },
  { name: 'Medium', width: 400, height: 400, icon: <Smartphone className="h-4 w-4" />, aspect: 1 },
  { name: 'Large', width: 800, height: 800, icon: <Maximize className="h-4 w-4" />, aspect: 1 },
]

// Helper function to convert canvas to File
const canvasToFile = (canvas: HTMLCanvasElement, quality: number, originalFileName: string): Promise<File> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const baseName = originalFileName.replace(/\.[^/.]+$/, '')
        const fileName = `${baseName}-edited.jpg`
        
        const file = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        resolve(file)
      }
    }, 'image/jpeg', quality)
  })
}

export function ImageEditor({ isOpen, onClose, onSave, originalFile, originalUrl }: ImageEditorProps) {
  const [outputDimensions, setOutputDimensions] = useState({ width: 400, height: 400 })
  const [quality, setQuality] = useState(0.9)
  const [selectedPreset, setSelectedPreset] = useState<string>('Medium')
  const [isProcessing, setIsProcessing] = useState(false)
  const [cropShape, setCropShape] = useState<'rect' | 'circle'>('rect')
  const cropperRef = useRef<CropperRef>(null)

  // Handle preset size selection
  const handlePresetSelect = (preset: PresetSize) => {
    setSelectedPreset(preset.name)
    setOutputDimensions({ width: preset.width, height: preset.height })
  }

  // Reset cropper
  const handleReset = () => {
    if (cropperRef.current) {
      cropperRef.current.reset()
    }
    setOutputDimensions({ width: 400, height: 400 })
    setSelectedPreset('Medium')
  }

  // Process and save image
  const handleSave = async () => {
    if (!cropperRef.current) return

    try {
      setIsProcessing(true)
      
      // Get the cropped canvas
      const canvas = cropperRef.current.getCanvas({
        width: outputDimensions.width,
        height: outputDimensions.height,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      })

      if (canvas) {
        const croppedFile = await canvasToFile(canvas, quality, originalFile.name)
        onSave(croppedFile)
      }
    } catch (error) {
      
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Edit Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Cropper Area */}
          <div className="relative h-[500px] w-full">
            <Cropper
              ref={cropperRef}
              src={originalUrl}
              className="h-full w-full rounded-lg border-2 border-border bg-muted"
              stencilComponent={cropShape === 'circle' ? CircleStencil : undefined}
            />
            
            {/* Interactive Hints */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-md text-xs">
              Drag to move • Scroll to zoom • Drag corner handles to resize
            </div>
          </div>
          
          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Shape Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Shape</Label>
              <div className="flex gap-2">
                <Button
                  variant={cropShape === 'rect' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCropShape('rect')}
                  className="flex-1"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  variant={cropShape === 'circle' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCropShape('circle')}
                  className="flex-1"
                >
                  ⭕
                </Button>
              </div>
            </div>

            {/* Quick Size Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Size</Label>
              <div className="flex gap-1">
                {PRESET_SIZES.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={selectedPreset === preset.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    className="flex-1 text-xs"
                  >
                    {preset.icon}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {outputDimensions.width}×{outputDimensions.height}px
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dimensions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={outputDimensions.width}
                  onChange={(e) => setOutputDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                  placeholder="Width"
                  min={50}
                  max={2048}
                  className="text-xs"
                />
                <Input
                  type="number"
                  value={outputDimensions.height}
                  onChange={(e) => setOutputDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                  placeholder="Height"
                  min={50}
                  max={2048}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Quality */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quality</Label>
              <div className="space-y-2">
                <Input
                  type="range"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  max={1}
                  min={0.3}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {Math.round(quality * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleReset} disabled={isProcessing}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Save & Upload'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
