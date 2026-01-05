"use client";

import { useState, useEffect } from "react";
import { GAMES, getGameById, type Game } from "@/lib/data/games";
import type {
  Event,
  PromotionConfig,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";

const DEFAULT_PLAYER_ID = "player-demo-1";

export default function PlayerPage() {
  const [playerId, setPlayerId] = useState(DEFAULT_PLAYER_ID);
  const [selectedGame, setSelectedGame] = useState<Game | null>(GAMES[0] || null);
  const [winMultiplier, setWinMultiplier] = useState(1.5);
  const [bonusTriggered, setBonusTriggered] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [promotions, setPromotions] = useState<PromotionConfig[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load player data
  const loadPlayerData = async () => {
    try {
      const res = await fetch(`/api/player/${playerId}`);
      const data = await res.json();
      setPlayerState(data.playerState);
      setPromotions(data.activePromotions || []);
      setLogs(data.recentLogs || []);
    } catch (error) {
      console.error("Error loading player data:", error);
    }
  };

  useEffect(() => {
    // Initialize seed data if needed
    fetch("/api/init").then(() => {
      loadPlayerData();
    });
  }, [playerId]);

  // Simulate event
  const handlePlay = async () => {
    if (!selectedGame) return;

    setLoading(true);
    setMessage(null);

    const event: Event = {
      playerId,
      gameId: selectedGame.id,
      providerId: selectedGame.providerId,
      vertical: selectedGame.vertical,
      winMultiplier,
      bonusTriggered,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, event }),
      });

      const data = await res.json();
      if (data.success) {
        setPlayerState(data.playerState);
        setMessage("Event processed successfully!");
        await loadPlayerData(); // Reload to get updated logs
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Join/leave opt-in promotion
  const handleJoinLeave = async (promoId: string, action: "join" | "leave") => {
    try {
      const res = await fetch(`/api/admin/promotions/${promoId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, action }),
      });

      if (res.ok) {
        await loadPlayerData();
      }
    } catch (error) {
      console.error("Error joining/leaving:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">🎮 Player View</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="px-4 py-2 bg-slate-800 rounded text-white"
              placeholder="Player ID"
            />
            <button
              onClick={loadPlayerData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Refresh
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Home
            </a>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-600 rounded">{message}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Lobby */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">🎰 Game Lobby</h2>
              <div className="grid grid-cols-4 gap-4">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedGame?.id === game.id
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-slate-700 bg-slate-700/50 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-4xl mb-2">{game.thumbnail}</div>
                    <div className="text-sm font-semibold">{game.name}</div>
                    <div className="text-xs text-gray-400">{game.providerName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Event Simulator */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">🎲 Event Simulator</h2>
              {selectedGame && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">Selected Game</label>
                    <div className="p-3 bg-slate-700 rounded">
                      {selectedGame.thumbnail} {selectedGame.name} ({selectedGame.providerName})
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">Win Multiplier</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={winMultiplier}
                      onChange={(e) => setWinMultiplier(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={bonusTriggered}
                        onChange={(e) => setBonusTriggered(e.target.checked)}
                        className="w-5 h-5"
                      />
                      Bonus Triggered
                    </label>
                  </div>
                  <button
                    onClick={handlePlay}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "🎮 Play"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Promotions Panel */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">🎁 Active Promotions</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {promotions.map((promo) => {
                  const promoState = playerState?.promotions[promo.id];
                  return (
                    <div
                      key={promo.id}
                      className="p-4 bg-slate-700 rounded border border-slate-600"
                    >
                      <div className="font-semibold mb-2">{promo.name}</div>
                      <div className="text-sm text-gray-400 mb-3">
                        {promo.trigger.kind} / {promo.mechanic.type}
                      </div>

                      {promo.requiresOptIn && (
                        <div className="mb-3">
                          {promoState?.joined ? (
                            <button
                              onClick={() => handleJoinLeave(promo.id, "leave")}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                            >
                              Leave
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinLeave(promo.id, "join")}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      )}

                      {promoState && (
                        <div className="text-sm space-y-1">
                          {promo.mechanic.type === "ladder" && (
                            <div>
                              Level: {promoState.progress.currentLevel || 0} /{" "}
                              {promo.mechanic.ladder?.levels.length || 0}
                            </div>
                          )}
                          {promo.mechanic.type === "collection" && (
                            <div>
                              Collected: {promoState.progress.collectedItems.length} /{" "}
                              {promo.mechanic.collection?.targetCount ||
                                promo.mechanic.collection?.targetSet?.length ||
                                0}
                            </div>
                          )}
                          <div className="text-gray-400">
                            Rewards: {promoState.rewards.length}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rewards History */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">🏆 Rewards History</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {playerState &&
                  Object.values(playerState.promotions)
                    .flatMap((p) => p.rewards)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((reward, idx) => (
                      <div key={idx} className="p-2 bg-slate-700 rounded text-sm">
                        <div className="font-semibold">{reward.reward.label}</div>
                        <div className="text-gray-400 text-xs">
                          {new Date(reward.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                {(!playerState ||
                  Object.values(playerState.promotions).every((p) => p.rewards.length === 0)) && (
                  <div className="text-gray-400 text-sm">No rewards yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Explainability Panel */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🔍 Last Evaluation Logs</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {logs.slice(0, 5).map((log, idx) => (
              <div key={idx} className="p-4 bg-slate-700 rounded">
                <div className="text-sm text-gray-400 mb-2">
                  {new Date(log.timestamp).toLocaleString()} - Game: {log.event.gameId} - Win:{" "}
                  {log.event.winMultiplier}x
                </div>
                <div className="space-y-2">
                  {log.evaluations.map((evaluation, evalIdx) => (
                    <div key={evalIdx} className="pl-4 border-l-2 border-slate-600">
                      <div className="font-semibold">
                        {promotions.find((p) => p.id === evaluation.promotionId)?.name || evaluation.promotionId}
                      </div>
                      <div className="text-sm">
                        <span
                          className={
                            evaluation.eligible ? "text-green-400" : "text-red-400"
                          }
                        >
                          Eligible: {evaluation.eligible ? "Yes" : "No"}
                        </span>
                        {evaluation.fired && (
                          <span className="ml-4 text-yellow-400">Fired: Yes</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {evaluation.reasons.join(" • ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-400">No evaluation logs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

