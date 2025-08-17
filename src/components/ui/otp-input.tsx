'use client'

import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  placeholder?: string
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  placeholder = '○'
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const valueArray = value.split('').slice(0, length)

  // Pad with empty strings if needed
  while (valueArray.length < length) {
    valueArray.push('')
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  const handleChange = (index: number, newValue: string) => {
    // Only allow numeric input
    if (newValue && !/^\d$/.test(newValue)) return

    const newValueArray = [...valueArray]
    newValueArray[index] = newValue

    // Update the full value
    const newFullValue = newValueArray.join('')
    onChange(newFullValue)

    // Move to next input if value entered
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace':
        e.preventDefault()
        if (valueArray[index]) {
          // Clear current input
          const newValueArray = [...valueArray]
          newValueArray[index] = ''
          onChange(newValueArray.join(''))
        } else if (index > 0) {
          // Move to previous input and clear it
          const newValueArray = [...valueArray]
          newValueArray[index - 1] = ''
          onChange(newValueArray.join(''))
          inputRefs.current[index - 1]?.focus()
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (index > 0) {
          inputRefs.current[index - 1]?.focus()
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus()
        }
        break
      case 'Delete':
        e.preventDefault()
        const newValueArray = [...valueArray]
        newValueArray[index] = ''
        onChange(newValueArray.join(''))
        break
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const pastedNumbers = pastedData.replace(/\D/g, '').slice(0, length)
    
    if (pastedNumbers) {
      onChange(pastedNumbers)
      // Focus the last filled input or the last input if all are filled
      const nextIndex = Math.min(pastedNumbers.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const handleFocus = (index: number) => {
    // Select all text when focusing
    inputRefs.current[index]?.select()
  }

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {valueArray.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          placeholder={digit || placeholder}
          className={cn(
            "w-12 h-12 text-center text-lg font-semibold",
            "focus:ring-2 focus:ring-primary focus:border-transparent",
            digit ? "border-primary" : "border-input",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}

export default OTPInput
