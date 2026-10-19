import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, Sprout, CalendarDays, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import api from "../../api/client";

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function getCropName(item) {
  return (
    item.result?.prediction?.crop ||
    item.result?.crop ||
    item.result?.recommended_crop ||
    item.result?.recommendation ||
    item.recommendation_type ||
    "Recommendation"
  );
}

function getConfidence(item) {
  const value =
    item.result?.prediction?.confidence_percent ??
    (typeof item.result?.prediction?.confidence === "number"
      ? item.result.prediction.confidence * 100
      : null);

  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}% confidence`
    : null;
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function RecommendationHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState("all");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/recommendation-history/");
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Could not load recommendation history. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((item) => (item.recommendation_type || "crop") === filter);

  const types = [...new Set(items.map((item) => item.recommendation_type || "crop"))];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72856d]">
            Your activity
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-[#193d2b]">
            <History size={30} />
            Recommendation History
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687969]">
            Review previous recommendations and the inputs and results saved for each one.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#dce7d6] bg-white px-4 py-3 text-sm font-bold text-[#31583d] transition hover:bg-[#f0f6eb] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <p className="text-sm font-semibold text-[#687969]">Saved records</p>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <p className="text-sm font-semibold text-[#687969]">Crop recommendations</p>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">
            {items.filter((item) => (item.recommendation_type || "crop") === "crop").length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <p className="text-sm font-semibold text-[#687969]">Linked to a farm</p>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">
            {items.filter((item) => item.farm_id != null).length}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-[#45604c]">Filter:</span>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === "all" ? "bg-[#214e35] text-white" : "border border-[#dce7d6] bg-white text-[#45604c] hover:bg-[#f5f8f1]"}`}
        >
          All
        </button>
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${filter === type ? "bg-[#214e35] text-white" : "border border-[#dce7d6] bg-white text-[#45604c] hover:bg-[#f5f8f1]"}`}
          >
            {type.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-12 text-center text-sm text-[#71816f]">
          Loading your history...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbdcc4] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf5e8] text-[#31583d]">
            <History size={30} />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-[#193d2b]">
            {items.length === 0 ? "No recommendations saved yet" : "No records in this filter"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71816f]">
            {items.length === 0
              ? "When recommendations are saved to your account, they will appear here with their inputs and results."
              : "Choose another filter to see more of your saved records."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isOpen = Boolean(expanded[item.id]);
            const inputs = item.inputs || {};
            const result = item.result || {};
            const cropName = getCropName(item);
            const confidence = getConfidence(item);

            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-[#e0e9d9] bg-white shadow-sm">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf5e8] text-[#31583d]">
                        <Sprout size={23} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-extrabold capitalize text-[#193d2b]">
                          {String(cropName).replaceAll("_", " ")}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#71816f]">
                          <CalendarDays size={14} />
                          {formatDate(item.created_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#f1f6ed] px-3 py-1 text-xs font-semibold capitalize text-[#45604c]">
                            {(item.recommendation_type || "crop").replaceAll("_", " ")}
                          </span>
                          {item.farm_id != null && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                              Farm ID: {item.farm_id}
                            </span>
                          )}
                          {confidence && (
                            <span className="rounded-full bg-[#edf5e8] px-3 py-1 text-xs font-semibold text-[#31583d]">
                              {confidence}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpanded((previous) => ({ ...previous, [item.id]: !previous[item.id] }))}
                      aria-expanded={isOpen}
                      className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#dce7d6] px-3 py-2 text-sm font-bold text-[#365541] hover:bg-[#f5f8f1]"
                    >
                      {isOpen ? "Hide details" : "View details"}
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-6 grid gap-5 border-t border-[#edf1e9] pt-5 md:grid-cols-2">
                      <div>
                        <h3 className="mb-3 font-bold text-[#193d2b]">Inputs</h3>
                        {Object.keys(inputs).length === 0 ? (
                          <p className="text-sm text-[#71816f]">No input details were saved.</p>
                        ) : (
                          <dl className="space-y-2">
                            {Object.entries(inputs).map(([key, value]) => (
                              <div key={key} className="flex items-start justify-between gap-4 rounded-lg bg-[#f7f9f4] px-3 py-2">
                                <dt className="text-sm capitalize text-[#687969]">{key.replaceAll("_", " ")}</dt>
                                <dd className="break-all text-right text-sm font-semibold text-[#193d2b]">{displayValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                      <div>
                        <h3 className="mb-3 font-bold text-[#193d2b]">Result</h3>
                        {Object.keys(result).length === 0 ? (
                          <p className="text-sm text-[#71816f]">No result details were saved.</p>
                        ) : (
                          <dl className="space-y-2">
                            {Object.entries(result).map(([key, value]) => (
                              <div key={key} className="rounded-lg bg-[#f7f9f4] px-3 py-2">
                                <dt className="mb-1 text-xs font-semibold capitalize text-[#687969]">{key.replaceAll("_", " ")}</dt>
                                <dd className="break-words text-sm text-[#193d2b]">
                                  {typeof value === "object" && value !== null ? (
                                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(value, null, 2)}</pre>
                                  ) : displayValue(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
