import type {
  PromotionConfig,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";

// Storage abstraction interface
export interface Storage {
  // Promotions
  getPromotion(id: string): Promise<PromotionConfig | null>;
  getAllPromotions(): Promise<PromotionConfig[]>;
  savePromotion(promo: PromotionConfig): Promise<void>;
  deletePromotion(id: string): Promise<void>;

  // Player state
  getPlayerState(playerId: string): Promise<PlayerState | null>;
  savePlayerState(state: PlayerState): Promise<void>;
  getAllPlayerStates(): Promise<PlayerState[]>;

  // Logs (keep recent N per player)
  addLog(entry: LogEntry): Promise<void>;
  getPlayerLogs(playerId: string, limit?: number): Promise<LogEntry[]>;

  // Seed/reset
  reset(): Promise<void>;
}



