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
  deleted_at?: string;  // Soft delete timestamp
}

export interface Report {
  id: number;
  user_id: number;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  category_id: number;
  severity_id: number;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  address_text?: string;
  photo_urls?: string;
  ai_annotated_url?: string;  // AI annotated image with bounding boxes
  ai_detections?: string;     // JSON string of AI detection data
  status_id: number;
  user_hide: boolean;
  admin_comment?: string;
  repair_cost?: number;
  total_donated?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReportStatusHistory {
  id: number;
  report_id: number;
  old_status_id?: number;
  new_status_id: number;
  changed_by_user_id: number;
  changed_by_user_name?: string;
  changed_by_user_email?: string;
  comment?: string;
  created_at: string;
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

export interface AuditLog {
  id: number;
  action: string;
  user_id: number;
  user_email?: string;
  target_type: string;
  target_id?: number;
  details?: string;
  created_at: string;
}

export interface BulkOperationResult {
  success_count: number;
  failed_count: number;
  failed_ids: number[];
  message: string;
}

export interface Donation {
  id: number;
  report_id: number;
  user_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id?: string;
  donor_name?: string;
  donor_message?: string;
  user_name?: string;
  user_email?: string;
  report_title?: string;
  created_at: string;
}
