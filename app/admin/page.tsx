"use client";

import { useState, useEffect } from "react";
import type {
  PromotionConfig,
  TriggerFamily,
  DiscoveryTarget,
  DistinctDimension,
  MechanicType,
  PlayerState,
  LogEntry,
} from "@/lib/models/types";
import { GAMES } from "@/lib/data/games";

export default function AdminPage() {
  const [promotions, setPromotions] = useState<PromotionConfig[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<PromotionConfig | null>(null);
  const [editingPromo, setEditingPromo] = useState<PromotionConfig | null>(null);
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
  });

  useEffect(() => {
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
      if (editingPromo?.id === id) {
        setEditingPromo(null);
        setFormData({ enabled: true, requiresOptIn: false });
      }
    } catch (error) {
      console.error("Error deleting promotion:", error);
    }
  };

  const handleEdit = (promo: PromotionConfig) => {
    setEditingPromo(promo);
    setFormData(promo);
  };

  const handleNew = () => {
    setEditingPromo(null);
    setFormData({
      id: "",
      name: "",
      enabled: true,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      requiresOptIn: false,
    });
  };

  const handleCancel = () => {
    setEditingPromo(null);
    setFormData({ enabled: true, requiresOptIn: false });
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    if (!formData.id) errs.push("ID is required");
    if (!formData.name) errs.push("Name is required");
    if (!formData.trigger) errs.push("Trigger family is required");
    if (!formData.trigger?.family) errs.push("Please select a trigger type");
    if (!formData.startAt) errs.push("Start date is required");
    if (!formData.endAt) errs.push("End date is required");
    if (new Date(formData.endAt!) <= new Date(formData.startAt!)) {
      errs.push("End date must be after start date");
    }
    if (!formData.mechanic) errs.push("Mechanic is required");

    // Trigger-specific validation
    if (formData.trigger?.family === "discovery") {
      if (!formData.trigger.discoveryTarget) {
        errs.push("Discovery target is required");
      }
    } else if (formData.trigger?.family === "multi_game_chain") {
      if (!formData.trigger.distinctDimension) {
        errs.push("Distinct dimension is required");
      }
      if (!formData.trigger.requiredDistinctCount || formData.trigger.requiredDistinctCount < 1) {
        errs.push("Required distinct count must be at least 1");
      }
    } else if (formData.trigger?.family === "high_range_outcome") {
      if (formData.trigger.minMultiplier === undefined || formData.trigger.minMultiplier < 0) {
        errs.push("Min multiplier is required and must be >= 0");
      }
      if (formData.trigger.maxMultiplier === undefined || formData.trigger.maxMultiplier <= formData.trigger.minMultiplier!) {
        errs.push("Max multiplier is required and must be > min multiplier");
      }
    }

    // Mechanic validation
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
    if (formData.mechanic?.type === "collection" && !formData.mechanic.collection?.collectBy) {
      errs.push("Collection collectBy is required");
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
      // Clean up trigger - remove fields not relevant to selected family
      const trigger = { ...formData.trigger! };
      if (trigger.family === "discovery") {
        delete (trigger as any).distinctDimension;
        delete (trigger as any).requiredDistinctCount;
        delete (trigger as any).minMultiplier;
        delete (trigger as any).maxMultiplier;
      } else if (trigger.family === "multi_game_chain") {
        delete (trigger as any).discoveryTarget;
        delete (trigger as any).minMultiplier;
        delete (trigger as any).maxMultiplier;
      } else if (trigger.family === "high_range_outcome") {
        delete (trigger as any).discoveryTarget;
        delete (trigger as any).distinctDimension;
        delete (trigger as any).requiredDistinctCount;
      }

      const promo: PromotionConfig = {
        id: formData.id!,
        name: formData.name!,
        enabled: formData.enabled ?? true,
        startAt: formData.startAt!,
        endAt: formData.endAt!,
        requiresOptIn: formData.requiresOptIn ?? false,
        trigger: trigger,
        scope: formData.scope,
        mechanic: formData.mechanic!,
        cooldownMinutes: formData.cooldownMinutes,
        maxRewardsPerDay: formData.maxRewardsPerDay,
        maxRewardsTotal: formData.maxRewardsTotal,
        defaultReward: formData.defaultReward,
      };

      const url = editingPromo
        ? `/api/admin/promotions/${promo.id}`
        : "/api/admin/promotions";
      const method = editingPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promo),
      });

      if (res.ok) {
        setMessage("Promotion saved successfully!");
        await loadPromotions();
        handleCancel();
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

  // Get unique providers and games for scope selection
  const uniqueProviders = Array.from(new Set(GAMES.map((g) => g.providerId))).map((id) => ({
    id,
    name: GAMES.find((g) => g.providerId === id)?.providerName || id,
  }));

  const uniqueGames = GAMES.map((g) => ({ id: g.id, name: g.name }));

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

        {!editingPromo ? (
          /* PROMOTIONS LIST VIEW */
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Promotions</h2>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                + Create Promotion
              </button>
            </div>
            <div className="space-y-2">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="p-4 rounded border border-slate-700 bg-slate-700/50 hover:bg-slate-700/70 cursor-pointer"
                  onClick={() => handleEdit(promo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{promo.name}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Trigger: {promo.trigger.family} | Mechanic: {promo.mechanic.type} |{" "}
                        {promo.enabled ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEnabled(promo);
                        }}
                        className={`px-3 py-1 rounded text-xs ${
                          promo.enabled ? "bg-green-600" : "bg-gray-600"
                        }`}
                      >
                        {promo.enabled ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(promo.id);
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {promotions.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No promotions yet. Click "+ Create Promotion" to get started.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PROMOTION EDITOR */
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                {editingPromo ? "Edit Promotion" : "Create Promotion"}
              </h2>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-6 max-h-[800px] overflow-y-auto">
              {/* Promotion Basics */}
              <div className="p-4 bg-slate-700/50 rounded">
                <h3 className="font-semibold mb-3">Promotion Basics</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">ID</label>
                    <input
                      type="text"
                      value={formData.id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, id: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                      disabled={!!editingPromo}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        value={
                          formData.startAt
                            ? new Date(formData.startAt).toISOString().slice(0, 16)
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
                </div>
              </div>

              {/* STEP 1: TRIGGER SELECTION */}
              <div className="p-4 bg-slate-700/50 rounded">
                <h3 className="font-semibold mb-3">Step 1: Trigger Type (Required)</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-slate-600 rounded hover:bg-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="triggerFamily"
                      value="discovery"
                      checked={formData.trigger?.family === "discovery"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: {
                            family: "discovery",
                            discoveryTarget: "first_win_on_provider",
                          },
                          mechanic: { type: "collection" },
                        })
                      }
                      className="w-5 h-5"
                    />
                    <span>Discovery</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-slate-600 rounded hover:bg-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="triggerFamily"
                      value="multi_game_chain"
                      checked={formData.trigger?.family === "multi_game_chain"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: {
                            family: "multi_game_chain",
                            distinctDimension: "game",
                            requiredDistinctCount: 3,
                          },
                          mechanic: { type: "collection" },
                        })
                      }
                      className="w-5 h-5"
                    />
                    <span>Multi-Game Chain</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-slate-600 rounded hover:bg-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="triggerFamily"
                      value="high_range_outcome"
                      checked={formData.trigger?.family === "high_range_outcome"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: {
                            family: "high_range_outcome",
                            minMultiplier: 15,
                            maxMultiplier: 20,
                          },
                          mechanic: { type: "ladder" },
                        })
                      }
                      className="w-5 h-5"
                    />
                    <span>High-Range Outcome</span>
                  </label>
                </div>
              </div>

              {/* STEP 2: CONDITIONAL PARAMETERS */}
              {formData.trigger?.family && (
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Step 2: Trigger Parameters</h3>

                  {/* DISCOVERY */}
                  {formData.trigger.family === "discovery" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2">Discovery Target</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="discoveryTarget"
                              value="first_win_on_game"
                              checked={
                                formData.trigger.discoveryTarget === "first_win_on_game"
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  trigger: {
                                    family: "discovery",
                                    discoveryTarget: e.target.value as DiscoveryTarget,
                                    outcomeFilter: formData.trigger?.outcomeFilter,
                                  },
                                  mechanic: {
                                    type: "collection",
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: "gameId",
                                    },
                                  },
                                })
                              }
                              className="w-5 h-5"
                            />
                            First win on game
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="discoveryTarget"
                              value="first_win_on_provider"
                              checked={
                                formData.trigger.discoveryTarget === "first_win_on_provider"
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  trigger: {
                                    ...formData.trigger!,
                                    family: "discovery",
                                    discoveryTarget: e.target.value as DiscoveryTarget,
                                  },
                                  mechanic: {
                                    type: "collection",
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: "providerId",
                                    },
                                  },
                                })
                              }
                              className="w-5 h-5"
                            />
                            First win on provider
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2">Min Win Multiplier (optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger.outcomeFilter?.minMultiplier || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  family: formData.trigger!.family,
                                  outcomeFilter: {
                                    ...formData.trigger?.outcomeFilter,
                                    minMultiplier: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                    maxMultiplier: formData.trigger?.outcomeFilter?.maxMultiplier,
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block mb-2">Max Win Multiplier (optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger.outcomeFilter?.maxMultiplier || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  outcomeFilter: {
                                    ...formData.trigger?.outcomeFilter,
                                    minMultiplier: formData.trigger?.outcomeFilter?.minMultiplier,
                                    maxMultiplier: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MULTI-GAME CHAIN */}
                  {formData.trigger.family === "multi_game_chain" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2">Distinct Dimension</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="distinctDimension"
                              value="game"
                              checked={formData.trigger.distinctDimension === "game"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  trigger: {
                                    ...formData.trigger!,
                                    family: "multi_game_chain",
                                    distinctDimension: e.target.value as DistinctDimension,
                                  },
                                  mechanic: {
                                    type: formData.mechanic?.type || "collection",
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: "gameId",
                                    },
                                  },
                                })
                              }
                              className="w-5 h-5"
                            />
                            Games
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="distinctDimension"
                              value="provider"
                              checked={formData.trigger.distinctDimension === "provider"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  trigger: {
                                    ...formData.trigger!,
                                    family: "multi_game_chain",
                                    distinctDimension: e.target.value as DistinctDimension,
                                  },
                                  mechanic: {
                                    type: formData.mechanic?.type || "collection",
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: "providerId",
                                    },
                                  },
                                })
                              }
                              className="w-5 h-5"
                            />
                            Providers
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="distinctDimension"
                              value="vertical"
                              checked={formData.trigger.distinctDimension === "vertical"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  trigger: {
                                    ...formData.trigger!,
                                    family: "multi_game_chain",
                                    distinctDimension: e.target.value as DistinctDimension,
                                  },
                                  mechanic: {
                                    type: formData.mechanic?.type || "collection",
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: "vertical",
                                    },
                                  },
                                })
                              }
                              className="w-5 h-5"
                            />
                            Verticals
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block mb-2">Required Distinct Count</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.trigger.requiredDistinctCount || 3}
                          onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  family: "multi_game_chain",
                                  requiredDistinctCount: parseInt(e.target.value) || 1,
                                },
                              mechanic: {
                                type: formData.mechanic?.type || "collection",
                                collection: {
                                  ...formData.mechanic?.collection,
                                  collectBy: formData.mechanic?.collection?.collectBy || "gameId",
                                  targetCount: parseInt(e.target.value) || 1,
                                },
                              },
                            })
                          }
                          className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2">Min Win Multiplier (optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger.outcomeFilter?.minMultiplier || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  family: formData.trigger!.family,
                                  outcomeFilter: {
                                    ...formData.trigger?.outcomeFilter,
                                    minMultiplier: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                    maxMultiplier: formData.trigger?.outcomeFilter?.maxMultiplier,
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block mb-2">Max Win Multiplier (optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger.outcomeFilter?.maxMultiplier || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  outcomeFilter: {
                                    ...formData.trigger?.outcomeFilter,
                                    minMultiplier: formData.trigger?.outcomeFilter?.minMultiplier,
                                    maxMultiplier: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HIGH-RANGE OUTCOME */}
                  {formData.trigger.family === "high_range_outcome" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2">Min Win Multiplier (required)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.trigger.minMultiplier || 15}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  family: "high_range_outcome",
                                  minMultiplier: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-2">Max Win Multiplier (required)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger.maxMultiplier || 20}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  family: "high_range_outcome",
                                  maxMultiplier: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCOPE */}
              {formData.trigger?.family && (
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Scope / Filters</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2">Games (comma-separated IDs)</label>
                      <input
                        type="text"
                        value={formData.scope?.games?.join(", ") || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scope: {
                              ...formData.scope,
                              games: e.target.value
                                ? e.target.value.split(",").map((s) => s.trim())
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                        placeholder="game-1, game-2"
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Available: {uniqueGames.map((g) => g.id).join(", ")}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2">Providers (comma-separated IDs)</label>
                      <input
                        type="text"
                        value={formData.scope?.providers?.join(", ") || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scope: {
                              ...formData.scope,
                              providers: e.target.value
                                ? e.target.value.split(",").map((s) => s.trim())
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                        placeholder="provider-1, provider-2"
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Available: {uniqueProviders.map((p) => p.id).join(", ")}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2">Verticals</label>
                      <div className="flex gap-4">
                        {(["slots", "live", "crash", "table"] as const).map((v) => (
                          <label key={v} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.scope?.verticals?.includes(v) || false}
                              onChange={(e) => {
                                const current = formData.scope?.verticals || [];
                                const newVerticals = e.target.checked
                                  ? [...current, v]
                                  : current.filter((x) => x !== v);
                                setFormData({
                                  ...formData,
                                  scope: {
                                    ...formData.scope,
                                    verticals:
                                      newVerticals.length > 0 ? newVerticals : undefined,
                                  },
                                });
                              }}
                              className="w-5 h-5"
                            />
                            {v}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MECHANIC */}
              {formData.trigger?.family && (
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Mechanic</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2">Mechanic Type</label>
                      <select
                        value={formData.mechanic?.type || "collection"}
                        onChange={(e) => {
                          const type = e.target.value as MechanicType;
                          setFormData({
                            ...formData,
                            mechanic: {
                              type,
                              ladder: type === "ladder" ? formData.mechanic?.ladder : undefined,
                              collection:
                                type === "collection"
                                  ? formData.mechanic?.collection || {
                                      collectBy:
                                        formData.trigger?.discoveryTarget === "first_win_on_game"
                                          ? "gameId"
                                          : formData.trigger?.distinctDimension === "game"
                                          ? "gameId"
                                          : formData.trigger?.distinctDimension === "provider"
                                          ? "providerId"
                                          : "vertical",
                                    }
                                  : undefined,
                            },
                          });
                        }}
                        className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                      >
                        {formData.trigger.family === "discovery" && (
                          <option value="collection">Collection (default)</option>
                        )}
                        {formData.trigger.family === "multi_game_chain" && (
                          <>
                            <option value="collection">Collection (default)</option>
                            <option value="ladder">Ladder (optional)</option>
                          </>
                        )}
                        {formData.trigger.family === "high_range_outcome" && (
                          <>
                            <option value="ladder">Ladder (default)</option>
                            <option value="collection">Collection (optional)</option>
                          </>
                        )}
                      </select>
                    </div>

                    {formData.mechanic?.type === "collection" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block mb-2">Target Count</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.mechanic.collection?.targetCount || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mechanic: {
                                  ...formData.mechanic!,
                                  collection: {
                                    ...formData.mechanic?.collection,
                                    collectBy:
                                      formData.mechanic?.collection?.collectBy ||
                                      (formData.trigger?.discoveryTarget === "first_win_on_game"
                                        ? "gameId"
                                        : formData.trigger?.discoveryTarget === "first_win_on_provider"
                                        ? "providerId"
                                        : formData.trigger?.distinctDimension === "game"
                                        ? "gameId"
                                        : formData.trigger?.distinctDimension === "provider"
                                        ? "providerId"
                                        : "vertical"),
                                    targetCount: parseInt(e.target.value) || undefined,
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          />
                        </div>
                      </div>
                    )}

                    {formData.mechanic?.type === "ladder" && (
                      <div className="text-sm text-gray-400">
                        Ladder levels: Configure in JSON editor or add UI for levels later
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OPT-IN */}
              {formData.trigger?.family && (
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Opt-In (Gate Only)</h3>
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
                    Requires player opt-in (Join button)
                  </label>
                  <div className="text-xs text-gray-400 mt-2">
                    If checked, promotion will only evaluate after player joins
                  </div>
                </div>
              )}

              {/* LIMITS */}
              {formData.trigger?.family && (
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Limits</h3>
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
                </div>
              )}

              {/* JSON Preview */}
              {formData.trigger?.family && (
                <div>
                  <label className="block mb-2">JSON Preview</label>
                  <pre className="p-4 bg-slate-700 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Save Button */}
              {formData.trigger?.family && (
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.trigger?.family}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Promotion"}
                </button>
              )}
            </div>
          </div>
        )}

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
