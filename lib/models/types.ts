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

// Reward types
export type RewardType = "instant_reward" | "entry" | "progress_only";

// Mechanic types
export type MechanicType = "ladder" | "collection";

// Trigger kinds
export type TriggerKind = "first_win" | "distinct_items" | "win_multiplier_range";

// Trigger subject (what the trigger applies to)
export type TriggerSubject = "game" | "provider" | "vertical" | null;

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

// Trigger configuration
export interface TriggerConfig {
  kind: TriggerKind;
  subject: TriggerSubject; // null for win_multiplier_range
  minMultiplier?: number; // for win_multiplier_range
  maxMultiplier?: number; // for win_multiplier_range
  instantReward?: RewardPayload; // optional instant reward for win_multiplier_range
  alsoProgress?: boolean; // if true, also counts toward ladder/collection
}

// Scope configuration (where promotion applies)
export interface ScopeConfig {
  games?: string[];
  providers?: string[];
  verticals?: ("slots" | "live" | "crash" | "table")[];
}

// Promotion configuration (composition-based)
export interface PromotionConfig {
  id: string;
  name: string;
  enabled: boolean;
  startAt: string; // ISO string
  endAt: string; // ISO string
  requiresOptIn: boolean; // if true, player must join before progress counts

  // Trigger: what qualifies an event
  trigger: TriggerConfig;

  // Scope: where the promotion applies (filters)
  scope?: ScopeConfig;

  // Mechanic: how progress is tracked
  mechanic: {
    type: MechanicType;
    ladder?: {
      levels: LadderLevel[];
    };
    collection?: CollectionConfig;
  };

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

