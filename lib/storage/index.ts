import type { Storage } from "./interface";
import { getMemoryStorage } from "./memory";
import { KVStorage } from "./kv";

// Get the appropriate storage implementation
// Uses KV if env vars are present, otherwise falls back to memory
export function getStorage(): Storage {
  // Check for Vercel KV environment variables
  if (
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    return new KVStorage();
  }
  return getMemoryStorage();
}



