// Seeded list of fake games for the casino lobby
export interface Game {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  vertical: "slots" | "live" | "crash" | "table";
  thumbnail: string; // emoji or placeholder
}

export const GAMES: Game[] = [
  // Slots
  { id: "game-slot-1", name: "Lucky Spins", providerId: "provider-pragmatic", providerName: "Pragmatic Play", vertical: "slots", thumbnail: "🎰" },
  { id: "game-slot-2", name: "Diamond Rush", providerId: "provider-pragmatic", providerName: "Pragmatic Play", vertical: "slots", thumbnail: "💎" },
  { id: "game-slot-3", name: "Wild Fortune", providerId: "provider-netent", providerName: "NetEnt", vertical: "slots", thumbnail: "🦁" },
  { id: "game-slot-4", name: "Mega Win", providerId: "provider-netent", providerName: "NetEnt", vertical: "slots", thumbnail: "⭐" },
  { id: "game-slot-5", name: "Treasure Quest", providerId: "provider-evolution", providerName: "Evolution", vertical: "slots", thumbnail: "🗺️" },
  
  // Live
  { id: "game-live-1", name: "Live Blackjack", providerId: "provider-evolution", providerName: "Evolution", vertical: "live", thumbnail: "🃏" },
  { id: "game-live-2", name: "Live Roulette", providerId: "provider-evolution", providerName: "Evolution", vertical: "live", thumbnail: "🎲" },
  { id: "game-live-3", name: "Live Baccarat", providerId: "provider-ezugi", providerName: "Ezugi", vertical: "live", thumbnail: "🎴" },
  
  // Crash
  { id: "game-crash-1", name: "Rocket Crash", providerId: "provider-crash", providerName: "Crash Games", vertical: "crash", thumbnail: "🚀" },
  { id: "game-crash-2", name: "Minesweeper", providerId: "provider-crash", providerName: "Crash Games", vertical: "crash", thumbnail: "💣" },
  
  // Table
  { id: "game-table-1", name: "Classic Blackjack", providerId: "provider-pragmatic", providerName: "Pragmatic Play", vertical: "table", thumbnail: "♠️" },
  { id: "game-table-2", name: "European Roulette", providerId: "provider-netent", providerName: "NetEnt", vertical: "table", thumbnail: "🎯" },
];

export function getGameById(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

export function getGamesByProvider(providerId: string): Game[] {
  return GAMES.filter((g) => g.providerId === providerId);
}

export function getGamesByVertical(vertical: Game["vertical"]): Game[] {
  return GAMES.filter((g) => g.vertical === vertical);
}

