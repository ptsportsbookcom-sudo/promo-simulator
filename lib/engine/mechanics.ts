import type {
  PromotionConfig,
  PlayerPromotionState,
  RewardPayload,
  LadderLevel,
  CollectionConfig,
  Event as GameEvent,
} from "@/lib/models/types";

/**
 * Apply ladder mechanic - check if level is completed and return reward
 */
export function applyLadder(
  promotion: PromotionConfig,
  playerState: PlayerPromotionState | null,
  triggerCount: number = 1
): { reward: RewardPayload | null; newLevel: number; reasons: string[] } {
  const reasons: string[] = [];

  if (promotion.mechanic.type !== "ladder" || !promotion.mechanic.ladder) {
    reasons.push("Not a ladder promotion");
    return { reward: null, newLevel: 0, reasons };
  }

  const currentLevel = playerState?.progress.currentLevel || 0;
  const currentTriggerCount = (playerState?.progress.triggerCount || 0) + triggerCount;
  const levels = promotion.mechanic.ladder.levels;

  // Find the highest level that should be completed
  let newLevel = currentLevel;
  let reward: RewardPayload | null = null;

  for (const level of levels) {
    if (level.level > currentLevel && currentTriggerCount >= level.requirement) {
      newLevel = level.level;
      reward = level.reward;
      reasons.push(`Level ${level.level} completed (requirement: ${level.requirement}, current: ${currentTriggerCount})`);
    }
  }

  if (!reward) {
    reasons.push(`No new level reached. Current: ${currentLevel}, Triggers: ${currentTriggerCount}`);
  }

  return { reward, newLevel, reasons };
}

/**
 * Apply collection mechanic - check if collection is complete and return reward
 */
export function applyCollection(
  promotion: PromotionConfig,
  playerState: PlayerPromotionState | null,
  newItem: string // gameId, providerId, or vertical
): { reward: RewardPayload | null; completed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (promotion.mechanic.type !== "collection" || !promotion.mechanic.collection) {
    reasons.push("Not a collection promotion");
    return { reward: null, completed: false, reasons };
  }

  const config = promotion.mechanic.collection;
  const collected = new Set(playerState?.progress.collectedItems || []);

  // Add new item (if not already collected)
  const wasNew = !collected.has(newItem);
  if (wasNew) {
    collected.add(newItem);
    reasons.push(`Collected new item: ${newItem}`);
  } else {
    reasons.push(`Item already collected: ${newItem} (no new progress)`);
  }

  const collectedArray = Array.from(collected);

  // Check if collection is complete
  let completed = false;

  if (config.targetSet && config.targetSet.length > 0) {
    // Check if all target items are collected
    completed = config.targetSet.every((item) => collected.has(item));
    if (completed) {
      reasons.push(`Collection complete: all ${config.targetSet.length} target items collected`);
    } else {
      const missing = config.targetSet.filter((item) => !collected.has(item));
      reasons.push(`Collection progress: ${collectedArray.length}/${config.targetSet.length} (missing: ${missing.join(", ")})`);
    }
  } else if (config.targetCount) {
    // Check if target count is reached
    completed = collectedArray.length >= config.targetCount;
    if (completed) {
      reasons.push(`Collection complete: ${collectedArray.length}/${config.targetCount} items collected`);
    } else {
      reasons.push(`Collection progress: ${collectedArray.length}/${config.targetCount}`);
    }
  }

  // Return default reward if collection is complete
  const reward: RewardPayload | null = completed && promotion.defaultReward
    ? promotion.defaultReward
    : null;

  return { reward, completed, reasons };
}

/**
 * Determine what item to collect based on promotion config
 */
export function getCollectionItem(
  event: GameEvent,
  promotion: PromotionConfig
): string | null {
  if (promotion.mechanic.type !== "collection" || !promotion.mechanic.collection) {
    return null;
  }

  const collectBy = promotion.mechanic.collection.collectBy;

  switch (collectBy) {
    case "gameId":
      return event.gameId;
    case "providerId":
      return event.providerId;
    case "vertical":
      return event.vertical;
    default:
      return null;
  }
}

