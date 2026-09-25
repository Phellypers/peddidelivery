export type LoyaltyRewardType = 'fixed_discount' | 'percentage_discount' | 'free_delivery';
export type LoyaltyDiscountType = 'fixed' | 'percentage' | 'free_shipping';

export interface LoyaltyProgram {
  id: string;
  store_id: string;
  active: boolean;
  name: string;
  required_steps: number;
  minimum_order_total: string | number;
  reward_type: LoyaltyRewardType;
  reward_value: string | number;
  reward_minimum_order: string | number;
  reward_validity_days: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserLoyaltyProgress {
  id: string;
  store_id: string;
  user_id: string;
  current_steps: number;
  required_steps: number;
  completed_cycles: number;
  updated_at: Date;
}

export interface ProcessLoyaltyResult {
  applied: boolean;
  reason?: string;
  new_steps?: number;
  cycle_completed?: boolean;
  reward_code?: string;
}
