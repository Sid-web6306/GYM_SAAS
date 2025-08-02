import * as React from 'react'
import { cn } from '@/lib/utils'

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function RadioGroup({ value, defaultValue, onValueChange, children, className, ...props }: RadioGroupProps) {
  const [selected, setSelected] = React.useState(defaultValue || '')

  React.useEffect(() => {
    if (value !== undefined) setSelected(value)
  }, [value])

  const handleChange = (val: string) => {
    setSelected(val)
    onValueChange?.(val)
  }

  return (
    <div role="radiogroup" className={cn('flex flex-col gap-2', className)} {...props}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child
        const typedChild = child as React.ReactElement<RadioGroupItemProps>
        return React.cloneElement(typedChild, {
          checked: typedChild.props.value === selected,
          onChange: () => handleChange(typedChild.props.value)
        })
      })}
    </div>
  )
}

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string
  value: string
  checked?: boolean
  onChange?: () => void
  className?: string
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ id, value, checked, onChange, className, ...props }, ref) => (
    <input
      type="radio"
      id={id || value}
      name={props.name}
      value={value}
      checked={checked}
      onChange={onChange}
      ref={ref}
      className={cn(
        'h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 rounded-full',
        className
      )}
      {...props}
    />
  )
)
RadioGroupItem.displayName = 'RadioGroupItem' 