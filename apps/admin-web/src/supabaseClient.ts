import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
// You can find these in your Supabase dashboard under Settings > API
const supabaseUrl = 'https://okycddtfijycafmidlid.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for your database tables
export type Profile = {
  id: string
  user_type: 'donor' | 'collector' | 'admin' | 'sponsor'
  full_name: string
  phone?: string
  profile_image_url?: string
  verification_status: string
  is_active: boolean
  updated_at: string
}

export type Donor = {
  donor_id: string
  points_earned: number
  total_recycled_kg: number
  pickups_completed: number
  level_status: string
}

export type Pickup = {
  pickup_id: string
  donor_id: string
  address_id: string
  scheduled_date: string
  status: string
  total_weight_kg?: number
  total_points_awarded?: number
  special_instructions?: string
}

// Add more types as needed for your application
