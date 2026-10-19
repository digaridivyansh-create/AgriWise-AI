import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import api from "../api/client";

const MARKET_DATA_END_DATE = "2023-12-31";

const initialFilters = {
  commodity_id: "",
  state_id: "",
  district_id: "",
  market_id: "",
  from_date: "2023-09-01",
  to_date: MARKET_DATA_END_DATE,
};

const initialCosts = {
  yield: "",
  sellingPrice: "",
  seedCost: "",
  fertilizerCost: "",
  pesticideCost: "",
  labourCost: "",
  irrigationCost: "",
  transportCost: "",
  otherCost: "",
};

const currency = (value) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(Number(value))
    : "—";

const displayDate = (value) => {
  if (!value) return "Not available";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const fieldClass =
  "mt-1 w-full rounded-xl border border-[#dce7d6] bg-white px-3 py-2.5 text-sm text-[#193d2b] outline-none transition focus:border-[#52875b] focus:ring-2 focus:ring-[#dcebd5]";

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#71816f]">{label}</p>
        <span className="rounded-xl bg-[#edf5e8] p-2 text-[#356c3e]">
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-[#193d2b]">
        {value}
      </p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#71816f]">{detail}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, min = "0", step = "any" }) {
  return (
    <label className="block text-sm font-medium text-[#50634f]">
      {label}
      <input
        className={fieldClass}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter value"
      />
    </label>
  );
}

export default function MarketInsights() {
  const [filters, setFilters] = useState(initialFilters);
  const [metadata, setMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState("");
  const [metadataReload, setMetadataReload] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [costs, setCosts] = useState(initialCosts);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        const response = await api.get("/market-metadata/");
        const data = response.data;

        if (
          data?.status !== "success" ||
          !Array.isArray(data.commodities) ||
          !Array.isArray(data.states) ||
          !Array.isArray(data.geographies)
        ) {
          throw new Error("The provider returned an unexpected metadata response.");
        }

        if (!cancelled) {
          setMetadata(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setMetadataError(
            requestError?.response?.data?.error ||
            requestError?.response?.data?.detail ||
            requestError?.message ||
            "Could not load commodity and location options."
          );
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [metadataReload]);

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const updateCost = (key, value) =>
    setCosts((current) => ({ ...current, [key]: value }));

  const requestAnalytics = async (event) => {
    event.preventDefault();
    setError("");
    setAnalytics(null);
    setHasSearched(true);

    const required = [
      "commodity_id",
      "state_id",
      "district_id",
      "from_date",
      "to_date",
    ];
    const missing = required.filter((key) => !String(filters[key]).trim());

    if (missing.length) {
      setError("Select a commodity, state, district, and both dates.");
      return;
    }

    if (filters.from_date > filters.to_date) {
      setError("The start date must be on or before the end date.");
      return;
    }

    if (filters.from_date > MARKET_DATA_END_DATE || filters.to_date > MARKET_DATA_END_DATE) {
      setError("CEDA market data is documented as covering dates through December 31, 2023. Choose dates within that period.");
      return;
    }

    const start = new Date(`${filters.from_date}T00:00:00Z`);
    const end = new Date(`${filters.to_date}T00:00:00Z`);
    if ((end - start) / 86400000 > 366) {
      setError("Choose a date range of no more than 367 calendar days.");
      return;
    }

    const parseId = (value) => {
      if (!/^[1-9]\d*$/.test(String(value).trim())) {
        throw new Error("IDs must be positive whole numbers. Check each ID.");
      }
      return Number(value);
    };

    let payload;
    try {
      payload = {
        commodity_id: parseId(filters.commodity_id),
        state_id: parseId(filters.state_id),
        district_id: [parseId(filters.district_id)],
        market_id: filters.market_id.trim()
          ? [parseId(filters.market_id)]
          : [],
        from_date: filters.from_date,
        to_date: filters.to_date,
      };
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/market-analytics/", payload);
      setAnalytics(response.data);
      try {
        await api.post("/recommendation-history/", {
          recommendation_type: "market_insights",
          inputs: payload,
          result: response.data,
        });
      } catch (historyError) {
        console.warn("Market insights history could not be saved.", historyError);
      }
    } catch (requestError) {
      const data = requestError?.response?.data;
      const fieldErrors = data?.fields
        ? Object.entries(data.fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(" ")
        : "";
      setError(
        fieldErrors ||
          data?.message ||
          data?.error ||
          "Could not retrieve market analytics. Check the backend and your login session."
      );
    } finally {
      setLoading(false);
    }
  };

  const trend = analytics?.daily_trend ?? [];
  const comparisons = analytics?.market_comparison ?? [];
  const summary = analytics?.summary ?? {};
  const freshness = analytics?.freshness ?? {};
  const source = analytics?.source ?? {};

  const profit = useMemo(() => {
    const numeric = Object.fromEntries(
      Object.entries(costs).map(([key, value]) => [
        key,
        value.trim() === "" ? null : Number(value),
      ])
    );

    const requiredValues = [numeric.yield, numeric.sellingPrice];
    const allEntered = Object.values(numeric).some((value) => value !== null);
    const invalid = Object.values(numeric).some(
      (value) => value !== null && (!Number.isFinite(value) || value < 0)
    );

    if (
      !allEntered ||
      invalid ||
      requiredValues.some((value) => value === null)
    ) {
      return { ready: false, invalid };
    }

    const totalCostKeys = [
      "seedCost",
      "fertilizerCost",
      "pesticideCost",
      "labourCost",
      "irrigationCost",
      "transportCost",
      "otherCost",
    ];
    if (totalCostKeys.some((key) => numeric[key] === null)) {
      return { ready: false, invalid: false };
    }

    const revenue = numeric.yield * numeric.sellingPrice;
    const totalCosts = totalCostKeys.reduce(
      (sum, key) => sum + numeric[key],
      0
    );

    return {
      ready: true,
      invalid: false,
      revenue,
      totalCosts,
      net: revenue - totalCosts,
      margin: revenue > 0 ? ((revenue - totalCosts) / revenue) * 100 : null,
    };
  }, [costs]);

  const chartTrend = trend.map((point) => ({
    ...point,
    dateLabel: displayDate(point.date),
  }));

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-7xl space-y-6"
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64815e]">
            AgriWise AI · Data-backed decisions
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#193d2b] sm:text-4xl">
            Market Insights
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71816f]">
            Explore observed agricultural market prices, compare reported
            markets, and estimate your own crop economics.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-[#e0e9d9] bg-white px-3 py-2 text-xs font-semibold text-[#50634f] sm:self-auto">
          <Activity size={15} />
          Provider-backed data
        </div>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-bold">Important: check the observation date</p>
        <p className="mt-1">
          The configured CEDA source is documented as covering 2000–2023.
          Results may be historical or delayed and are not guaranteed live
          prices. Confirm the record dates and units before making a sale or
          planting decision.
        </p>
      </section>

      <section className="rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#193d2b]">Find market observations</h2>
          <p className="mt-1 text-sm text-[#71816f]">
            Choose from verified commodity and location data. Provider IDs are handled automatically.
          </p>
          {metadataLoading && (
            <p className="mt-3 text-sm text-[#50634f]" role="status">
              Loading real commodity and location options…
            </p>
          )}
          {metadataError && (
            <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>{metadataError}</p>
              <button
                type="button"
                onClick={() => setMetadataReload((current) => current + 1)}
                disabled={metadataLoading}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {metadataLoading ? "Retrying?" : "Retry loading options"}
              </button>
              <p className="mt-2 text-xs">
                Commodity and location dropdowns will become available when verified options load.
              </p>
            </div>
          )}
          {metadata && (
            <p className="mt-3 text-xs text-[#71816f]">
              Loaded {metadata.counts?.commodities ?? metadata.commodities.length} commodities and{" "}
              {metadata.counts?.states ?? metadata.states.length} states/territories from the provider.
            </p>
          )}
        </div>

        <form onSubmit={requestAnalytics} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-medium text-[#50634f]">
              Commodity
              <select
                className={fieldClass}
                value={filters.commodity_id}
                onChange={(event) => updateFilter("commodity_id", event.target.value)}
                required
                disabled={metadataLoading || !metadata || Boolean(metadataError)}
              >
                <option value="">Select a commodity</option>
                {(metadata?.commodities ?? [])
                  .slice()
                  .sort((a, b) => a.commodity_name.localeCompare(b.commodity_name))
                  .map((commodity) => (
                    <option key={commodity.commodity_id} value={String(commodity.commodity_id)}>
                      {commodity.commodity_name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[#50634f]">
              State / territory
              <select
                className={fieldClass}
                value={filters.state_id}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    state_id: event.target.value,
                    district_id: "",
                  }));
                }}
                required
                disabled={metadataLoading || !metadata || Boolean(metadataError)}
              >
                <option value="">Select a state</option>
                {(metadata?.states ?? [])
                  .slice()
                  .sort((a, b) => a.state_name.localeCompare(b.state_name))
                  .map((state) => (
                    <option key={state.state_id} value={String(state.state_id)}>
                      {state.state_name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[#50634f]">
              District
              <select
                className={fieldClass}
                value={filters.district_id}
                onChange={(event) => updateFilter("district_id", event.target.value)}
                required
                disabled={!filters.state_id || metadataLoading || !metadata || Boolean(metadataError)}
              >
                <option value="">
                  {filters.state_id ? "Select a district" : "Select a state first"}
                </option>
                {(metadata?.geographies ?? [])
                  .filter((item) => String(item.state_id) === filters.state_id)
                  .slice()
                  .sort((a, b) => a.district_name.localeCompare(b.district_name))
                  .map((item) => (
                    <option
                      key={`${item.state_id}-${item.district_id}`}
                      value={String(item.district_id)}
                    >
                      {item.district_name}
                    </option>
                  ))}
              </select>
            </label>
            <NumberField
              label="Market ID (optional)"
              value={filters.market_id}
              onChange={(value) => updateFilter("market_id", value)}
              step="1"
            />
            <label className="block text-sm font-medium text-[#50634f]">
              From date
              <input
                className={fieldClass}
                type="date"
                max={MARKET_DATA_END_DATE}
                value={filters.from_date}
                onChange={(event) => updateFilter("from_date", event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[#50634f]">
              To date
              <input
                className={fieldClass}
                type="date"
                max={MARKET_DATA_END_DATE}
                value={filters.to_date}
                onChange={(event) => updateFilter("to_date", event.target.value)}
                min={filters.from_date || undefined}
                required
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#214e35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183c2a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <TrendingUp size={17} />
              )}
              {loading ? "Loading market data..." : "Fetch market analytics"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setAnalytics(null);
                setError("");
                setHasSearched(false);
              }}
              className="rounded-xl border border-[#dce7d6] px-4 py-3 text-sm font-semibold text-[#50634f] hover:bg-[#f5f8f1]"
            >
              Clear filters
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {hasSearched && !loading && !error && analytics && !analytics.data_available && (
          <div className="mt-5 rounded-xl border border-[#e0e9d9] bg-[#f5f8f1] p-4 text-sm text-[#50634f]">
            The provider returned no usable price observations for these filters and dates. Try another verified ID or date range.
          </div>
        )}
      </section>

      {analytics?.data_available && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Activity}
              label="Valid observations"
              value={summary.valid_records_count ?? 0}
              detail={`${summary.invalid_records_count ?? 0} invalid records excluded`}
            />
            <MetricCard
              icon={CalendarDays}
              label="Latest observation"
              value={displayDate(summary.latest_observed_date)}
              detail={`First: ${displayDate(summary.first_observed_date)}`}
            />
            <MetricCard
              icon={TrendingUp}
              label="Period price change"
              value={
                summary.period_change_percent == null
                  ? "—"
                  : `${summary.period_change_percent > 0 ? "+" : ""}${summary.period_change_percent}%`
              }
              detail="First to last daily average in this response"
            />
            <MetricCard
              icon={Activity}
              label="Markets represented"
              value={summary.markets_count ?? 0}
              detail="Market IDs found in returned records"
            />
          </section>

          <section
            className={`rounded-2xl border p-4 text-sm leading-6 ${
              freshness.is_stale
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-[#dce7d6] bg-[#edf5e8] text-[#285b32]"
            }`}
          >
            <p className="font-bold">{freshness.label || "Freshness not reported"}</p>
            <p className="mt-1">
              Analytics checked as of {displayDate(freshness.as_of_date)}.
              {freshness.age_days != null
                ? ` Latest observation is ${freshness.age_days} day(s) old.`
                : " No valid observation date was found."}
              {" "}A recent date does not guarantee a live market quote.
            </p>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="min-w-0 rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#193d2b]">Observed price trend</h2>
              <p className="mt-1 text-sm text-[#71816f]">
                Average modal price by observation date. Units are provider-defined.
              </p>
              <div className="mt-5 h-72 w-full">
                {chartTrend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartTrend} margin={{ top: 10, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid stroke="#e7eee2" strokeDasharray="4 4" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} width={72} />
                      <Tooltip
                        labelFormatter={(label) => `Observed: ${label}`}
                        formatter={(value) => [Number(value).toLocaleString("en-IN"), "Average modal price"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="average_modal_price"
                        name="Average modal price"
                        stroke="#356c3e"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-8 text-sm text-[#71816f]">No daily observations available.</p>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#71816f]">
                This chart reflects records returned for the selected filters, not a forecast.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#193d2b]">Market comparison</h2>
              <p className="mt-1 text-sm text-[#71816f]">
                Latest average modal price for each returned market ID.
              </p>
              <div className="mt-5 h-72 w-full">
                {comparisons.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisons}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#e7eee2" strokeDasharray="4 4" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="market_id"
                        tick={{ fontSize: 11 }}
                        width={65}
                      />
                      <Tooltip
                        formatter={(value) => [Number(value).toLocaleString("en-IN"), "Latest average"]}
                        labelFormatter={(label) => `Market ID ${label}`}
                      />
                      <Bar dataKey="latest_average_modal_price" name="Latest average" fill="#78a56a" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-8 text-sm text-[#71816f]">No market comparisons available.</p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#e0e9d9] bg-white shadow-sm">
            <div className="border-b border-[#e8eee4] p-5">
              <h2 className="text-lg font-bold text-[#193d2b]">Market comparison details</h2>
              <p className="mt-1 text-sm text-[#71816f]">Market IDs are shown as supplied by the provider.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#f5f8f1] text-xs uppercase tracking-wide text-[#71816f]">
                  <tr>
                    <th className="px-5 py-3">Market ID</th>
                    <th className="px-5 py-3">Latest observation</th>
                    <th className="px-5 py-3">Latest average</th>
                    <th className="px-5 py-3">Period average</th>
                    <th className="px-5 py-3">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1e9]">
                  {comparisons.map((market) => (
                    <tr key={String(market.market_id)} className="hover:bg-[#fafcf8]">
                      <td className="px-5 py-3 font-semibold">{market.market_id ?? "—"}</td>
                      <td className="px-5 py-3">{displayDate(market.latest_observed_date)}</td>
                      <td className="px-5 py-3">{Number(market.latest_average_modal_price).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3">{Number(market.period_average_modal_price).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3">{market.records_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[#edf5e8] p-3 text-[#356c3e]">
            <Wallet size={21} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#193d2b]">Farm profitability calculator</h2>
            <p className="mt-1 text-sm leading-6 text-[#71816f]">
              Enter your expected yield, selling price, and estimated costs.
              Results are arithmetic estimates based only on your inputs, not
              an AI prediction or a guarantee of profit.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Expected yield (quintals)"
            value={costs.yield}
            onChange={(value) => updateCost("yield", value)}
          />
          <NumberField
            label="Selling price (₹ per quintal)"
            value={costs.sellingPrice}
            onChange={(value) => updateCost("sellingPrice", value)}
          />
          <NumberField
            label="Seed cost (₹)"
            value={costs.seedCost}
            onChange={(value) => updateCost("seedCost", value)}
          />
          <NumberField
            label="Fertilizer cost (₹)"
            value={costs.fertilizerCost}
            onChange={(value) => updateCost("fertilizerCost", value)}
          />
          <NumberField
            label="Pesticide cost (₹)"
            value={costs.pesticideCost}
            onChange={(value) => updateCost("pesticideCost", value)}
          />
          <NumberField
            label="Labour cost (₹)"
            value={costs.labourCost}
            onChange={(value) => updateCost("labourCost", value)}
          />
          <NumberField
            label="Irrigation cost (₹)"
            value={costs.irrigationCost}
            onChange={(value) => updateCost("irrigationCost", value)}
          />
          <NumberField
            label="Transport / selling cost (₹)"
            value={costs.transportCost}
            onChange={(value) => updateCost("transportCost", value)}
          />
          <NumberField
            label="Other costs (₹)"
            value={costs.otherCost}
            onChange={(value) => updateCost("otherCost", value)}
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#f5f8f1] p-5">
          {!profit.ready ? (
            <p className="text-sm leading-6 text-[#617160]">
              {profit.invalid
                ? "Use valid non-negative numbers for every field."
                : "Enter yield, selling price, and every cost field to calculate estimated revenue and net profit."}
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={IndianRupee}
                  label="Estimated revenue"
                  value={currency(profit.revenue)}
                  detail="Yield × selling price"
                />
                <MetricCard
                  icon={Wallet}
                  label="Total entered costs"
                  value={currency(profit.totalCosts)}
                  detail="Sum of the cost fields above"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Estimated net profit / loss"
                  value={currency(profit.net)}
                  detail={profit.net < 0 ? "Estimated loss" : "Before any unentered costs"}
                />
                <MetricCard
                  icon={Activity}
                  label="Revenue margin"
                  value={profit.margin == null ? "—" : `${profit.margin.toFixed(2)}%`}
                  detail="Net estimate ÷ revenue"
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-[#71816f]">
                Check that yield and selling price use matching units. Include land rent, loan interest, equipment depreciation, storage, taxes, and other relevant costs if applicable.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0e9d9] bg-white p-5 text-sm leading-6 text-[#617160]">
        <h2 className="font-bold text-[#193d2b]">Data source and limitations</h2>
        <p className="mt-2">
          {source.name || "CEDA Agri Market Data"} ·{" "}
          {source.provider || "Provider attribution unavailable"}
        </p>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block font-semibold text-[#356c3e] underline underline-offset-2"
          >
            View provider information
          </a>
        )}
        <p className="mt-2">
          {source.note ||
            "Verify provider dates, coverage, and units. Market observations may be delayed or historical and are not guaranteed to be accurate."}
        </p>
        <p className="mt-2">
          The analytics service does not specify a price unit. Confirm whether
          the provider reports prices per quintal or another unit before using
          them for financial decisions.
        </p>
      </section>
    </motion.main>
  );
}





