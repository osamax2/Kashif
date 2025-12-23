import api from './api';

export interface Coupon {
    id: number;
    company_id: number;
    coupon_category_id?: number | null;
    name: string;
    description: string;
    points_cost: number;
    image_url?: string | null;
    address?: string | null;
    expiration_date?: string | null;
    max_usage_per_user?: number | null;
    total_available?: number | null;
    status: string;
    created_at: string;
}

export interface CouponRedemption {
    id: number;
    user_id: number;
    coupon_id: number;
    points_spent: number;
    verification_code: string;
    status: string;
    verified_at?: string | null;
    verified_by?: number | null;
    redeemed_at: string;
}

export interface CouponQueryParams {
    skip?: number;
    limit?: number;
    coupon_category_id?: number;
    company_id?: number;
}

export const couponsAPI = {
    async getCoupons(params?: CouponQueryParams): Promise<Coupon[]> {
        const response = await api.get<Coupon[]>('/api/coupons/', { params });
        return response.data;
    },

    async getCoupon(id: number): Promise<Coupon> {
        const response = await api.get<Coupon>(`/api/coupons/${id}`);
        return response.data;
    },

    async redeemCoupon(id: number): Promise<CouponRedemption> {
        const response = await api.post<CouponRedemption>(`/api/coupons/${id}/redeem`);
        return response.data;
    },

    async getMyRedemptions(params?: { skip?: number; limit?: number }): Promise<CouponRedemption[]> {
        const response = await api.get<CouponRedemption[]>('/api/coupons/redemptions/me', {
            params,
        });
        return response.data;
    },
};

export const isCouponExpired = (coupon: Coupon, now: Date = new Date()): boolean => {
    if (!coupon.expiration_date) {
        return false;
    }

    const expiryDate = new Date(coupon.expiration_date);
    return expiryDate.getTime() < now.getTime();
};

export const isCouponActive = (coupon: Coupon, now: Date = new Date()): boolean => {
    if (coupon.status !== 'ACTIVE') {
        return false;
    }

    return !isCouponExpired(coupon, now);
};
