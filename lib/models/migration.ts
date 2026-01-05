import type { PromotionConfig } from "./types";

// Legacy promotion type for backward compatibility
type LegacyPromotionType =
  | "game_provider_discovery"
  | "multi_game_chain"
  | "opt_in_outcome_challenge"
  | "high_range_outcome";

interface LegacyPromotionConfig {
  id: string;
  name: string;
  type?: LegacyPromotionType;
  enabled: boolean;
  startAt: string;
  endAt: string;
  requiresOptIn: boolean;
  includeGames?: string[];
  excludeGames?: string[];
  includeProviders?: string[];
  excludeProviders?: string[];
  includeVerticals?: ("slots" | "live" | "crash" | "table")[];
  excludeVerticals?: ("slots" | "live" | "crash" | "table")[];
  triggers?: {
    first_win_on_game?: boolean;
    first_win_on_provider?: boolean;
    first_bonus_trigger_on_provider?: boolean;
    win_on_distinct_game?: boolean;
    win_on_distinct_provider?: boolean;
    win_on_distinct_vertical?: boolean;
    winMultiplier?: {
      min?: number;
      max?: number;
    };
  };
  mechanic: {
    type: "ladder" | "collection";
    ladder?: any;
    collection?: any;
  };
  highRange?: {
    min: number;
    max: number;
    instantReward?: any;
    alsoProgress?: boolean;
  };
  cooldownMinutes?: number;
  maxRewardsPerDay?: number;
  maxRewardsTotal?: number;
  defaultReward?: any;
}

/**
 * Migrate legacy promotion config to new composition-based model
 */
export function migrateLegacyPromotion(
  legacy: LegacyPromotionConfig
): PromotionConfig {
  // If already in new format, return as-is
  if ("trigger" in legacy && !("type" in legacy)) {
    return legacy as PromotionConfig;
  }

  const newConfig: Partial<PromotionConfig> = {
    id: legacy.id,
    name: legacy.name,
    enabled: legacy.enabled,
    startAt: legacy.startAt,
    endAt: legacy.endAt,
    requiresOptIn: legacy.requiresOptIn || false,
    mechanic: legacy.mechanic,
    cooldownMinutes: legacy.cooldownMinutes,
    maxRewardsPerDay: legacy.maxRewardsPerDay,
    maxRewardsTotal: legacy.maxRewardsTotal,
    defaultReward: legacy.defaultReward,
  };

  // Migrate scope
  if (
    legacy.includeGames ||
    legacy.includeProviders ||
    legacy.includeVerticals
  ) {
    newConfig.scope = {};
    if (legacy.includeGames) newConfig.scope.games = legacy.includeGames;
    if (legacy.includeProviders)
      newConfig.scope.providers = legacy.includeProviders;
    if (legacy.includeVerticals)
      newConfig.scope.verticals = legacy.includeVerticals;
  }

  // Migrate trigger based on type and triggers
  if (legacy.type === "game_provider_discovery") {
    if (legacy.triggers?.first_win_on_provider) {
      newConfig.trigger = {
        family: "discovery",
        discoveryTarget: "first_win_on_provider",
      };
    } else if (legacy.triggers?.first_win_on_game) {
      newConfig.trigger = {
        family: "discovery",
        discoveryTarget: "first_win_on_game",
      };
    } else {
      newConfig.trigger = {
        family: "discovery",
        discoveryTarget: "first_win_on_provider",
      };
    }
    // Migrate outcome filter if present
    if (legacy.triggers?.winMultiplier) {
      newConfig.trigger.outcomeFilter = {
        minMultiplier: legacy.triggers.winMultiplier.min,
        maxMultiplier: legacy.triggers.winMultiplier.max,
      };
    }
  } else if (legacy.type === "multi_game_chain") {
    if (legacy.triggers?.win_on_distinct_game) {
      newConfig.trigger = {
        family: "multi_game_chain",
        distinctDimension: "game",
        requiredDistinctCount: 3, // default
      };
    } else if (legacy.triggers?.win_on_distinct_provider) {
      newConfig.trigger = {
        family: "multi_game_chain",
        distinctDimension: "provider",
        requiredDistinctCount: 3, // default
      };
    } else if (legacy.triggers?.win_on_distinct_vertical) {
      newConfig.trigger = {
        family: "multi_game_chain",
        distinctDimension: "vertical",
        requiredDistinctCount: 3, // default
      };
    } else {
      newConfig.trigger = {
        family: "multi_game_chain",
        distinctDimension: "game",
        requiredDistinctCount: 3, // default
      };
    }
    // Migrate outcome filter if present
    if (legacy.triggers?.winMultiplier) {
      newConfig.trigger.outcomeFilter = {
        minMultiplier: legacy.triggers.winMultiplier.min,
        maxMultiplier: legacy.triggers.winMultiplier.max,
      };
    }
  } else if (legacy.type === "opt_in_outcome_challenge") {
    const multiplier = legacy.triggers?.winMultiplier;
    newConfig.trigger = {
      family: "high_range_outcome",
      minMultiplier: multiplier?.min || 0,
      maxMultiplier: multiplier?.max || 999,
    };
  } else if (legacy.type === "high_range_outcome") {
    const highRange = legacy.highRange || legacy.triggers?.winMultiplier;
    newConfig.trigger = {
      family: "high_range_outcome",
      minMultiplier: highRange?.min || legacy.triggers?.winMultiplier?.min || 0,
      maxMultiplier:
        highRange?.max || legacy.triggers?.winMultiplier?.max || 999,
      instantReward: legacy.highRange?.instantReward,
      alsoProgress: legacy.highRange?.alsoProgress,
    };
  } else {
    // Default fallback
    newConfig.trigger = {
      family: "discovery",
      discoveryTarget: "first_win_on_provider",
    };
  }

  return newConfig as PromotionConfig;
}

