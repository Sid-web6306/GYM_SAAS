'use client'

import { BarChart, Card, Title, Text, Color } from '@tremor/react'
import { DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface RevenueData {
  month: string
  revenue: number
  target: number
}

interface RevenueChartProps {
  data?: RevenueData[]
  isLoading?: boolean
}

// Generate mock revenue data for the last 6 months
const generateRevenueData = (currentRevenue: number): RevenueData[] => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const currentMonth = new Date().getMonth()
  const data: RevenueData[] = []
  
  for (let i = 0; i < 6; i++) {
    const monthIndex = (currentMonth - 5 + i + 12) % 12
    const monthName = months[monthIndex]
    
    // Generate realistic revenue data with some variation
    const baseRevenue = currentRevenue
    const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
    const revenue = Math.round(baseRevenue * (1 + variation))
    const target = Math.round(baseRevenue * 1.1) // Target is 10% higher
    
    data.push({
      month: monthName,
      revenue,
      target
    })
  }
  
  // Set current month to actual current revenue
  data[data.length - 1].revenue = currentRevenue
  
  return data
}

// Get theme-based colors using Tremor's AvailableChartColorsKeys
const getThemeColors = (theme: string | undefined): Color[] => {
  // Using Tremor's predefined AvailableChartColorsKeys
  switch (theme) {
    case 'blue':
      return ['blue', 'cyan'] as Color[]
    case 'green':
      return ['emerald', 'lime'] as Color[]
    case 'purple':
      return ['violet', 'fuchsia'] as Color[]
    case 'rose':
      return ['pink', 'amber'] as Color[]
    default:
      return ['blue', 'cyan'] as Color[] // Default for light theme
  }
}

export const RevenueChart = ({ data, isLoading = false }: RevenueChartProps) => {
  const [chartData, setChartData] = useState<RevenueData[]>([])
  const [isClient, setIsClient] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setIsClient(true)
    if (!data) {
      setChartData(generateRevenueData(6000))
    } else {
      setChartData(data)
    }
  }, [data])

  // Get colors based on current theme
  const colors = getThemeColors(theme)
  
  // Debug logging for colors
  

  if (!isClient) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="h-5 w-5 text-gray-400" />
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
          <DollarSign className="h-5 w-5 text-gray-400" />
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  // Calculate metrics
  const currentMonth = chartData[chartData.length - 1]
  const previousMonth = chartData[chartData.length - 2]
  const monthlyGrowth = previousMonth 
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100)
    : 0

  const totalRevenue = chartData.reduce((sum, month) => sum + month.revenue, 0)
  const averageRevenue = Math.round(totalRevenue / chartData.length)

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className={`h-5 w-5 ${theme === 'blue' ? 'text-blue-600' : theme === 'green' ? 'text-emerald-600' : theme === 'purple' ? 'text-purple-600' : theme === 'rose' ? 'text-rose-600' : 'text-emerald-600'}`} />
          <Title>Monthly Revenue</Title>
        </div>
        <div className="text-right">
          <Text className="text-sm text-gray-600">vs last month</Text>
          <Text className={`text-sm font-medium ${monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
          </Text>
        </div>
      </div>
      
      <BarChart
        data={chartData}
        index="month"
        categories={["revenue", "target"]}
        colors={colors}
        valueFormatter={(number) => `$${number.toLocaleString()}`}
        className="h-64"
        showLegend={true}
        showGridLines={true}
        showXAxis={true}
        showYAxis={true}
        yAxisWidth={48}
        enableLegendSlider={false}
      />
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <Text className="text-gray-600">Current Month</Text>
            <Text className="font-medium text-gray-900">
              ${currentMonth.revenue.toLocaleString()}
            </Text>
          </div>
          <div>
            <Text className="text-gray-600">Target</Text>
            <Text className="font-medium text-gray-900">
              ${currentMonth.target.toLocaleString()}
            </Text>
          </div>
          <div>
            <Text className="text-gray-600">6-Month Avg</Text>
            <Text className="font-medium text-gray-900">
              ${averageRevenue.toLocaleString()}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  )
}