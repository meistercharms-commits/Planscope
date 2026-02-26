/**
 * Category colour system for task cards.
 *
 * Single source of truth for all category-related visual properties:
 * border colours, badge colours, hover tints, checkbox colours, icons, and labels.
 *
 * Future-proofing: To support user-customisable colours (Pro feature),
 * modify getCategoryColors() to accept an optional userOverrides parameter
 * that merges database-stored preferences over these defaults.
 * No component changes would be needed — only this file.
 */

export type TaskCategory =
  | "work"
  | "health"
  | "home"
  | "money"
  | "life"
  | "other";

export interface CategoryColorScheme {
  /** Left border colour (3-4px accent) */
  border: string;
  /** Badge background (light tint) */
  badge: string;
  /** Badge text colour (darker shade) */
  badgeText: string;
  /** Very subtle hover background tint */
  hoverBg: string;
  /** Checkbox fill colour when task is done */
  checkboxDone: string;
  /** Path to category SVG icon */
  icon: string;
  /** Human-readable display label */
  label: string;
}

const CATEGORY_COLORS: Record<TaskCategory, CategoryColorScheme> = {
  work: {
    border: "#4A90B0",
    badge: "#EBF2F9",
    badgeText: "#3A7095",
    hoverBg: "#F5F9FC",
    checkboxDone: "#4A90B0",
    icon: "/icons/work.svg",
    label: "Work",
  },
  health: {
    border: "#6BA87D",
    badge: "#EFF6F1",
    badgeText: "#4A7A57",
    hoverBg: "#F7FAF8",
    checkboxDone: "#6BA87D",
    icon: "/icons/health.svg",
    label: "Health",
  },
  home: {
    border: "#B8956F",
    badge: "#F6F0EA",
    badgeText: "#8A6B48",
    hoverBg: "#FBF8F5",
    checkboxDone: "#B8956F",
    icon: "/icons/home.svg",
    label: "Home",
  },
  money: {
    border: "#7B68AE",
    badge: "#F0EDF6",
    badgeText: "#5A4A82",
    hoverBg: "#F8F6FB",
    checkboxDone: "#7B68AE",
    icon: "/icons/money.svg",
    label: "Money",
  },
  life: {
    border: "#D17F2B",
    badge: "#FDF3E8",
    badgeText: "#A66322",
    hoverBg: "#FEF9F3",
    checkboxDone: "#D17F2B",
    icon: "/icons/heart.svg",
    label: "Life",
  },
  other: {
    border: "#2E8B6A",
    badge: "#E8F6F3",
    badgeText: "#26714F",
    hoverBg: "#F3FAF7",
    checkboxDone: "#2E8B6A",
    icon: "/icons/other.svg",
    label: "Other",
  },
};

/**
 * Get the colour scheme for a given category.
 * Falls back to "other" for null/unknown categories.
 *
 * @future Accept optional `userOverrides?: Partial<CategoryColorScheme>`
 * parameter to support Pro user colour customisation from database.
 */
export function getCategoryColors(
  category: string | null
): CategoryColorScheme {
  const key = (category || "other") as TaskCategory;
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
}

/**
 * Convenience helper — get just the icon path for a category.
 */
export function getCategoryIcon(category: string | null): string {
  return getCategoryColors(category).icon;
}
