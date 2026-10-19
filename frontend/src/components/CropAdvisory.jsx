import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Droplets,
  FlaskConical,
  Leaf,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sprout,
  Thermometer,
  Wind,
} from "lucide-react";
import api from "../api/client";

const soilFields = [
  { name: "nitrogen", label: "Nitrogen (N)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "90" },
  { name: "phosphorus", label: "Phosphorus (P)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "42" },
  { name: "potassium", label: "Potassium (K)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "43" },
  { name: "temperature", label: "Temperature", unit: "°C", min: -10, max: 60, step: 0.1, initial: "25.5" },
  { name: "humidity", label: "Humidity", unit: "%", min: 0, max: 100, step: 0.1, initial: "80" },
  { name: "ph", label: "Soil pH", unit: "pH", min: 0, max: 14, step: 0.1, initial: "6.5" },
  { name: "rainfall", label: "Rainfall", unit: "mm", min: 0, max: 5000, step: 1, initial: "200" },
];

const initialValues = {
  ...Object.fromEntries(soilFields.map((field) => [field.name, field.initial])),
  state: "",
  district: "",
  season: "kharif",
};

function prettyCrop(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayNumber(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6e9] text-[#57894e]">
        <Icon size={19} />
      </span>
      <div>
        <h3 className="font-bold text-[#24472f]">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-[#829080]">{description}</p>}
      </div>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#e5ecdf] bg-white p-4">
      <p className="text-xs text-[#879486]">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-[#31573b]">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-[#879486]">{detail}</p>}
    </div>
  );
}

export default function CropAdvisory() {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setResult(null);

    const nextErrors = {};
    const payload = {
      state: values.state.trim(),
      district: values.district.trim(),
      season: values.season,
    };

    for (const field of soilFields) {
      const raw = values[field.name];
      const number = Number(raw);

      if (raw.trim() === "" || !Number.isFinite(number)) {
        nextErrors[field.name] = "Enter a valid number.";
      } else if (number < field.min || number > field.max) {
        nextErrors[field.name] = `Enter a value from ${field.min} to ${field.max}.`;
      } else {
        payload[field.name] = number;
      }
    }

    if (!payload.state) nextErrors.state = "Enter a state.";
    if (!payload.district) nextErrors.district = "Enter a district.";

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/crop-advisory/", payload);
      const data = response.data;

      if (data.status !== "success" || !data.crop_prediction?.crop) {
        throw new Error("The API response did not contain a crop advisory.");
      }

      setResult(data);
      try {
        await api.post("/recommendation-history/", {
          recommendation_type: "weather_advisory",
          inputs: payload,
          result: data,
        });
      } catch (historyError) {
        console.warn("Weather advisory history could not be saved.", historyError);
      }
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (responseData?.fields) {
        setFieldErrors(responseData.fields);
        setError("The server rejected some inputs. Please review the highlighted fields.");
      } else if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setError("Your session may have expired or you may not be signed in. Please sign in again.");
      } else if (requestError.response) {
        setError(
          responseData?.message ||
          responseData?.error ||
          `The server returned HTTP ${requestError.response.status}.`
        );
      } else if (requestError.code === "ECONNABORTED") {
        setError("The request timed out. Please try again.");
      } else {
        setError(requestError.message || "Could not reach Django. Check that the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setValues(initialValues);
    setResult(null);
    setError("");
    setFieldErrors({});
  }

  const weather = result?.weather;
  const liveForecast = weather?.status === "live_forecast" && Array.isArray(weather.forecast_days);
  const suitability = result?.suitability_assessment;

  return (
    <section className="min-w-0 bg-[#f8faf5] py-3">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce9d5] bg-white px-3 py-2 text-xs font-semibold text-[#527458]">
            <CloudRain size={15} />
            Weather-aware decision support
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#193d2b] sm:text-4xl">
            Weather & Crop Advisory
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#718171]">
            Combine soil measurements, a crop-model prediction, your location and growing season with a live seven-day weather forecast when available.
          </p>
        </motion.div>

        <div className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[1.5rem] border border-[#e3ebde] bg-white p-5 shadow-[0_20px_60px_-35px_rgba(29,79,48,0.22)] sm:p-7"
          >
            <SectionTitle
              icon={MapPin}
              title="Farm location & season"
              description="Use the state and district names recognized by the weather geocoding service."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { name: "state", label: "State", placeholder: "e.g. Uttar Pradesh" },
                { name: "district", label: "District", placeholder: "e.g. Ghaziabad" },
              ].map((field) => (
                <div key={field.name}>
                  <label htmlFor={`advisory-${field.name}`} className="mb-2 block text-sm font-semibold text-[#385640]">
                    {field.label}
                  </label>
                  <input
                    id={`advisory-${field.name}`}
                    value={values[field.name]}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    maxLength={100}
                    required
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    className={`w-full rounded-xl border bg-[#fbfcf9] px-4 py-3 text-sm text-[#24472f] outline-none focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10 ${
                      fieldErrors[field.name] ? "border-red-400" : "border-[#e2eadd]"
                    }`}
                  />
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors[field.name]}</p>
                  )}
                </div>
              ))}

              <div className="sm:col-span-2">
                <label htmlFor="advisory-season" className="mb-2 block text-sm font-semibold text-[#385640]">
                  Growing season
                </label>
                <select
                  id="advisory-season"
                  value={values.season}
                  onChange={(event) => updateField("season", event.target.value)}
                  className="w-full rounded-xl border border-[#e2eadd] bg-[#fbfcf9] px-4 py-3 text-sm text-[#24472f] outline-none focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10"
                >
                  <option value="kharif">Kharif — monsoon season</option>
                  <option value="rabi">Rabi — cool season</option>
                  <option value="zaid">Zaid — short summer season</option>
                </select>
              </div>
            </div>

            <div className="mb-5 mt-8">
              <SectionTitle
                icon={FlaskConical}
                title="Soil & environment measurements"
                description="All seven values are required and use the backend's preliminary input limits."
              />
            </div>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {soilFields.map((field) => (
                <div key={field.name}>
                  <label htmlFor={`advisory-${field.name}`} className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-[#385640]">
                    <span>{field.label}</span>
                    <span className="text-xs font-medium text-[#8a988b]">{field.unit}</span>
                  </label>
                  <input
                    id={`advisory-${field.name}`}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={values[field.name]}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    required
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    className={`w-full rounded-xl border bg-[#fbfcf9] px-4 py-3 text-sm text-[#24472f] outline-none focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10 ${
                      fieldErrors[field.name] ? "border-red-400" : "border-[#e2eadd]"
                    }`}
                  />
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#214e35] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#163c28] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Sprout size={17} />}
                {loading ? "Building advisory..." : "Generate crop advisory"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dbe6d8] px-5 py-3.5 text-sm font-semibold text-[#45604c] hover:bg-[#f4f8f0] disabled:opacity-60"
              >
                <RefreshCw size={15} />
                Reset
              </button>
            </div>
          </form>

          <div className="space-y-5">
            {!result ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-72 flex-col items-center justify-center rounded-[1.5rem] border border-[#e3ebde] bg-white p-8 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eff6e9] text-[#57894e]">
                  {loading ? <LoaderCircle size={28} className="animate-spin" /> : <CloudRain size={28} />}
                </div>
                <h2 className="mt-5 text-lg font-bold text-[#24472f]">
                  {loading ? "Preparing your advisory" : "Your advisory will appear here"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#859284]">
                  {loading
                    ? "The backend is evaluating your inputs and requesting the district forecast."
                    : "Enter your location, season and measurements, then generate an advisory."}
                </p>
              </motion.div>
            ) : (
              <>
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[1.5rem] border border-[#dfe9d9] bg-white p-5 sm:p-7"
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#57894e]">
                      <CheckCircle2 size={16} />
                      Advisory generated
                    </span>
                    <span className="rounded-full bg-[#eff6e9] px-3 py-1.5 text-xs font-semibold capitalize text-[#456c42]">
                      {result.season?.value}
                    </span>
                  </div>

                  <p className="mt-6 text-sm text-[#829181]">Crop predicted by the trained model</p>
                  <h2 className="mt-1 break-words text-4xl font-semibold tracking-[-0.05em] text-[#214e35]">
                    {prettyCrop(result.crop_prediction.crop)}
                  </h2>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric
                      label="Model confidence"
                      value={`${displayNumber(result.crop_prediction.confidence_percent, 2)}%`}
                      detail="Not a guarantee of suitability"
                    />
                    <Metric
                      label="Location"
                      value={result.location?.district || values.district}
                      detail={result.location?.state || values.state}
                    />
                  </div>

                  {result.season?.context && (
                    <p className="mt-4 rounded-xl bg-[#f5f8f1] p-4 text-sm leading-6 text-[#627660]">
                      {result.season.context}
                    </p>
                  )}
                </motion.section>

                <section className="rounded-[1.5rem] border border-[#e3ebde] bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={CloudRain}
                    title="Seven-day weather forecast"
                    description={`Source: ${weather?.source || "Open-Meteo"}`}
                  />

                  {liveForecast ? (
                    <>
                      {weather.location && (
                        <p className="mb-4 text-xs text-[#718171]">
                          Forecast location: {weather.location.name || result.location?.district}
                          {weather.location.timezone ? ` · ${weather.location.timezone}` : ""}
                        </p>
                      )}

                      <div className="space-y-3">
                        {weather.forecast_days.map((day) => (
                          <div key={day.date} className="rounded-xl border border-[#e8eee3] bg-[#fbfcf9] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-[#385640]">
                                {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#385640]">
                                <Thermometer size={15} className="text-[#c77c42]" />
                                {displayNumber(day.temperature_min_c)}–{displayNumber(day.temperature_max_c)} °C
                              </p>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-xs text-[#718171]">
                                <Droplets size={15} className="text-[#538bb1]" />
                                Rainfall: {displayNumber(day.precipitation_mm)} mm
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[#718171]">
                                <CloudRain size={15} className="text-[#538bb1]" />
                                Rain chance: {day.precipitation_probability_percent == null
                                  ? "—"
                                  : `${displayNumber(day.precipitation_probability_percent, 0)}%`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {weather.location?.latitude != null && weather.location?.longitude != null && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(weather.location.latitude)}&mlon=${encodeURIComponent(weather.location.longitude)}#map=10/${encodeURIComponent(weather.location.latitude)}/${encodeURIComponent(weather.location.longitude)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#4f7e45] underline-offset-4 hover:underline"
                        >
                          <MapPin size={14} />
                          View forecast location on map
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex gap-2 text-sm font-semibold text-amber-900">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        Live forecast unavailable
                      </div>
                      <p className="mt-2 text-sm leading-6 text-amber-900">
                        {weather?.error || "No live weather values were returned for this request."}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-amber-800">
                        The advisory has not substituted sample weather data. Check the district spelling or try again later.
                      </p>
                    </div>
                  )}

                  {Array.isArray(weather?.advice) && weather.advice.length > 0 && (
                    <div className="mt-5">
                      <h4 className="mb-3 text-sm font-bold text-[#385640]">Weather guidance</h4>
                      <ul className="space-y-2">
                        {weather.advice.map((item, index) => (
                          <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-6 text-[#627660]">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#76a263]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                <section className="rounded-[1.5rem] border border-[#e3ebde] bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={FlaskConical}
                    title="Soil screening"
                    description="Basic pH screening only; this is not a laboratory diagnosis or fertilizer prescription."
                  />

                  <Metric label="Submitted soil pH" value={displayNumber(result.soil_screening?.ph_value)} />

                  {Array.isArray(result.soil_screening?.flags) && result.soil_screening.flags.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {result.soil_screening.flags.map((flag, index) => (
                        <li key={`${index}-${flag}`} className="flex gap-2 text-sm leading-6 text-[#627660]">
                          <AlertTriangle size={17} className="mt-1 shrink-0 text-amber-600" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#718171]">No soil screening flags were returned.</p>
                  )}

                  {result.soil_screening?.note && (
                    <p className="mt-4 text-xs leading-5 text-[#879486]">{result.soil_screening.note}</p>
                  )}
                </section>

                <section className="rounded-[1.5rem] border border-[#e3ebde] bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={Leaf}
                    title="Crop suitability checks"
                    description="The system will not claim local suitability without verified regional rules."
                  />

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-bold capitalize text-amber-900">
                      {(suitability?.status || "unknown").replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      {suitability?.reason || "A suitability assessment was not included in the response."}
                    </p>
                  </div>

                  {Array.isArray(suitability?.required_checks) && (
                    <div className="mt-4">
                      <h4 className="mb-3 text-sm font-bold text-[#385640]">Checks still needed</h4>
                      <ul className="space-y-2">
                        {suitability.required_checks.map((item) => (
                          <li key={item} className="flex gap-2 text-sm leading-6 text-[#627660]">
                            <CheckCircle2 size={16} className="mt-1 shrink-0 text-[#719663]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {suitability?.basis && (
                    <p className="mt-4 text-xs leading-5 text-[#879486]">{suitability.basis}</p>
                  )}
                </section>

                {result.model_evaluation && (
                  <section className="rounded-[1.5rem] border border-[#e3ebde] bg-white p-5 sm:p-7">
                    <SectionTitle
                      icon={Wind}
                      title="Model evaluation"
                      description="Evaluation metrics describe the held-out dataset, not proven real-farm performance."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Metric
                        label="Held-out test accuracy"
                        value={`${displayNumber(result.model_evaluation.held_out_test_accuracy_percent, 2)}%`}
                      />
                      <Metric
                        label="Test samples"
                        value={Number(result.model_evaluation.test_rows || 0).toLocaleString()}
                      />
                    </div>
                    {result.model_evaluation.dataset_source && (
                      <p className="mt-4 break-all text-xs leading-5 text-[#879486]">
                        Dataset source: {result.model_evaluation.dataset_source}
                      </p>
                    )}
                  </section>
                )}

                {Array.isArray(result.limitations) && result.limitations.length > 0 && (
                  <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                      <AlertTriangle size={18} />
                      Important limitations
                    </div>
                    <ul className="mt-3 space-y-2">
                      {result.limitations.map((item) => (
                        <li key={item} className="text-xs leading-6 text-amber-900">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError("");
                  }}
                  className="text-sm font-semibold text-[#4f7e45] underline-offset-4 hover:underline"
                >
                  Generate another advisory
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-6 text-[#91a08e]">
          AgriWise AI provides decision support, not a guaranteed planting recommendation. Confirm important decisions with local agricultural experts, official weather guidance and laboratory soil results.
        </p>
      </div>
    </section>
  );
}

