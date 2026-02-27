import { useState, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateTimePickerProps {
  value: string // ISO string or empty
  onChange: (dateTime: string) => void
  onClose: () => void
  minDate?: Date
}

export default function DateTimePicker({
  value,
  onChange,
  onClose,
  minDate,
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null)
  const [hour, setHour] = useState<string>(value ? format(new Date(value), 'hh') : '12')
  const [minute, setMinute] = useState<string>(value ? format(new Date(value), 'mm') : '00')
  const [amPm, setAmPm] = useState<'am' | 'pm'>(value ? format(new Date(value), 'a').toLowerCase() as 'am' | 'pm' : 'am')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setSelectedDate(date)
      setCurrentMonth(startOfMonth(date))
      setHour(format(date, 'hh'))
      setMinute(format(date, 'mm'))
      setAmPm(format(date, 'a').toLowerCase() as 'am' | 'pm')
    }
  }, [value])

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
    setSelectedDate(date)
    // Update current month to show selected date's month
    setCurrentMonth(startOfMonth(date))
  }

  const handleNow = () => {
    const now = new Date()
    setSelectedDate(now)
    setCurrentMonth(startOfMonth(now))
    setHour(format(now, 'hh'))
    setMinute(format(now, 'mm'))
    setAmPm(format(now, 'a').toLowerCase() as 'am' | 'pm')
  }

  const handleDone = () => {
    if (!selectedDate) {
      // If no date selected, use today
      const today = new Date()
      setSelectedDate(today)
    }
    
    const finalDate = selectedDate || new Date()
    const hour24 = amPm === 'pm' && parseInt(hour) !== 12 
      ? parseInt(hour) + 12 
      : amPm === 'am' && parseInt(hour) === 12 
      ? 0 
      : parseInt(hour)
    
    finalDate.setHours(hour24, parseInt(minute), 0, 0)
    onChange(finalDate.toISOString())
    onClose()
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const isDateSelected = (date: Date) => {
    return selectedDate ? isSameDay(date, selectedDate) : false
  }

  const isDateDisabled = (date: Date) => {
    if (minDate) {
      return date < minDate
    }
    return false
  }

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = parseInt(e.target.value)
    const newDate = new Date(currentMonth)
    newDate.setMonth(monthIndex)
    setCurrentMonth(newDate)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value)
    const newDate = new Date(currentMonth)
    newDate.setFullYear(year)
    setCurrentMonth(newDate)
  }

  const formatDisplayValue = () => {
    if (!selectedDate) return ''
    const finalDate = new Date(selectedDate)
    const hourNum = parseInt(hour) || 12
    const minuteNum = parseInt(minute) || 0
    const hour24 = amPm === 'pm' && hourNum !== 12 
      ? hourNum + 12 
      : amPm === 'am' && hourNum === 12 
      ? 0 
      : hourNum
    finalDate.setHours(hour24, minuteNum, 0, 0)
    return format(finalDate, 'dd-MM-yyyy hh:mm a')
  }

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50 p-4 min-w-[320px]"
    >
      {/* Header with Month/Year Selectors */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors"
          type="button"
        >
          <ChevronLeft className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={handleMonthChange}
            className="bg-transparent border-none text-text-mainLight dark:text-text-mainDark font-medium focus:outline-none cursor-pointer"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={currentMonth.getFullYear()}
            onChange={handleYearChange}
            className="bg-transparent border-none text-text-mainLight dark:text-text-mainDark font-medium focus:outline-none cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isDateSelected(day)
          const isDisabled = isDateDisabled(day)

          return (
            <button
              key={day.toString()}
              onClick={() => !isDisabled && handleDateClick(day)}
              disabled={isDisabled}
              className={`
                relative h-10 w-10 rounded text-sm transition-colors
                ${!isCurrentMonth ? 'text-text-mutedLight dark:text-text-mutedDark opacity-50' : 'text-text-mainLight dark:text-text-mainDark'}
                ${isSelected
                  ? 'bg-yellow-400 dark:bg-yellow-500 text-gray-900 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
              type="button"
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Time Picker Section */}
      <div className="border-t border-border-light dark:border-border-dark pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-mainLight dark:text-text-mainDark">Time</label>
          <div className="flex-1 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-mainLight dark:text-text-mainDark">
            {formatDisplayValue() || 'Select date and time'}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-mainLight dark:text-text-mainDark">Hour</label>
            <input
              type="number"
              min="1"
              max="12"
              value={hour}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                  setHour(val ? val.padStart(2, '0') : '01')
                }
              }}
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) {
                  setHour('01')
                } else {
                  setHour(e.target.value.padStart(2, '0'))
                }
              }}
              className="w-16 px-2 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-mainLight dark:text-text-mainDark">Minute</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                  setMinute(val.padStart(2, '0') || '00')
                }
              }}
              className="w-16 px-2 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAmPm('am')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                amPm === 'am'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light dark:bg-surface-dark text-text-mainLight dark:text-text-mainDark border border-border-light dark:border-border-dark'
              }`}
              type="button"
            >
              AM
            </button>
            <button
              onClick={() => setAmPm('pm')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                amPm === 'pm'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light dark:bg-surface-dark text-text-mainLight dark:text-text-mainDark border border-border-light dark:border-border-dark'
              }`}
              type="button"
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-light dark:border-border-dark">
        <button
          onClick={handleNow}
          className="px-4 py-2 text-sm font-medium text-text-mainLight dark:text-text-mainDark bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
          type="button"
        >
          Now
        </button>
        <button
          onClick={handleDone}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  )
}

