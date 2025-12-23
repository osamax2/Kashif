import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { couponsAPI, isCouponActive, type Coupon, type CouponRedemption } from "@/services/coupons";

export type CouponTab = "active" | "inactive" | "used";

export interface UseCouponsOptions {
  initialTab?: CouponTab;
  limit?: number;
}

export interface CouponWithRedemption extends Coupon {
  redemption?: CouponRedemption;
}

interface UseCouponsResult {
  coupons: Coupon[];
  filteredCoupons: Coupon[];
  usedCoupons: CouponWithRedemption[];
  redemptions: CouponRedemption[];
  search: string;
  setSearch: (value: string) => void;
  activeTab: CouponTab;
  setActiveTab: (tab: CouponTab) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function useCoupons({ initialTab = "active", limit = 200 }: UseCouponsOptions = {}): UseCouponsResult {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CouponTab>(initialTab);
  const { t } = useLanguage();

  const loadCoupons = useCallback(async () => {
    const [couponsData, redemptionsData] = await Promise.all([
      couponsAPI.getCoupons({ limit }),
      couponsAPI.getMyRedemptions({ limit: 100 }).catch(() => [] as CouponRedemption[]),
    ]);

    if (Array.isArray(couponsData) && couponsData.length > 0) {
      setCoupons(couponsData);
    } else {
      setCoupons([]);
    }

    if (Array.isArray(redemptionsData)) {
      setRedemptions(redemptionsData);
    } else {
      setRedemptions([]);
    }

    setError(null);
  }, [limit]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      await loadCoupons();
    } catch (err) {
      console.error("Failed to fetch coupons", err);
      setError(t("coupons.loadError"));
    } finally {
      setLoading(false);
    }
  }, [loadCoupons, t]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        await loadCoupons();
      } catch (err) {
        console.error("Failed to fetch coupons", err);
        if (isMounted) {
          setError(t("coupons.loadError"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [loadCoupons, t]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadCoupons();
    } catch (err) {
      console.error("Failed to refresh coupons", err);
      setError(t("coupons.loadError"));
    } finally {
      setRefreshing(false);
    }
  }, [loadCoupons, t]);

  const filteredCoupons = useMemo(() => {
    // For "used" tab, we handle separately
    if (activeTab === "used") {
      return [];
    }

    const normalizedSearch = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const isActive = isCouponActive(coupon);
      const matchesTab = activeTab === "active" ? isActive : !isActive;

      if (!matchesTab) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const haystack = `${coupon.name} ${coupon.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeTab, coupons, search]);

  // Create usedCoupons by matching redemptions with coupons
  const usedCoupons = useMemo((): CouponWithRedemption[] => {
    const normalizedSearch = search.trim().toLowerCase();

    return redemptions
      .map((redemption) => {
        const coupon = coupons.find((c) => c.id === redemption.coupon_id);
        if (!coupon) return null;
        return { ...coupon, redemption };
      })
      .filter((item): item is CouponWithRedemption => {
        if (!item) return false;
        if (normalizedSearch.length === 0) return true;
        const haystack = `${item.name} ${item.description}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [redemptions, coupons, search]);

  return {
    coupons,
    filteredCoupons,
    usedCoupons,
    redemptions,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    error,
    refetch,
    onRefresh,
  };
}