'use client'

import { LineChart, Card, Title, Text } from '@tremor/react'
import { Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface CheckinData {
  day: string
  checkins: number
  weekday: string
}

interface CheckinTrendsChartProps {
  data?: CheckinData[]
  isLoading?: boolean
}

// Generate mock check-in data for the last 7 days
const generateCheckinData = (): CheckinData[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const data: CheckinData[] = []
  
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const dayName = days[date.getDay()]
    const dayNum = date.getDate()
    
    // Generate realistic check-in patterns
    // Weekends and Monday/Friday typically lower, Tue-Thu higher
    let baseCheckins = 25
    if (dayName === 'Sat' || dayName === 'Sun') {
      baseCheckins = 15 // Lower weekend activity
    } else if (dayName === 'Mon' || dayName === 'Fri') {
      baseCheckins = 20 // Moderate on Mon/Fri
    } else {
      baseCheckins = 30 // Higher midweek
    }
    
    // Add some random variation
    const variation = Math.floor(Math.random() * 10) - 5
    const checkins = Math.max(5, baseCheckins + variation)
    
    data.push({
      day: `${dayName} ${dayNum}`,
      checkins,
      weekday: dayName
    })
  }
  
  return data
}

// Get theme-based colors using Tremor's AvailableChartColorsKeys
const getThemeColors = (theme: string | undefined) => {
  switch (theme) {
    case 'blue':
      return ['blue']
    case 'green':
      return ['emerald']
    case 'purple':
      return ['violet']
    case 'rose':
      return ['pink']
    default:
      return ['amber'] // Default for light theme
  }
}

export const CheckinTrendsChart = ({ data, isLoading = false }: CheckinTrendsChartProps) => {
  const [chartData, setChartData] = useState<CheckinData[]>([])
  const [isClient, setIsClient] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setIsClient(true)
    if (!data) {
      setChartData(generateCheckinData())
    } else {
      setChartData(data)
    }
  }, [data])

  // Get colors based on current theme
  const colors = getThemeColors(theme)

  if (!isClient) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-gray-400" />
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </Card>
    )
  }
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-gray-400" />
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  // Calculate metrics
  const totalCheckins = chartData.reduce((sum, day) => sum + day.checkins, 0)
  const averageCheckins = Math.round(totalCheckins / chartData.length)
  const todayCheckins = chartData[chartData.length - 1]?.checkins || 0
  const yesterdayCheckins = chartData[chartData.length - 2]?.checkins || 0
  const dailyChange = yesterdayCheckins > 0 
    ? ((todayCheckins - yesterdayCheckins) / yesterdayCheckins * 100)
    : 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${theme === 'blue' ? 'text-blue-600' : theme === 'green' ? 'text-emerald-600' : theme === 'purple' ? 'text-purple-600' : theme === 'rose' ? 'text-rose-600' : 'text-orange-600'}`} />
          <Title>Check-in Trends</Title>
        </div>
        <div className="text-right">
          <Text className="text-sm text-gray-600">vs yesterday</Text>
          <Text className={`text-sm font-medium ${dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(1)}%
          </Text>
        </div>
      </div>
      
      <LineChart
        data={chartData}
        index="day"
        categories={["checkins"]}
        colors={colors}
        valueFormatter={(number) => `${number} check-ins`}
        className="h-64"
        showLegend={false}
        showGridLines={true}
        curveType="monotone"
        connectNulls={true}
      />
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <Text className="text-gray-600">Today</Text>
            <Text className="font-medium text-gray-900">
              {todayCheckins} check-ins
            </Text>
          </div>
          <div>
            <Text className="text-gray-600">7-Day Average</Text>
            <Text className="font-medium text-gray-900">
              {averageCheckins} check-ins
            </Text>
          </div>
          <div>
            <Text className="text-gray-600">Weekly Total</Text>
            <Text className="font-medium text-gray-900">
              {totalCheckins} check-ins
            </Text>
          </div>
        </div>
      </div>
    </Card>
  )
}