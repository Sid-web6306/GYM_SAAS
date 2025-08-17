'use client'

import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker, DateRange, type Matcher } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  format,
  parseISO,
  isValid,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  subDays,
  addMonths,
} from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'

export type DateRangeValue = {
  from: string | null
  to: string | null
}

export type PresetKey =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'previous_month'

export type DateRangePreset = {
  key: PresetKey | string
  label: string
  computeRange: (now: Date, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }) => DateRangeValue
}

type DateRangePopoverProps = {
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
  numberOfMonths?: number
}

const iso = (d: Date): string => format(d, 'yyyy-MM-dd')
const toDate = (s: string | null): Date | undefined => {
  if (!s) return undefined
  const d = parseISO(s)
  return isValid(d) ? d : undefined
}

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
    computeRange: (now: Date, options) => {
      const start = startOfWeek(now, { weekStartsOn: options?.weekStartsOn ?? 1 })
      const end = endOfWeek(now, { weekStartsOn: options?.weekStartsOn ?? 1 })
      return { from: iso(start), to: iso(end) }
    },
  },
  {
    key: 'this_month',
    label: 'This month',
    computeRange: (now: Date) => {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return { from: iso(start), to: iso(end) }
    },
  },
  {
    key: 'this_year',
    label: 'This year',
    computeRange: (now: Date) => {
      const start = startOfYear(now)
      const end = endOfYear(now)
      return { from: iso(start), to: iso(end) }
    },
  },
  {
    key: 'last_7_days',
    label: 'Last 7 days',
    computeRange: (now: Date) => {
      const end = startOfDay(now)
      const start = subDays(end, 6)
      return { from: iso(start), to: iso(end) }
    },
  },
  {
    key: 'last_30_days',
    label: 'Last 30 days',
    computeRange: (now: Date) => {
      const end = startOfDay(now)
      const start = subDays(end, 29)
      return { from: iso(start), to: iso(end) }
    },
  },
  {
    key: 'previous_month',
    label: 'Previous month',
    computeRange: (now: Date) => {
      const start = startOfMonth(subDays(startOfMonth(now), 1))
      const end = endOfMonth(start)
      return { from: iso(start), to: iso(end) }
    },
  },
]

const defaultGetLabel = (
  value: DateRangeValue,
  presets: DateRangePreset[],
  weekStartsOn: DateRangePopoverProps['weekStartsOn'],
  now = new Date() // Allow passing current date to prevent repeated Date() calls
): string => {
  const { from, to } = value
  if (!from && !to) return 'All time'
  
  for (const p of presets) {
    const r = p.computeRange(now, { weekStartsOn: weekStartsOn ?? 1 })
    if (r.from === from && r.to === to) return p.label
  }
  if (from && to) return `${from} → ${to}`
  if (from && !to) return `${from} → …`
  if (!from && to) return `… → ${to}`
  return 'Custom range'
}

export function DateRangePopover(props: DateRangePopoverProps) {
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
    numberOfMonths = 2,
  } = props

  const [open, setOpen] = React.useState(false)
  const [staged, setStaged] = React.useState<DateRangeValue>(value)
  const [displayMonth, setDisplayMonth] = React.useState<Date | undefined>(undefined)
  
  // Memoize current date to prevent repeated Date() calls
  const now = React.useMemo(() => new Date(), [])
  
  // Memoize label computation
  const label = React.useMemo(() => {
    return (getLabel ?? ((v) => defaultGetLabel(v, presets, weekStartsOn, now)))(value)
  }, [value, getLabel, presets, weekStartsOn, now])

  // Reset staged value whenever popover opens to reflect external value
  React.useEffect(() => {
    if (open) {
      setStaged(value)
      const initial = toDate(value.from) || toDate(value.to) || new Date()
      setDisplayMonth(startOfMonth(initial))
    }
  }, [open, value])
  // Memoize selectedRange to prevent unnecessary re-computations
  const selectedRange: DateRange | undefined = React.useMemo(() => {
    return staged.from || staged.to
      ? { from: toDate(staged.from) ?? undefined, to: toDate(staged.to) ?? undefined }
      : undefined
  }, [staged.from, staged.to])

  // Memoize date constraints
  const dateConstraints = React.useMemo(() => ({
    minDateObj: toDate(minDate ?? null),
    maxDateObj: toDate(maxDate ?? null)
  }), [minDate, maxDate])
  
  // Extract disabled date logic
  const disabledDates = React.useMemo(() => {
    const matchers: Matcher[] = []
    if (dateConstraints.minDateObj) matchers.push({ before: dateConstraints.minDateObj })
    if (dateConstraints.maxDateObj) matchers.push({ after: dateConstraints.maxDateObj })
    return matchers.length ? matchers : undefined
  }, [dateConstraints])
  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      setStaged({ from: null, to: null })
      return
    }
    const from = range.from ? iso(range.from) : null
    const to = range.to ? iso(range.to) : null
    const next = { from, to }
    setStaged(next)
    if (range.from && range.to) {
      onChange(next)
    }
  }
  

  const clear = () => {
    setStaged({ from: null, to: null })
    if (onClear) onClear()
    else onChange({ from: null, to: null })
    setOpen(false) // Close popover after clearing
  }

  // Improved scroll position management with cleanup
  const scrollPositionRef = React.useRef<number>(0)
  
  React.useEffect(() => {
    if (open) {
      scrollPositionRef.current = window.scrollY
    }
  }, [open])
  
  // Cleanup function for scroll restoration
  const restoreScrollPosition = React.useCallback(() => {
    if (scrollPositionRef.current !== window.scrollY) {
      // Use requestAnimationFrame for smoother scroll restoration
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)
      })
    }
  }, [])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button 
          variant={buttonVariant} 
          disabled={disabled} 
          className={cn('inline-flex items-center gap-2', className)}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Content 
        side="bottom" 
        sideOffset={8} 
        className="z-[10000] rounded-md border bg-popover p-2 shadow-md"
        avoidCollisions={true}
        collisionPadding={10}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          restoreScrollPosition()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          restoreScrollPosition()
        }}
      >
        <div className="flex gap-2">
          <div className="p-2">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              numberOfMonths={numberOfMonths}
              weekStartsOn={weekStartsOn}
              month={displayMonth}
              onMonthChange={(m) => setDisplayMonth(m)}
              className="rdp"
              modifiersClassNames={{
                selected: 'bg-primary',
                range_start: 'bg-primary rounded-full',
                range_end: 'bg-primary rounded-full',
                range_middle: 'bg-primary/10',
                today: 'border border-primary',
              }}
              disabled={disabledDates}
            />
          </div>
          <div className="w-px bg-muted" />
          <div className="flex w-44 flex-col gap-1 p-2">
            <div className="px-1 py-1 text-xs font-semibold text-muted-foreground">Presets</div>
            {presets.map((p) => (
              <Button
                key={p.key}
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  const r = p.computeRange(now, { weekStartsOn })
                  setStaged(r)
                  onChange(r)
                  // Smart month navigation
                  const target = startOfMonth(
                    toDate(r.from) || toDate(r.to) || now
                  )
                  if (!displayMonth) {
                    setDisplayMonth(target)
                  } else {
                    const visibleStart = startOfMonth(displayMonth)
                    const visibleEnd = startOfMonth(addMonths(displayMonth, Math.max(1, numberOfMonths) - 1))
                    if (target < visibleStart || target > visibleEnd) {
                      setDisplayMonth(target)
                    }
                  }
                  // Close popover after preset selection for better UX
                  setOpen(false)
                }}
              >
                {p.label}
              </Button>
            ))}
            <div className="mt-2" />
            <Button variant="outline" onClick={clear}>
              Clear
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}

export default DateRangePopover


