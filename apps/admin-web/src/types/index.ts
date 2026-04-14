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
  hasLoggedIn?: boolean
}

export type SponsorStatusFilter = 'all' | 'pending' | 'awaiting' | 'active' | 'rejected' | 'suspended'

export interface Reward {
  id: string
  name: string
  points: number
  category: string
  stock: number
  redeemed: number
  sponsorName?: string
  isActive?: boolean
}

export interface RewardSubmission {
  submission_id:   string
  sponsor_id:      string
  reward_name:     string
  description:     string | null
  points_required: number
  stock_quantity:  number
  category:        string
  valid_from:      string | null
  valid_until:     string | null
  status:          'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at:      string
  sponsorName:     string
}

export interface SponsorInquiry {
  id: string
  company_name: string
  industry: string
  website: string
  salutation: string | null
  contact_person: string
  email: string
  phone: string
  position: string
  company_size: string
  office_state: string | null
  linkedin: string | null
  partnership_type: string
  budget: string
  objectives: string
  sustainability_goals: string
  additional_info: string
  doc_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
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
