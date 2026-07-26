export type ProviderProfile = {
  id: string;
  business_name: string;
  category: string;
  provider_type?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  phone: string | null;
  show_phone_publicly: boolean;
  payment_methods: string[];
  payment_handles: Record<string, string>;
  website: string | null;
  description: string | null;
  hourly_rate_min: number;
  hourly_rate_max: number;
  years_experience: number | null;
  licensed: boolean;
  license_number: string | null;
  insured: boolean;
  insurance_details: string | null;
  available: boolean;
  subscription_tier: string;
  emergency_available: boolean;
  emergency_rate_multiplier: number;
  emergency_start_time: string;
  emergency_end_time: string;
  emergency_weekends: boolean;
  license_expiry: string | null;
  insurance_expiry: string | null;
  service_radius_miles: number;
  user_id: string;
  slug?: string | null;
};

export type BidWithJob = {
  id: string;
  job_id: string;
  message: string;
  bid_amount: number | null;
  estimated_hours: number | null;
  status: string;
  call_approved: boolean;
  phone_number: string | null;
  created_at: string;
  job?: {
    title: string;
    category: string;
    city: string;
    state: string;
    status: string;
    description: string | null;
    homeowner_id: string;
  };
};

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
};

export type MessageRow = {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  read: boolean;
  created_at: string;
};

export type ProviderStats = {
  avg_rating: number | null;
  review_count: number | null;
};
