// Event model for simulated casino events
export interface Event {
  playerId: string;
  gameId: string;
  providerId: string;
  vertical: "slots" | "live" | "crash" | "table";
  winMultiplier: number;
  bonusTriggered: boolean;
  timestamp: string; // ISO string
}

// Promotion types
export type PromotionType =
  | "game_provider_discovery"
  | "multi_game_chain"
  | "opt_in_outcome_challenge"
  | "high_range_outcome";

// Reward types
export type RewardType = "instant_reward" | "entry" | "progress_only";

// Mechanic types
export type MechanicType = "ladder" | "collection";

// Reward payload
export interface RewardPayload {
  type: RewardType;
  amount?: number;
  label: string;
}

// Ladder level
export interface LadderLevel {
  level: number;
  requirement: number; // e.g., number of triggers needed
  reward: RewardPayload;
}

// Collection configuration
export interface CollectionConfig {
  targetCount?: number; // number of unique items needed
  targetSet?: string[]; // explicit set of items (gameIds/providerIds/verticals)
  collectBy: "gameId" | "providerId" | "vertical"; // what to collect
}

// High-range outcome configuration
export interface HighRangeConfig {
  min: number;
  max: number;
  instantReward?: RewardPayload; // optional instant reward when triggered
  alsoProgress?: boolean; // if true, also counts toward ladder/collection
}

// Promotion configuration
export interface PromotionConfig {
  id: string;
  name: string;
  type: PromotionType;
  enabled: boolean;
  startAt: string; // ISO string
  endAt: string; // ISO string
  requiresOptIn: boolean; // if true, player must join before progress counts

  // Eligibility filters
  includeGames?: string[];
  excludeGames?: string[];
  includeProviders?: string[];
  excludeProviders?: string[];
  includeVerticals?: ("slots" | "live" | "crash" | "table")[];
  excludeVerticals?: ("slots" | "live" | "crash" | "table")[];

  // Triggers (type-specific)
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

  // Mechanic configuration
  mechanic: {
    type: MechanicType;
    ladder?: {
      levels: LadderLevel[];
    };
    collection?: CollectionConfig;
  };

  // High-range specific config
  highRange?: HighRangeConfig;

  // Caps and cooldowns
  cooldownMinutes?: number; // per-player cooldown between rewards
  maxRewardsPerDay?: number; // per-player daily cap
  maxRewardsTotal?: number; // per-player lifetime cap

  // Default reward (if no ladder/collection)
  defaultReward?: RewardPayload;
}

// Player promotion state
export interface PlayerPromotionState {
  promotionId: string;
  joined: boolean; // for opt-in promotions
  progress: {
    currentLevel?: number; // for ladder
    collectedItems: string[]; // for collection
    triggerCount: number; // general trigger counter
  };
  rewards: RewardHistoryEntry[];
  lastRewardAt?: string; // ISO string for cooldown
  dailyRewardCount: number; // reset daily
  totalRewardCount: number; // lifetime
  lastUpdated: string; // ISO string
}

// Reward history entry
export interface RewardHistoryEntry {
  promotionId: string;
  reward: RewardPayload;
  timestamp: string; // ISO string
  reason: string; // human-readable reason
}

// Complete player state
export interface PlayerState {
  playerId: string;
  promotions: Record<string, PlayerPromotionState>; // keyed by promotionId
  lastEventAt?: string; // ISO string
}

// Evaluation result for explainability
export interface EvaluationResult {
  promotionId: string;
  eligible: boolean;
  fired: boolean; // whether reward was given or progress made
  reasons: string[]; // human-readable explanations
  reward?: RewardPayload; // if fired and reward given
}

// Log entry for explainability
export interface LogEntry {
  playerId: string;
  event: Event;
  timestamp: string; // ISO string
  evaluations: EvaluationResult[];
}

