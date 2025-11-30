export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  total_points: number;
  image_url?: string;
  level_id?: number;
  status: string;
  language: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: number;
  user_id: number;
  category_id: number;
  severity_id: number;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  address_text?: string;
  photo_urls?: string;
  status_id: number;
  user_hide: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Coupon {
  id: number;
  company_id: number;
  coupon_category_id?: number;
  name: string;
  description: string;
  points_cost: number;
  image_url?: string;
  expiration_date?: string;
  max_usage_per_user?: number;
  total_available?: number;
  status: string;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface CouponCategory {
  id: number;
  name: string;
  description?: string;
}

export interface LeaderboardEntry {
  user_id: number;
  total_points: number;
  rank: number;
  full_name?: string; // Loaded separately from users API
}
