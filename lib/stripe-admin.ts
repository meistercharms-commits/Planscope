import Stripe from "stripe";
import type { Tier } from "@/types";

// ─── Stripe Client (server-side only) ───

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Price ID Configuration ───

export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_plus_monthly: process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY!,
  pro_plus_annual: process.env.STRIPE_PRICE_PRO_PLUS_ANNUAL!,
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

// Valid price IDs set for validation
const VALID_PRICE_IDS = new Set(Object.values(STRIPE_PRICES));

// ─── Price → Tier Mapping ───

export function mapPriceIdToTier(priceId: string): Tier {
  if (priceId === STRIPE_PRICES.pro_monthly) return "pro";
  if (priceId === STRIPE_PRICES.pro_plus_monthly) return "pro_plus";
  if (priceId === STRIPE_PRICES.pro_plus_annual) return "pro_plus";
  return "free";
}

// ─── Validation ───

export function isValidPriceId(priceId: string): boolean {
  return VALID_PRICE_IDS.has(priceId);
}

// ─── Price Key → Stripe Price ID ───

export function getPriceId(key: StripePriceKey): string {
  return STRIPE_PRICES[key];
}

// ─── Friendly Names ───

export function getPriceName(priceId: string): string {
  if (priceId === STRIPE_PRICES.pro_monthly) return "Pro (Monthly)";
  if (priceId === STRIPE_PRICES.pro_plus_monthly) return "Pro Plus (Monthly)";
  if (priceId === STRIPE_PRICES.pro_plus_annual) return "Pro Plus (Annual)";
  return "Unknown";
}
