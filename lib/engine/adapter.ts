import type { PromotionConfig, Event, PlayerPromotionState } from "@/lib/models/types";

/**
 * Adapter layer: Maps new composition-based promotion config to legacy evaluation logic
 * This allows us to keep existing evaluation logic unchanged
 */

export interface LegacyPromotionForEvaluation {
  type: "game_provider_discovery" | "multi_game_chain" | "opt_in_outcome_challenge" | "high_range_outcome";
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
  highRange?: {
    min: number;
    max: number;
    instantReward?: any;
    alsoProgress?: boolean;
  };
  includeGames?: string[];
  excludeGames?: string[];
  includeProviders?: string[];
  excludeProviders?: string[];
  includeVerticals?: ("slots" | "live" | "crash" | "table")[];
  excludeVerticals?: ("slots" | "live" | "crash" | "table")[];
}

/**
 * Convert new composition-based promotion to legacy format for evaluation
 */
export function adaptPromotionForEvaluation(
  promotion: PromotionConfig
): LegacyPromotionForEvaluation {
  const legacy: LegacyPromotionForEvaluation = {
    type: "game_provider_discovery", // default, will be overridden
    triggers: {},
  };

  // Map trigger to legacy type and triggers
  if (promotion.trigger.kind === "first_win") {
    legacy.type = "game_provider_discovery";
    if (promotion.trigger.subject === "game") {
      legacy.triggers!.first_win_on_game = true;
    } else if (promotion.trigger.subject === "provider") {
      legacy.triggers!.first_win_on_provider = true;
    } else if (promotion.trigger.subject === "vertical") {
      legacy.triggers!.first_win_on_provider = true; // fallback to provider
    }
  } else if (promotion.trigger.kind === "distinct_items") {
    legacy.type = "multi_game_chain";
    if (promotion.trigger.subject === "game") {
      legacy.triggers!.win_on_distinct_game = true;
    } else if (promotion.trigger.subject === "provider") {
      legacy.triggers!.win_on_distinct_provider = true;
    } else if (promotion.trigger.subject === "vertical") {
      legacy.triggers!.win_on_distinct_vertical = true;
    }
  } else if (promotion.trigger.kind === "win_multiplier_range") {
    // Check if it's opt-in (requiresOptIn) or high-range
    if (promotion.requiresOptIn) {
      legacy.type = "opt_in_outcome_challenge";
    } else {
      legacy.type = "high_range_outcome";
      legacy.highRange = {
        min: promotion.trigger.minMultiplier || 0,
        max: promotion.trigger.maxMultiplier || 999,
        instantReward: promotion.trigger.instantReward,
        alsoProgress: promotion.trigger.alsoProgress,
      };
    }
    legacy.triggers!.winMultiplier = {
      min: promotion.trigger.minMultiplier,
      max: promotion.trigger.maxMultiplier,
    };
  }

  // Map scope to legacy include/exclude
  if (promotion.scope) {
    if (promotion.scope.games) {
      legacy.includeGames = promotion.scope.games;
    }
    if (promotion.scope.providers) {
      legacy.includeProviders = promotion.scope.providers;
    }
    if (promotion.scope.verticals) {
      legacy.includeVerticals = promotion.scope.verticals;
    }
  }

  return legacy;
}

/**
 * Create a hybrid promotion object that works with existing evaluation logic
 */
export function createHybridPromotion(
  promotion: PromotionConfig
): PromotionConfig & LegacyPromotionForEvaluation {
  const legacy = adaptPromotionForEvaluation(promotion);
  return {
    ...promotion,
    ...legacy,
  } as PromotionConfig & LegacyPromotionForEvaluation;
}

