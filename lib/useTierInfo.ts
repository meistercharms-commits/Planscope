'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tier, TIER_LIMITS } from '@/types';

interface TierInfo {
  tier: Tier;
  label: string;
  limits: typeof TIER_LIMITS['free'];
  usage: {
    plansThisMonth: number;
    plansLimit: number;
    plansRemaining: number | null;
  };
  loading: boolean;
  refresh: () => void;
}

export function useTierInfo(): TierInfo {
  const [data, setData] = useState<Omit<TierInfo, 'loading' | 'refresh'> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/tier');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Fall back to free tier defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const defaults: Omit<TierInfo, 'loading' | 'refresh'> = {
    tier: 'free',
    label: 'Free',
    limits: TIER_LIMITS.free,
    usage: { plansThisMonth: 0, plansLimit: 4, plansRemaining: 4 },
  };

  return {
    ...(data || defaults),
    loading,
    refresh: fetchInfo,
  };
}
