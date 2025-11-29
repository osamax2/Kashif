import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { couponsAPI, isCouponActive, type Coupon } from "@/services/coupons";

export type CouponTab = "active" | "inactive";

export interface UseCouponsOptions {
  initialTab?: CouponTab;
  limit?: number;
}

interface UseCouponsResult {
  coupons: Coupon[];
  filteredCoupons: Coupon[];
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CouponTab>(initialTab);
  const { t } = useLanguage();

  const loadCoupons = useCallback(async () => {
    const data = await couponsAPI.getCoupons({ limit });

    if (Array.isArray(data) && data.length > 0) {
      setCoupons(data);
    } else {
      setCoupons([]);
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

  return {
    coupons,
    filteredCoupons,
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