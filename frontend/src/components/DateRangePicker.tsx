import { useState, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isBefore, isAfter, parseISO, differenceInDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onClose: () => void
  onApply: () => void
}


export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClose,
  onApply,
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [tempStartDate, setTempStartDate] = useState<string | null>(startDate || null)
  const [tempEndDate, setTempEndDate] = useState<string | null>(endDate || null)
  const [selectingStart, setSelectingStart] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setErrorMessage('')
    
    if (selectingStart || !tempStartDate) {
      setTempStartDate(dateStr)
      setTempEndDate(null)
      setSelectingStart(false)
    } else {
      if (isBefore(date, parseISO(tempStartDate))) {
        setTempStartDate(dateStr)
        setTempEndDate(null)
      } else {
        // Check if the range exceeds 1 month (31 days)
        const daysDiff = differenceInDays(date, parseISO(tempStartDate))
        if (daysDiff > 31) {
          setErrorMessage('Maximum date range is 1 month (31 days)')
          return
        }
        setTempEndDate(dateStr)
        setSelectingStart(true)
      }
    }
  }

  const handleApply = () => {
    if (tempStartDate) {
      onStartDateChange(tempStartDate)
    }
    if (tempEndDate) {
      onEndDateChange(tempEndDate)
    } else if (tempStartDate) {
      // If only start date is selected, set end date to start date
      onEndDateChange(tempStartDate)
    }
    setErrorMessage('')
    onApply()
  }

  const handleCancel = () => {
    setTempStartDate(startDate || null)
    setTempEndDate(endDate || null)
    onClose()
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const isDateInRange = (date: Date) => {
    if (!tempStartDate) return false
    if (tempEndDate) {
      const start = parseISO(tempStartDate)
      const end = parseISO(tempEndDate)
      return (isSameDay(date, start) || isAfter(date, start)) && (isSameDay(date, end) || isBefore(date, end))
    }
    return isSameDay(date, parseISO(tempStartDate))
  }

  const isDateSelected = (date: Date) => {
    if (!tempStartDate) return false
    return isSameDay(date, parseISO(tempStartDate)) || (tempEndDate && isSameDay(date, parseISO(tempEndDate)))
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    // Disable future dates
    if (isAfter(date, today)) return true
    
    // If we have a start date and are selecting end date, disable dates beyond 1 month
    if (tempStartDate && !selectingStart && !tempEndDate) {
      const start = parseISO(tempStartDate)
      const daysDiff = Math.abs(differenceInDays(date, start))
      if (isAfter(date, start) && daysDiff > 31) {
        return true
      }
    }
    
    return false
  }
  
  const getMaxEndDate = () => {
    if (!tempStartDate) return null
    const start = parseISO(tempStartDate)
    const maxEnd = addMonths(start, 1)
    const today = new Date()
    return isAfter(maxEnd, today) ? today : maxEnd
  }

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50 p-4 min-w-[320px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors"
          type="button"
        >
          <ChevronLeft className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
        </button>
        <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">
          {format(currentMonth, 'MMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors"
          type="button"
        >
          <ChevronRight className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-text-mutedLight dark:text-text-mutedDark py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isDateSelected(day)
          const inRange = isDateInRange(day)
          const isDisabled = isDateDisabled(day)
          const maxEndDate = getMaxEndDate()
          const isBeyondMax = !!(tempStartDate && !selectingStart && maxEndDate && isAfter(day, maxEndDate) && isAfter(day, parseISO(tempStartDate)))

          return (
            <button
              key={day.toString()}
              onClick={() => !isDisabled && !isBeyondMax && handleDateClick(day)}
              disabled={isDisabled || isBeyondMax}
              className={`
                relative h-10 w-10 rounded text-sm transition-colors
                ${!isCurrentMonth ? 'text-text-mutedLight dark:text-text-mutedDark opacity-50' : 'text-text-mainLight dark:text-text-mainDark'}
                ${isSelected
                  ? 'bg-purple-500 text-white font-semibold ring-2 ring-purple-300 dark:ring-purple-600'
                  : inRange
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                ${isDisabled || isBeyondMax ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
              type="button"
              {...(isBeyondMax ? { title: 'Maximum date range is 1 month' } : {})}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-text-mainLight dark:text-text-mainDark bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

