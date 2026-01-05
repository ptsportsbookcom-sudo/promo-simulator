import type { Storage } from "./interface";
import type {
  PromotionConfig,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";

// In-memory Map-based storage implementation
export class MemoryStorage implements Storage {
  private promotions = new Map<string, PromotionConfig>();
  private playerStates = new Map<string, PlayerState>();
  private logs = new Map<string, LogEntry[]>(); // keyed by playerId

  async getPromotion(id: string): Promise<PromotionConfig | null> {
    return this.promotions.get(id) || null;
  }

  async getAllPromotions(): Promise<PromotionConfig[]> {
    return Array.from(this.promotions.values());
  }

  async savePromotion(promo: PromotionConfig): Promise<void> {
    this.promotions.set(promo.id, promo);
  }

  async deletePromotion(id: string): Promise<void> {
    this.promotions.delete(id);
  }

  async getPlayerState(playerId: string): Promise<PlayerState | null> {
    return this.playerStates.get(playerId) || null;
  }

  async savePlayerState(state: PlayerState): Promise<void> {
    this.playerStates.set(state.playerId, state);
  }

  async getAllPlayerStates(): Promise<PlayerState[]> {
    return Array.from(this.playerStates.values());
  }

  async addLog(entry: LogEntry): Promise<void> {
    const playerLogs = this.logs.get(entry.playerId) || [];
    playerLogs.push(entry);
    // Keep only last 100 logs per player
    if (playerLogs.length > 100) {
      playerLogs.shift();
    }
    this.logs.set(entry.playerId, playerLogs);
  }

  async getPlayerLogs(
    playerId: string,
    limit: number = 50
  ): Promise<LogEntry[]> {
    const playerLogs = this.logs.get(playerId) || [];
    return playerLogs.slice(-limit).reverse(); // most recent first
  }

  async reset(): Promise<void> {
    this.promotions.clear();
    this.playerStates.clear();
    this.logs.clear();
  }
}

// Singleton instance
let memoryStorageInstance: MemoryStorage | null = null;

export function getMemoryStorage(): MemoryStorage {
  if (!memoryStorageInstance) {
    memoryStorageInstance = new MemoryStorage();
  }
  return memoryStorageInstance;
}

