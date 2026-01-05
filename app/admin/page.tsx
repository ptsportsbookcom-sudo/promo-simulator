"use client";

import { useState, useEffect } from "react";
import type {
  PromotionConfig,
  PromotionType,
  MechanicType,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";

export default function AdminPage() {
  const [promotions, setPromotions] = useState<PromotionConfig[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<PromotionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [inspectedPlayer, setInspectedPlayer] = useState<{
    playerState: PlayerState;
    logs: LogEntry[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<PromotionConfig>>({
    enabled: true,
    requiresOptIn: false,
    mechanic: { type: "ladder" },
  });

  useEffect(() => {
    // Initialize seed data if needed
    fetch("/api/init").then(() => {
      loadPromotions();
    });
  }, []);

  const loadPromotions = async () => {
    try {
      const res = await fetch("/api/admin/promotions");
      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch (error) {
      console.error("Error loading promotions:", error);
    }
  };

  const handleToggleEnabled = async (promo: PromotionConfig) => {
    try {
      const updated = { ...promo, enabled: !promo.enabled };
      await fetch(`/api/admin/promotions/${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      await loadPromotions();
    } catch (error) {
      console.error("Error toggling promotion:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
      await loadPromotions();
      if (selectedPromo?.id === id) {
        setSelectedPromo(null);
      }
    } catch (error) {
      console.error("Error deleting promotion:", error);
    }
  };

  const handleEdit = (promo: PromotionConfig) => {
    setSelectedPromo(promo);
    setFormData(promo);
  };

  const handleNew = () => {
    setSelectedPromo(null);
    setFormData({
      id: "",
      name: "",
      type: "game_provider_discovery",
      enabled: true,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      requiresOptIn: false,
      triggers: {},
      mechanic: { type: "ladder" },
    });
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    if (!formData.id) errs.push("ID is required");
    if (!formData.name) errs.push("Name is required");
    if (!formData.type) errs.push("Type is required");
    if (!formData.startAt) errs.push("Start date is required");
    if (!formData.endAt) errs.push("End date is required");
    if (new Date(formData.endAt!) <= new Date(formData.startAt!)) {
      errs.push("End date must be after start date");
    }
    if (!formData.mechanic) errs.push("Mechanic is required");
    if (formData.mechanic?.type === "ladder" && !formData.mechanic.ladder?.levels?.length) {
      errs.push("Ladder must have at least one level");
    }
    if (
      formData.mechanic?.type === "collection" &&
      !formData.mechanic.collection?.targetCount &&
      !formData.mechanic.collection?.targetSet?.length
    ) {
      errs.push("Collection must have targetCount or targetSet");
    }
    return errs;
  };

  const handleSave = async () => {
    setErrors([]);
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const promo: PromotionConfig = {
        id: formData.id!,
        name: formData.name!,
        type: formData.type!,
        enabled: formData.enabled ?? true,
        startAt: formData.startAt!,
        endAt: formData.endAt!,
        requiresOptIn: formData.requiresOptIn ?? false,
        triggers: formData.triggers || {},
        mechanic: formData.mechanic!,
        includeGames: formData.includeGames,
        excludeGames: formData.excludeGames,
        includeProviders: formData.includeProviders,
        excludeProviders: formData.excludeProviders,
        includeVerticals: formData.includeVerticals,
        excludeVerticals: formData.excludeVerticals,
        highRange: formData.highRange,
        cooldownMinutes: formData.cooldownMinutes,
        maxRewardsPerDay: formData.maxRewardsPerDay,
        maxRewardsTotal: formData.maxRewardsTotal,
        defaultReward: formData.defaultReward,
      };

      const url = selectedPromo
        ? `/api/admin/promotions/${promo.id}`
        : "/api/admin/promotions";
      const method = selectedPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promo),
      });

      if (res.ok) {
        setMessage("Promotion saved successfully!");
        await loadPromotions();
        setSelectedPromo(null);
      } else {
        const data = await res.json();
        setErrors([data.error || "Failed to save promotion"]);
      }
    } catch (error: any) {
      setErrors([error.message || "Error saving promotion"]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all demo data? This will clear all player states.")) return;
    try {
      await fetch("/api/admin/reset", { method: "POST" });
      setMessage("Demo data reset successfully!");
      await loadPromotions();
    } catch (error) {
      console.error("Error resetting:", error);
    }
  };

  const handleInspectPlayer = async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/player/${playerId}`);
      const data = await res.json();
      setInspectedPlayer({
        playerState: data.playerState,
        logs: data.recentLogs || [],
      });
    } catch (error) {
      console.error("Error inspecting player:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">⚙️ Admin Panel</h1>
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Reset Demo Data
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

        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-600 rounded">
            <ul>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Promotions List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Promotions</h2>
                <button
                  onClick={handleNew}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className={`p-3 rounded border ${
                      selectedPromo?.id === promo.id
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-slate-700 bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{promo.name}</div>
                      <button
                        onClick={() => handleToggleEnabled(promo)}
                        className={`px-2 py-1 rounded text-xs ${
                          promo.enabled
                            ? "bg-green-600"
                            : "bg-gray-600"
                        }`}
                      >
                        {promo.enabled ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{promo.type}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">
                {selectedPromo ? "Edit Promotion" : "New Promotion"}
              </h2>

              <div className="space-y-4 max-h-[700px] overflow-y-auto">
                <div>
                  <label className="block mb-2">ID</label>
                  <input
                    type="text"
                    value={formData.id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    disabled={!!selectedPromo}
                  />
                </div>

                <div>
                  <label className="block mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block mb-2">Type</label>
                  <select
                    value={formData.type || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as PromotionType,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                  >
                    <option value="game_provider_discovery">
                      Game/Provider Discovery
                    </option>
                    <option value="multi_game_chain">Multi-Game Chain</option>
                    <option value="opt_in_outcome_challenge">
                      Opt-In Outcome Challenge
                    </option>
                    <option value="high_range_outcome">
                      High-Range Outcome
                    </option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled ?? true}
                      onChange={(e) =>
                        setFormData({ ...formData, enabled: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                    Enabled
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresOptIn ?? false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresOptIn: e.target.checked,
                        })
                      }
                      className="w-5 h-5"
                    />
                    Requires Opt-In
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">Start Date</label>
                    <input
                      type="datetime-local"
                      value={
                        formData.startAt
                          ? new Date(formData.startAt)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startAt: new Date(e.target.value).toISOString(),
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      value={
                        formData.endAt
                          ? new Date(formData.endAt).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          endAt: new Date(e.target.value).toISOString(),
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                </div>

                {/* Mechanic Type */}
                <div>
                  <label className="block mb-2">Mechanic Type</label>
                  <select
                    value={formData.mechanic?.type || "ladder"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mechanic: {
                          type: e.target.value as MechanicType,
                          ladder: e.target.value === "ladder" ? formData.mechanic?.ladder : undefined,
                          collection:
                            e.target.value === "collection"
                              ? formData.mechanic?.collection
                              : undefined,
                        },
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                  >
                    <option value="ladder">Ladder</option>
                    <option value="collection">Collection</option>
                  </select>
                </div>

                {/* High-Range Config */}
                {formData.type === "high_range_outcome" && (
                  <div className="p-4 bg-slate-700 rounded">
                    <h3 className="font-semibold mb-2">High-Range Config</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2">Min</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.highRange?.min || 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              highRange: {
                                ...formData.highRange,
                                min: parseFloat(e.target.value) || 0,
                                max: formData.highRange?.max || 100,
                              },
                            })
                          }
                          className="w-full px-4 py-2 bg-slate-600 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block mb-2">Max</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.highRange?.max || 100}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              highRange: {
                                ...formData.highRange,
                                min: formData.highRange?.min || 0,
                                max: parseFloat(e.target.value) || 100,
                              },
                            })
                          }
                          className="w-full px-4 py-2 bg-slate-600 rounded text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Caps */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-2">Cooldown (minutes)</label>
                    <input
                      type="number"
                      value={formData.cooldownMinutes || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cooldownMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">Max Rewards/Day</label>
                    <input
                      type="number"
                      value={formData.maxRewardsPerDay || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxRewardsPerDay: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">Max Rewards Total</label>
                    <input
                      type="number"
                      value={formData.maxRewardsTotal || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxRewardsTotal: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                    />
                  </div>
                </div>

                {/* JSON Preview */}
                <div>
                  <label className="block mb-2">JSON Preview</label>
                  <pre className="p-4 bg-slate-700 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Promotion"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Player Inspector */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🔍 Player Inspector</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Enter Player ID"
              className="px-4 py-2 bg-slate-700 rounded text-white flex-1"
            />
            <button
              onClick={handleInspectPlayer}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Inspect
            </button>
          </div>

          {inspectedPlayer && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Player State</h3>
                <pre className="p-4 bg-slate-700 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(inspectedPlayer.playerState, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Recent Logs</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {inspectedPlayer.logs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-700 rounded text-sm">
                      <div className="text-gray-400 mb-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div>Event: {log.event.gameId} - {log.event.winMultiplier}x</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Evaluations: {log.evaluations.length}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

