'use client'

import { AreaChart, Card, Title, Text } from '@tremor/react'
import { TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface MemberGrowthData {
  month: string
  members: number
  newMembers: number
}

interface MemberGrowthChartProps {
  data?: MemberGrowthData[]
  isLoading?: boolean
}

// Generate mock data for the last 12 months
const generateMemberGrowthData = (currentMembers: number): MemberGrowthData[] => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const currentMonth = new Date().getMonth()
  const data: MemberGrowthData[] = []
  
  // Start with a reasonable base number 12 months ago
  let totalMembers = Math.max(10, currentMembers - 50)
  
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12
    const monthName = months[monthIndex]
    
    // Generate realistic growth (2-8 new members per month)
    const newMembers = Math.floor(Math.random() * 7) + 2
    totalMembers += newMembers
    
    // Adjust the last month to match current members count
    if (i === 11) {
      const difference = currentMembers - totalMembers
      totalMembers = currentMembers
      data.push({
        month: monthName,
        members: totalMembers,
        newMembers: Math.max(0, newMembers + difference)
      })
    } else {
      data.push({
        month: monthName,
        members: totalMembers,
        newMembers
      })
    }
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
      return ['blue'] // Default for light theme
  }
}

export const MemberGrowthChart = ({ data, isLoading = false }: MemberGrowthChartProps) => {
  const [chartData, setChartData] = useState<MemberGrowthData[]>([])
  const [isClient, setIsClient] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setIsClient(true)
    if (!data) {
      setChartData(generateMemberGrowthData(120))
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
          <TrendingUp className="h-5 w-5 text-gray-400" />
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
          <TrendingUp className="h-5 w-5 text-gray-400" />
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  // Calculate growth percentage
  const firstMonth = chartData[0]?.members || 0
  const lastMonth = chartData[chartData.length - 1]?.members || 0
  const growthPercentage = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth * 100) : 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-5 w-5 ${theme === 'blue' ? 'text-blue-600' : theme === 'green' ? 'text-emerald-600' : theme === 'purple' ? 'text-purple-600' : theme === 'rose' ? 'text-rose-600' : 'text-blue-600'}`} />
          <Title>Member Growth</Title>
        </div>
        <div className="text-right">
          <Text className="text-sm text-gray-600">12-month growth</Text>
          <Text className={`text-sm font-medium ${growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
          </Text>
        </div>
      </div>
      
      <AreaChart
        data={chartData}
        index="month"
        categories={["members"]}
        colors={colors}
        valueFormatter={(number) => `${number} members`}
        className="h-64"
        showLegend={false}
        showGridLines={true}
        curveType="monotone"
      />
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <div>
            <Text className="text-gray-600">Total Growth</Text>
            <Text className="font-medium text-gray-900">
              +{lastMonth - firstMonth} members
            </Text>
          </div>
          <div className="text-right">
            <Text className="text-gray-600">Avg Monthly</Text>
            <Text className="font-medium text-gray-900">
              +{Math.round((lastMonth - firstMonth) / 12)} members
            </Text>
          </div>
        </div>
      </div>
    </Card>
  )
}