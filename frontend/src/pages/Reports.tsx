import { useState } from 'react'
import { Download, Calendar, FileSpreadsheet } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import DateRangePicker from '../components/DateRangePicker'
import { issuesApi } from '../api/issues'

export default function Reports() {
  // Set default date range to last 30 days
  const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState<string>(defaultStartDate)
  const [endDate, setEndDate] = useState<string>(defaultEndDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date')
      return
    }

    setDownloading(true)
    try {
      await issuesApi.downloadReport(startDate, endDate)
      toast.success('Report downloaded successfully!')
    } catch (error: any) {
      console.error('Failed to download report:', error)
      toast.error(error.response?.data?.message || 'Failed to download report')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-mainLight dark:text-text-mainDark">
              Download Issue Report
            </h1>
            <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">
              Export issues data to Excel format
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Select Date Range
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark hover:border-primary-600 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
                  <span>
                    {startDate && endDate
                      ? `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`
                      : 'Select date range'}
                  </span>
                </div>
              </button>
              {showDatePicker && (
                <div className="absolute z-10 mt-2">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClose={() => setShowDatePicker(false)}
                    onApply={() => setShowDatePicker(false)}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-2">
              Select the date range for the issues you want to include in the report
            </p>
          </div>

          {/* Report Information */}
          <div className="bg-bg-light dark:bg-bg-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
            <h3 className="text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-3">
              Report Includes:
            </h3>
            <ul className="space-y-2 text-sm text-text-mutedLight dark:text-text-mutedDark">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Issue ID, Title, and Description</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Status, Priority, and Category</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Department Assignment</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Site and Location Information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Created Date, Updated Date, and Due Date</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Assigned User Information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Resolution Details (if resolved)</span>
              </li>
            </ul>
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              disabled={downloading || !startDate || !endDate}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Download Excel Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

