import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Leaf,
  LoaderCircle,
  RefreshCw,
  Thermometer,
  TriangleAlert,
} from "lucide-react";
import api from "../api/client";

const fields = [
  { name: "nitrogen", label: "Nitrogen (N)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "90", hint: "Soil nitrogen level" },
  { name: "phosphorus", label: "Phosphorus (P)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "42", hint: "Soil phosphorus level" },
  { name: "potassium", label: "Potassium (K)", unit: "mg/kg", min: 0, max: 300, step: 1, initial: "43", hint: "Soil potassium level" },
  { name: "temperature", label: "Temperature", unit: "°C", min: -10, max: 60, step: 0.1, initial: "25.5", hint: "Ambient temperature" },
  { name: "humidity", label: "Humidity", unit: "%", min: 0, max: 100, step: 0.1, initial: "80", hint: "Relative humidity" },
  { name: "ph", label: "Soil pH", unit: "pH", min: 0, max: 14, step: 0.1, initial: "6.5", hint: "Soil acidity or alkalinity" },
  { name: "rainfall", label: "Rainfall", unit: "mm", min: 0, max: 5000, step: 1, initial: "200", hint: "Rainfall measurement used by the model" },
];

const initialValues = Object.fromEntries(fields.map((field) => [field.name, field.initial]));

function prettyCrop(crop) {
  return String(crop || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CropRecommendation() {
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
    const payload = {};

    for (const field of fields) {
      const value = Number(values[field.name]);

      if (values[field.name].trim() === "" || !Number.isFinite(value)) {
        nextErrors[field.name] = "Enter a valid number.";
      } else if (value < field.min || value > field.max) {
        nextErrors[field.name] = `Enter a value from ${field.min} to ${field.max}.`;
      } else {
        payload[field.name] = value;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/crop-recommendation/", payload);
      const data = response.data;

      if (data.status !== "success" || !data.prediction?.crop) {
        throw new Error("The API response did not contain a crop prediction.");
      }

      setResult(data);
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (responseData?.fields) {
        setFieldErrors(responseData.fields);
        setError("The server rejected some inputs. Please review the highlighted fields.");
      } else if (requestError.response) {
        setError(
          responseData?.message ||
          responseData?.error ||
          `The server returned HTTP ${requestError.response.status}.`
        );
      } else if (requestError.code === "ECONNABORTED") {
        setError("The request timed out. Please try again.");
      } else {
        setError(requestError.message || "Could not reach the backend. Check that Django is running.");
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

  return (
    <section id="crop-tool" className="bg-[#f8faf5] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce9d5] bg-white px-4 py-2 text-xs font-semibold text-[#527458]">
            <FlaskConical size={14} />
            Trained ML model
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-[#193d2b] sm:text-5xl">
            Find a crop to explore.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#718171] sm:text-base">
            Enter your soil and environmental measurements to request a prediction from the AgriWise AI backend.
          </p>
        </motion.div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-[1.7rem] border border-[#e3ebde] bg-white p-5 shadow-[0_20px_60px_-35px_rgba(29,79,48,0.25)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#24472f]">Field measurements</h3>
                <p className="mt-1 text-xs text-[#8a988b]">All seven values are required.</p>
              </div>
              <span className="rounded-xl bg-[#eff6e9] p-3 text-[#57894e]">
                <Leaf size={21} />
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className={field.name === "rainfall" ? "sm:col-span-2" : ""}>
                  <label htmlFor={`crop-${field.name}`} className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-[#385640]">
                    <span>{field.label}</span>
                    <span className="text-xs font-medium text-[#8a988b]">{field.unit}</span>
                  </label>
                  <input
                    id={`crop-${field.name}`}
                    name={field.name}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={values[field.name]}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    aria-describedby={`hint-${field.name}`}
                    required
                    className={`w-full rounded-xl border bg-[#fbfcf9] px-4 py-3 text-sm text-[#24472f] outline-none transition focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10 ${
                      fieldErrors[field.name] ? "border-red-400" : "border-[#e2eadd]"
                    }`}
                  />
                  <p id={`hint-${field.name}`} className="mt-1.5 text-[11px] text-[#94a092]">{field.hint}</p>
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#214e35] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-950/10 transition hover:bg-[#163c28] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                {loading ? "Analyzing measurements..." : "Recommend a crop"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dbe6d8] px-5 py-3.5 text-sm font-semibold text-[#45604c] transition hover:bg-[#f4f8f0] disabled:opacity-60"
              >
                <RefreshCw size={15} />
                Reset
              </button>
            </div>
          </form>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[1.7rem] border border-[#e3ebde] bg-white p-5 shadow-[0_20px_60px_-35px_rgba(29,79,48,0.18)] sm:p-8"
          >
            {!result ? (
              <div className="flex min-h-[310px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eff6e9] text-[#57894e]">
                  {loading ? <LoaderCircle size={28} className="animate-spin" /> : <SproutIcon />}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#24472f]">
                  {loading ? "Evaluating your inputs" : "Your recommendation will appear here"}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#859284]">
                  {loading
                    ? "Sending your measurements to the trained crop recommendation model."
                    : "Complete the form and request a prediction to see the model output and evaluation details."}
                </p>
              </div>
            ) : (
              <div aria-live="polite">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#57894e]">
                  <CheckCircle2 size={16} />
                  Prediction received
                </div>
                <p className="mt-6 text-sm text-[#829181]">Recommended crop to investigate</p>
                <h3 className="mt-1 break-words text-4xl font-semibold capitalize tracking-[-0.05em] text-[#214e35] sm:text-5xl">
                  {prettyCrop(result.prediction.crop)}
                </h3>

                <div className="mt-7 rounded-2xl bg-[#f1f7ec] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#49654f]">Model confidence</span>
                    <span className="text-xl font-bold tabular-nums text-[#315f3b]">
                      {result.prediction.confidence_percent}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce9d4]">
                    <div
                      className="h-full rounded-full bg-[#6e9f54] transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, Number(result.prediction.confidence_percent) || 0))}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#7b8c78]">
                    Confidence reflects the model's predicted probabilities. It is not a guarantee of yield or suitability.
                  </p>
                </div>

                {result.model_evaluation && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#e5ecdf] p-4">
                      <p className="text-xs text-[#879486]">Held-out test accuracy</p>
                      <p className="mt-1 text-xl font-bold text-[#31573b]">
                        {result.model_evaluation.held_out_test_accuracy_percent}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e5ecdf] p-4">
                      <p className="text-xs text-[#879486]">Training samples</p>
                      <p className="mt-1 text-xl font-bold text-[#31573b]">
                        {Number(result.model_evaluation.training_rows).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                  <TriangleAlert size={17} className="mt-1 shrink-0" />
                  <div>
                    <p className="font-bold">Validate locally before planting</p>
                    <p>Consider the season, region, soil test, irrigation, and local agricultural guidance. This model's held-out score does not establish field performance.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="mt-5 text-sm font-semibold text-[#4f7e45] underline-offset-4 hover:underline"
                >
                  Try different measurements
                </button>
              </div>
            )}
          </motion.aside>
        </div>

        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-6 text-[#91a08e]">
          Input limits are preliminary validation ranges. Soil units and measurement methods should match the dataset's assumptions. Recommendations are informational, not a substitute for local agronomic advice.
        </p>
      </div>
    </section>
  );
}

function SproutIcon() {
  return <Droplets size={28} />;
}
