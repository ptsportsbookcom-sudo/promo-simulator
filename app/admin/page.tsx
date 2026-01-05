"use client";

import { useState, useEffect } from "react";
import type {
  PromotionConfig,
  TriggerKind,
  TriggerSubject,
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
    trigger: {
      kind: "first_win",
      subject: "provider",
    },
    mechanic: { type: "collection" },
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
      enabled: true,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      requiresOptIn: false,
      trigger: {
        kind: "first_win",
        subject: "provider",
      },
      mechanic: { type: "collection" },
    });
  };

  // Get valid mechanic types for current trigger
  const getValidMechanics = (triggerKind: TriggerKind): MechanicType[] => {
    if (triggerKind === "first_win") {
      return ["collection"]; // first_win → collection only
    } else if (triggerKind === "distinct_items") {
      return ["ladder", "collection"]; // distinct_items → ladder OR collection
    } else if (triggerKind === "win_multiplier_range") {
      return ["ladder"]; // win_multiplier_range → ladder only
    }
    return ["ladder", "collection"];
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    if (!formData.id) errs.push("ID is required");
    if (!formData.name) errs.push("Name is required");
    if (!formData.trigger) errs.push("Trigger is required");
    if (!formData.trigger?.kind) errs.push("Trigger kind is required");
    if (!formData.startAt) errs.push("Start date is required");
    if (!formData.endAt) errs.push("End date is required");
    if (new Date(formData.endAt!) <= new Date(formData.startAt!)) {
      errs.push("End date must be after start date");
    }
    if (!formData.mechanic) errs.push("Mechanic is required");
    
    // Validate trigger/mechanic combination
    if (formData.trigger && formData.mechanic) {
      const validMechanics = getValidMechanics(formData.trigger.kind);
      if (!validMechanics.includes(formData.mechanic.type)) {
        errs.push(
          `Invalid mechanic "${formData.mechanic.type}" for trigger "${formData.trigger.kind}". Valid: ${validMechanics.join(", ")}`
        );
      }
    }

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
        enabled: formData.enabled ?? true,
        startAt: formData.startAt!,
        endAt: formData.endAt!,
        requiresOptIn: formData.requiresOptIn ?? false,
        trigger: formData.trigger!,
        scope: formData.scope,
        mechanic: formData.mechanic!,
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

  const validMechanics = formData.trigger
    ? getValidMechanics(formData.trigger.kind)
    : ["ladder", "collection"];

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
                          promo.enabled ? "bg-green-600" : "bg-gray-600"
                        }`}
                      >
                        {promo.enabled ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {promo.trigger.kind} / {promo.mechanic.type}
                    </div>
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

              <div className="space-y-6 max-h-[700px] overflow-y-auto">
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

                {/* Trigger */}
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Trigger</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2">Trigger Kind</label>
                      <select
                        value={formData.trigger?.kind || "first_win"}
                        onChange={(e) => {
                          const kind = e.target.value as TriggerKind;
                          const newTrigger = {
                            kind,
                            subject:
                              kind === "win_multiplier_range"
                                ? null
                                : (formData.trigger?.subject || "provider"),
                            minMultiplier:
                              kind === "win_multiplier_range"
                                ? formData.trigger?.minMultiplier || 0
                                : undefined,
                            maxMultiplier:
                              kind === "win_multiplier_range"
                                ? formData.trigger?.maxMultiplier || 100
                                : undefined,
                            instantReward: formData.trigger?.instantReward,
                            alsoProgress: formData.trigger?.alsoProgress,
                          };
                          setFormData({
                            ...formData,
                            trigger: newTrigger,
                            // Auto-adjust mechanic if invalid
                            mechanic:
                              !getValidMechanics(kind).includes(
                                formData.mechanic?.type || "ladder"
                              )
                                ? { type: getValidMechanics(kind)[0] as MechanicType }
                                : formData.mechanic,
                          });
                        }}
                        className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                      >
                        <option value="first_win">First Win</option>
                        <option value="distinct_items">Distinct Items</option>
                        <option value="win_multiplier_range">
                          Win Multiplier Range
                        </option>
                      </select>
                    </div>

                    {formData.trigger?.kind !== "win_multiplier_range" && (
                      <div>
                        <label className="block mb-2">Subject</label>
                        <select
                          value={formData.trigger?.subject || "provider"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              trigger: {
                                ...formData.trigger!,
                                subject: e.target.value as TriggerSubject,
                              },
                            })
                          }
                          className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                        >
                          <option value="game">Game</option>
                          <option value="provider">Provider</option>
                          <option value="vertical">Vertical</option>
                        </select>
                      </div>
                    )}

                    {formData.trigger?.kind === "win_multiplier_range" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2">Min Multiplier</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger?.minMultiplier || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  minMultiplier: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-2">Max Multiplier</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.trigger?.maxMultiplier || 100}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                trigger: {
                                  ...formData.trigger!,
                                  maxMultiplier: parseFloat(e.target.value) || 100,
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope */}
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
                        placeholder="game-1, game-2, game-3"
                      />
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

                {/* Mechanic */}
                <div className="p-4 bg-slate-700/50 rounded">
                  <h3 className="font-semibold mb-3">Mechanic</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2">Mechanic Type</label>
                      <select
                        value={formData.mechanic?.type || "ladder"}
                        onChange={(e) => {
                          const type = e.target.value as MechanicType;
                          setFormData({
                            ...formData,
                            mechanic: {
                              type,
                              ladder: type === "ladder" ? formData.mechanic?.ladder : undefined,
                              collection:
                                type === "collection"
                                  ? formData.mechanic?.collection
                                  : undefined,
                            },
                          });
                        }}
                        className={`w-full px-4 py-2 bg-slate-700 rounded text-white ${
                          !validMechanics.includes(formData.mechanic?.type || "ladder")
                            ? "border-2 border-red-500"
                            : ""
                        }`}
                        disabled={
                          !validMechanics.includes(formData.mechanic?.type || "ladder")
                        }
                      >
                        <option value="ladder" disabled={!validMechanics.includes("ladder")}>
                          Ladder {!validMechanics.includes("ladder") && "(Invalid)"}
                        </option>
                        <option
                          value="collection"
                          disabled={!validMechanics.includes("collection")}
                        >
                          Collection{" "}
                          {!validMechanics.includes("collection") && "(Invalid)"}
                        </option>
                      </select>
                      {!validMechanics.includes(formData.mechanic?.type || "ladder") && (
                        <div className="text-red-400 text-sm mt-1">
                          Invalid mechanic for trigger "{formData.trigger?.kind}". Valid:{" "}
                          {validMechanics.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Ladder config would go here - simplified for now */}
                    {formData.mechanic?.type === "ladder" && (
                      <div className="text-sm text-gray-400">
                        Ladder configuration: Add levels in JSON editor
                      </div>
                    )}

                    {/* Collection config */}
                    {formData.mechanic?.type === "collection" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block mb-2">Collect By</label>
                          <select
                            value={formData.mechanic.collection?.collectBy || "gameId"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mechanic: {
                                  ...formData.mechanic!,
                                  collection: {
                                    ...formData.mechanic?.collection,
                                    collectBy: e.target.value as
                                      | "gameId"
                                      | "providerId"
                                      | "vertical",
                                  },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                          >
                            <option value="gameId">Game ID</option>
                            <option value="providerId">Provider ID</option>
                            <option value="vertical">Vertical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-2">Target Count</label>
                          <input
                            type="number"
                            value={formData.mechanic.collection?.targetCount || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mechanic: {
                                  ...formData.mechanic!,
                                    collection: {
                                      ...formData.mechanic?.collection,
                                      collectBy: formData.mechanic?.collection?.collectBy || "gameId",
                                      targetCount: parseInt(e.target.value) || undefined,
                                    },
                                },
                              })
                            }
                            className="w-full px-4 py-2 bg-slate-700 rounded text-white"
                            placeholder="e.g., 3"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Limits */}
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

                {/* JSON Preview */}
                <div>
                  <label className="block mb-2">JSON Preview</label>
                  <pre className="p-4 bg-slate-700 rounded text-xs overflow-auto max-h-60">
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
                      <div>
                        Event: {log.event.gameId} - {log.event.winMultiplier}x
                      </div>
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
