export interface User {
  id: string
  name: string
  email: string
  type: 'Donor' | 'Collector' | 'Sponsor' | 'Admin'
  status: string
  points?: number
  collections?: number
  joinDate: string
  company_name?: string
}

export interface Reward {
  id: string
  name: string
  points: number
  category: string
  stock: number
  redeemed: number
}

export interface Route {
  id: string
  name: string
  status: 'active' | 'completed' | 'pending'
  collector?: string
  pickups: number
  efficiency: number
  estimatedTime: string
}

export interface Collector {
  id: string
  name: string
  status: 'active' | 'idle' | 'offline'
  routeInfo: string
  efficiency?: number
  routesCompleted?: number
  avgPickupTime?: number
  rating?: number
  pickups?: number
  successRate?: number
}

export interface MaterialData {
  weight: number
  trend?: 'increasing' | 'decreasing' | 'stable'
  percentage?: number
}

export interface MonthlyData {
  month: string
  materials?: Record<string, MaterialData>
  pickups?: number
  uniqueDonors?: number
  totalWeight?: number
}

export interface Analytics {
  monthlyData: MonthlyData[]
  regionalBreakdown?: RegionalData[]
  materialBreakdown?: Record<string, number>
  environmentalImpact?: {
    co2Saved: number
    energySaved: number
    waterSaved: number
    treesSaved: number
    landfillDiverted: number
  }
  totalWeight?: number
  totalPickups?: number
  completedPickups?: number
}

export interface RegionalData {
  state: string
  performance: string
  collections: number
  users: number
  volume: number
  growth: number
}

export interface CollectorPerformance {
  averageEfficiency: number
  routesOptimized: number
  avgPickupTime: number
  successRate: number
  topPerformers: Collector[]
}

export interface DashboardMetrics {
  totalUsers: number
  totalWeightKg: number
  completedPickups: number
  totalPickups: number
  availableRewards: number
  totalRedeemed: number
}
