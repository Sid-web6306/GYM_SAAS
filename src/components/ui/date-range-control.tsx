import * as React from 'react'
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type DateRangeValue = {
  from: string | null
  to: string | null
}

export type PresetKey = 'today' | 'this_week' | 'this_month' | 'this_year'

export type DateRangePreset = {
  key: PresetKey | string
  label: string
  computeRange: (now: Date, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }) => DateRangeValue
}

type DateRangeControlProps = {
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
  onClear?: () => void
  presets?: DateRangePreset[]
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  minDate?: string
  maxDate?: string
  disabled?: boolean
  className?: string
  buttonVariant?: 'ghost' | 'outline' | 'default'
  getLabel?: (value: DateRangeValue) => string
}

const iso = (d: Date): string => format(d, 'yyyy-MM-dd')

const defaultPresets: DateRangePreset[] = [
  {
    key: 'today',
    label: 'Today',
    computeRange: (now: Date) => {
      const s = startOfDay(now)
      return { from: iso(s), to: iso(s) }
    },
  },
  {
    key: 'this_week',
    label: 'This week',
    computeRange: (now: Date, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }) => {
      const start = startOfWeek(now, { weekStartsOn: options?.weekStartsOn ?? 1 })
      return { from: iso(start), to: iso(startOfDay(now)) }
    },
  },
  {
    key: 'this_month',
    label: 'This month',
    computeRange: (now: Date) => {
      const start = startOfMonth(now)
      return { from: iso(start), to: iso(startOfDay(now)) }
    },
  },
  {
    key: 'this_year',
    label: 'This year',
    computeRange: (now: Date) => {
      const start = startOfYear(now)
      return { from: iso(start), to: iso(startOfDay(now)) }
    },
  },
]

const defaultGetLabel = (value: DateRangeValue, presets: DateRangePreset[], weekStartsOn: DateRangeControlProps['weekStartsOn']): string => {
  const { from, to } = value
  if (!from && !to) return 'All time'
  const now = new Date()
  for (const p of presets) {
    const r = p.computeRange(now, { weekStartsOn: weekStartsOn ?? 1 })
    if (r.from === (from ?? r.from) && r.to === (to ?? r.to)) return p.label
  }
  if (from && to) return `${from} → ${to}`
  if (from && !to) return `${from} → …`
  if (!from && to) return `… → ${to}`
  return 'Custom range'
}

export function DateRangeControl(props: DateRangeControlProps) {
  const {
    value,
    onChange,
    onClear,
    presets = defaultPresets,
    weekStartsOn = 1,
    minDate,
    maxDate,
    disabled,
    className,
    buttonVariant = 'outline',
    getLabel,
  } = props

  const label = (getLabel ?? ((v) => defaultGetLabel(v, presets, weekStartsOn)))(value)

  const handleFromChange = (nextFrom: string) => {
    // Ensure from <= to
    const currentTo = value.to
    const adjusted: DateRangeValue = currentTo && nextFrom && nextFrom > currentTo
      ? { from: nextFrom, to: nextFrom }
      : { from: nextFrom || null, to: currentTo }
    onChange(adjusted)
  }

  const handleToChange = (nextTo: string) => {
    const currentFrom = value.from
    const adjusted: DateRangeValue = currentFrom && nextTo && currentFrom > nextTo
      ? { from: nextTo, to: nextTo }
      : { from: currentFrom, to: nextTo || null }
    onChange(adjusted)
  }

  const clear = () => {
    if (onClear) onClear()
    else onChange({ from: null, to: null })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} disabled={disabled} className={cn('inline-flex items-center gap-2', className)}>
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Presets</DropdownMenuLabel>
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.key}
            onClick={() => {
              const r = p.computeRange(new Date(), { weekStartsOn })
              onChange(r)
            }}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Custom range</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={value.from ?? ''}
              onChange={(e) => handleFromChange(e.target.value)}
              min={minDate}
              max={maxDate}
              className="w-[9.25rem]"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={value.to ?? ''}
              onChange={(e) => handleToChange(e.target.value)}
              min={minDate}
              max={maxDate}
              className="w-[9.25rem]"
            />
          </div>
          <div className="mt-2 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={clear}>
              Clear
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DateRangeControl


