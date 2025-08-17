'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Crop, 
  Square, 
  Maximize,
  Smartphone,
  Monitor,
  ZoomIn,
  ZoomOut
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

interface CropData {
  x: number
  y: number
  width: number
  height: number
}

interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

const PRESET_SIZES: PresetSize[] = [
  { name: 'Square', width: 400, height: 400, icon: <Square className="h-4 w-4" />, aspect: 1 },
  { name: 'Large', width: 512, height: 512, icon: <Maximize className="h-4 w-4" />, aspect: 1 },
  { name: 'Profile', width: 300, height: 300, icon: <Smartphone className="h-4 w-4" />, aspect: 1 },
  { name: 'Banner', width: 800, height: 400, icon: <Monitor className="h-4 w-4" />, aspect: 2 },
]

// Helper function to create image from canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

// Helper function to get cropped image
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputWidth: number,
  outputHeight: number,
  quality: number = 0.9,
  originalFileName: string = 'image.jpg'
): Promise<File> => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to desired output dimensions
  canvas.width = outputWidth
  canvas.height = outputHeight

  // Draw cropped and resized image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  )

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
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null)
  const [outputDimensions, setOutputDimensions] = useState({ width: 400, height: 400 })
  const [quality, setQuality] = useState(0.9)
  const [selectedPreset, setSelectedPreset] = useState<string>('Square')
  const [isProcessing, setIsProcessing] = useState(false)

  // Callback for when crop is completed
  const onCropComplete = useCallback((croppedArea: CropData, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Handle preset size selection
  const handlePresetSelect = (preset: PresetSize) => {
    setSelectedPreset(preset.name)
    setOutputDimensions({ width: preset.width, height: preset.height })
    setAspect(preset.aspect)
  }

  // Handle output dimension changes
  const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
    const newDimensions = { ...outputDimensions, [dimension]: value }
    setOutputDimensions(newDimensions)
    
    // Update aspect ratio based on new dimensions
    setAspect(newDimensions.width / newDimensions.height)
    setSelectedPreset('Custom')
  }

  // Process and save image
  const handleSave = async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedImage = await getCroppedImg(
        originalUrl,
        croppedAreaPixels,
        outputDimensions.width,
        outputDimensions.height,
        quality,
        originalFile.name
      )
      onSave(croppedImage)
    } catch (error) {
      console.error('Error processing image:', error)
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cropper Area */}
          <div className="space-y-4">
            <div className="relative h-[400px] w-full border-2 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-inner">
              <Cropper
                image={originalUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                restrictPosition={true}
                showGrid={true}
                cropShape="rect"
                objectFit="contain"
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '0.5rem'
                  },
                  mediaStyle: {
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  },
                  cropAreaStyle: {
                    border: '2px solid #3b82f6',
                    borderRadius: '4px'
                  }
                }}
              />
            </div>
            
            {/* Zoom Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <ZoomOut className="h-4 w-4" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <ZoomIn className="h-4 w-4" />
                <span className="text-sm text-muted-foreground min-w-[3rem]">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Drag to pan • Mouse wheel or pinch to zoom • Drag corners to resize crop area
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Preset Sizes */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Sets output dimensions and crop aspect ratio.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_SIZES.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={selectedPreset === preset.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    className="flex items-center gap-2"
                  >
                    {preset.icon}
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Output Dimensions */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Output Size</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={outputDimensions.width}
                    onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                    min={50}
                    max={2048}
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs text-muted-foreground">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={outputDimensions.height}
                    onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                    min={50}
                    max={2048}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Aspect ratio: {aspect.toFixed(2)} ({outputDimensions.width}:{outputDimensions.height})
              </p>
            </div>

            {/* Quality Slider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Image Quality</Label>
              <div className="px-3">
                <input
                  type="range"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low (Smaller file)</span>
                <span>{Math.round(quality * 100)}%</span>
                <span>High (Larger file)</span>
              </div>
            </div>

            {/* File Info */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">File Info</Label>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Output: {outputDimensions.width}×{outputDimensions.height}px</div>
                <div>Format: JPEG ({Math.round(quality * 100)}% quality)</div>
                <div>Zoom: {Math.round(zoom * 100)}%</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!croppedAreaPixels || isProcessing}>
            {isProcessing ? 'Processing...' : 'Save & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
