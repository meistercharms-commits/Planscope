import { getUser, getMonthlyPlanCount as firestoreMonthlyPlanCount, getActiveWeekPlanCount as firestoreActiveWeekPlanCount, getActiveTaskCount } from '@/lib/firestore';
import { Tier, TIER_LIMITS } from '@/types';

const MAX_ACTIVE_TASKS = 7;
const TIER_CACHE_TTL_MS = 60_000; // 1 minute
const tierCache = new Map<string, { tier: Tier; expiresAt: number }>();

/**
 * Get the user's current tier from the database.
 * Anonymous users are always 'free'.
 * Results are cached for 60 seconds per user.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const cached = tierCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.tier;
  }

  const user = await getUser(userId);
  if (!user) return 'free';
  if (user.provider === 'anonymous') return 'free';
  const tier = (user.tier as Tier) || 'free';

  tierCache.set(userId, { tier, expiresAt: Date.now() + TIER_CACHE_TTL_MS });
  return tier;
}

/**
 * Count how many plans a user has created in the current calendar month.
 */
export async function getMonthlyPlanCount(userId: string): Promise<number> {
  return firestoreMonthlyPlanCount(userId);
}

/**
 * Check whether the user can create a new plan.
 */
export async function canCreatePlan(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
}> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  if (limits.plansPerMonth === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const count = await getMonthlyPlanCount(userId);

  const remaining = Math.max(0, limits.plansPerMonth - count);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: limits.plansPerMonth,
      message: `You've used all ${limits.plansPerMonth} plans this month. Your plans reset on the 1st.`,
    };
  }

  return { allowed: true, remaining, limit: limits.plansPerMonth };
}

/**
 * Check whether adding a task to the active sections would exceed the 7-item cap.
 */
export async function canAddActiveTask(planId: string): Promise<{
  allowed: boolean;
  activeCount: number;
  message?: string;
}> {
  const activeCount = await getActiveTaskCount(planId);

  if (activeCount >= MAX_ACTIVE_TASKS) {
    return {
      allowed: false,
      activeCount,
      message: 'Your plan is full. Pick what matters.',
    };
  }

  return { allowed: true, activeCount };
}

/**
 * Count how many active or review plans the user has for the current week.
 */
export async function getActiveWeekPlanCount(userId: string): Promise<number> {
  return firestoreActiveWeekPlanCount(userId);
}

/**
 * Check whether the user can create an additional active plan this week.
 * Free/Pro users are limited to 1 active plan per week.
 */
export async function canCreateAdditionalPlan(userId: string): Promise<{
  allowed: boolean;
  activeCount: number;
  message?: string;
}> {
  const tier = await getUserTier(userId);

  // Pro Plus can have unlimited active plans — skip the Firestore query
  if (canHaveMultipleActivePlans(tier)) {
    return { allowed: true, activeCount: 0 };
  }

  const activeCount = await getActiveWeekPlanCount(userId);

  if (activeCount >= 1) {
    return {
      allowed: false,
      activeCount,
      message: 'You already have an active plan this week. Finish your tasks or archive it to start a new one.',
    };
  }

  return { allowed: true, activeCount };
}

export function canHaveMultipleActivePlans(tier: Tier): boolean {
  return TIER_LIMITS[tier].multipleActivePlans;
}

export function canViewHistory(tier: Tier): boolean {
  return TIER_LIMITS[tier].history;
}

export function canUseRecurring(tier: Tier): boolean {
  return TIER_LIMITS[tier].recurring;
}
