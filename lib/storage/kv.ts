import type { Storage } from "./interface";
import type {
  PromotionConfig,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";

// Vercel KV storage implementation (optional, falls back to memory if not configured)
export class KVStorage implements Storage {
  private kv: any; // @vercel/kv client
  private memoryFallback: Storage;

  constructor() {
    // Try to import @vercel/kv (only if env vars are present)
    this.kv = null;
    if (
      typeof process !== "undefined" &&
      process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN
    ) {
      try {
        // Use dynamic import at runtime, not at build time
        // This will be handled at runtime
        this.kv = null; // Will be set lazily if needed
      } catch {
        this.kv = null;
      }
    }

    // Fallback to memory storage
    const { getMemoryStorage } = require("./memory");
    this.memoryFallback = getMemoryStorage();
  }

  private getKeyPrefix(key: string): string {
    return `promo:${key}`;
  }

  private async getKV(): Promise<any> {
    if (this.kv) return this.kv;
    if (
      typeof process !== "undefined" &&
      process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN
    ) {
      try {
        // Dynamic import only at runtime - use eval to avoid build-time resolution
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const importKV = new Function('return import("@vercel/kv")');
        const kvModule = await importKV();
        this.kv = kvModule.kv;
        return this.kv;
      } catch {
        return null;
      }
    }
    return null;
  }

  async getPromotion(id: string): Promise<PromotionConfig | null> {
    const kv: any = await this.getKV();
    if (!kv) return this.memoryFallback.getPromotion(id);
    const data = await kv.get(this.getKeyPrefix(`promotion:${id}`));
    return (data as PromotionConfig) || null;
  }

  async getAllPromotions(): Promise<PromotionConfig[]> {
    const kv = await this.getKV();
    if (!kv) return this.memoryFallback.getAllPromotions();
    // For KV, we'd need to maintain an index list
    // For simplicity, fallback to memory for list operations
    return this.memoryFallback.getAllPromotions();
  }

  async savePromotion(promo: PromotionConfig): Promise<void> {
    const kv = await this.getKV();
    if (!kv) {
      return this.memoryFallback.savePromotion(promo);
    }
    await kv.set(this.getKeyPrefix(`promotion:${promo.id}`), promo);
    // Also update index
    const index = ((await kv.get(this.getKeyPrefix("promo:index"))) as string[]) || [];
    if (!index.includes(promo.id)) {
      index.push(promo.id);
      await kv.set(this.getKeyPrefix("promo:index"), index);
    }
  }

  async deletePromotion(id: string): Promise<void> {
    const kv = await this.getKV();
    if (!kv) {
      return this.memoryFallback.deletePromotion(id);
    }
    await kv.del(this.getKeyPrefix(`promotion:${id}`));
    const index = ((await kv.get(this.getKeyPrefix("promo:index"))) as string[]) || [];
    const newIndex = index.filter((i: string) => i !== id);
    await kv.set(this.getKeyPrefix("promo:index"), newIndex);
  }

  async getPlayerState(playerId: string): Promise<PlayerState | null> {
    const kv: any = await this.getKV();
    if (!kv) return this.memoryFallback.getPlayerState(playerId);
    const data = await kv.get(this.getKeyPrefix(`player:${playerId}`));
    return (data as PlayerState) || null;
  }

  async savePlayerState(state: PlayerState): Promise<void> {
    const kv = await this.getKV();
    if (!kv) {
      return this.memoryFallback.savePlayerState(state);
    }
    await kv.set(this.getKeyPrefix(`player:${state.playerId}`), state);
  }

  async getAllPlayerStates(): Promise<PlayerState[]> {
    const kv = await this.getKV();
    if (!kv) return this.memoryFallback.getAllPlayerStates();
    // For simplicity, fallback to memory
    return this.memoryFallback.getAllPlayerStates();
  }

  async addLog(entry: LogEntry): Promise<void> {
    const kv = await this.getKV();
    if (!kv) return this.memoryFallback.addLog(entry);
    const key = this.getKeyPrefix(`logs:${entry.playerId}`);
    const logs = ((await kv.get(key)) as LogEntry[]) || [];
    logs.push(entry);
    if (logs.length > 100) logs.shift();
    await kv.set(key, logs);
  }

  async getPlayerLogs(playerId: string, limit: number = 50): Promise<LogEntry[]> {
    const kv = await this.getKV();
    if (!kv) return this.memoryFallback.getPlayerLogs(playerId, limit);
    const logs = ((await kv.get(this.getKeyPrefix(`logs:${playerId}`))) as LogEntry[]) || [];
    return logs.slice(-limit).reverse();
  }

  async reset(): Promise<void> {
    const kv = await this.getKV();
    if (!kv) return this.memoryFallback.reset();
    // Clear all keys with prefix
    // Note: This is simplified - in production you'd want a more robust cleanup
    await this.memoryFallback.reset();
  }
}

