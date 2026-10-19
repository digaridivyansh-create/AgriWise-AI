
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Leaf,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sprout,
  Upload,
  XCircle,
} from "lucide-react";
import api from "../api/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function prettyLabel(value) {
  return String(value || "Unknown")
    .replaceAll("___", " â€” ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${Math.max(0, Math.min(100, number)).toFixed(2)}%`
    : "Not available";
}

function ResultCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-[#e3ebde] bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6e9] text-[#54834b]">
          <Icon size={20} />
        </span>
        <h3 className="font-bold text-[#24472f]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ServiceError({ data }) {
  if (!data) {
    return <p className="text-sm text-[#859284]">No response received from this service.</p>;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <AlertTriangle size={17} className="mb-2" />
      {data.message || data.error || "This service could not complete the analysis."}
    </div>
  );
}

export default function PlantHealth() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [organ, setOrgan] = useState("auto");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function chooseFile(nextFile) {
    setError("");
    setResult(null);

    if (!nextFile) return;

    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      setError("Choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (nextFile.size <= 0 || nextFile.size > MAX_IMAGE_BYTES) {
      setError("The image must be non-empty and no larger than 8 MB.");
      return;
    }

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  function reset() {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setOrgan("auto");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Upload a clear photo of the plant first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("organ", organ);

    setLoading(true);

    try {
      const response = await api.post("/plant-health/", formData, {
        timeout: 90000,
      });

      setResult(response.data);

      if (
        response.data.status === "failed" ||
        (!response.data.results?.plant_identification?.data &&
          !response.data.results?.disease_detection?.data)
      ) {
        setError("Neither analysis service returned usable results. Check the messages below.");
      } else {
        try {
          await api.post("/recommendation-history/", {
            recommendation_type: "plant_health",
            inputs: {
              organ,
              image_filename: file.name,
              image_size_bytes: file.size,
              image_type: file.type,
            },
            result: response.data,
          });
        } catch (historyError) {
          console.warn("Plant health history could not be saved.", historyError);
        }
      }
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(
        data?.message ||
          data?.error ||
          (requestError.code === "ECONNABORTED"
            ? "The analysis took too long. Try again with a smaller, clearer image."
            : requestError.response
              ? `The server returned HTTP ${requestError.response.status}.`
              : "Could not reach Django. Confirm that the backend is running and you are signed in.")
      );
    } finally {
      setLoading(false);
    }
  }

  const identification =
    result?.results?.plant_identification?.data;
  const disease =
    result?.results?.disease_detection?.data;
  const matches = identification?.matches || [];
  const topPredictions = disease?.top_predictions || [];
  const prediction = disease?.prediction;
  const consistency = result?.crop_consistency;
  const quality = disease?.image_quality;

  return (
    <section className="min-h-full bg-[#f8faf5] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-9 max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce9d5] bg-white px-4 py-2 text-xs font-semibold text-[#527458]">
            <ScanSearch size={15} />
            Image-based screening
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-[#193d2b] sm:text-5xl">
            Understand your plantâ€™s health.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#718171] sm:text-base">
            Upload a plant photo to request ranked species matches from
            Pl@ntNet and disease screening from the local ONNX model.
            Review both results before deciding what to do next.
          </p>
        </motion.div>

        <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[1.7rem] border border-[#e3ebde] bg-white p-5 shadow-[0_20px_60px_-35px_rgba(29,79,48,0.2)] sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#24472f]">Plant photo</h2>
                <p className="mt-1 text-xs text-[#8a988b]">
                  JPEG, PNG or WEBP Â· maximum 8 MB
                </p>
              </div>
              <span className="rounded-xl bg-[#eff6e9] p-3 text-[#57894e]">
                <Leaf size={21} />
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />

            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-[#e3ebde] bg-[#f6f8f2]">
                <img
                  src={preview}
                  alt="Selected plant for analysis"
                  className="max-h-[360px] w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                    setResult(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={loading}
                  aria-label="Remove selected image"
                  className="absolute right-3 top-3 rounded-full bg-white p-2 text-[#45604c] shadow-md disabled:opacity-50"
                >
                  <XCircle size={19} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[250px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cddfc5] bg-[#f8fbf5] px-5 text-center transition hover:border-[#79a86b] hover:bg-[#f1f7ec]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#57894e] shadow-sm">
                  <ImagePlus size={27} />
                </span>
                <span className="mt-4 font-semibold text-[#31573b]">
                  Choose a plant photo
                </span>
                <span className="mt-2 text-xs leading-5 text-[#8a988b]">
                  Prefer a close-up leaf image in natural light
                </span>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dce7d6] bg-white px-4 py-2 text-xs font-semibold text-[#45604c]">
                  <Upload size={14} /> Browse files
                </span>
              </button>
            )}

            {file && (
              <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-[#f5f8f1] p-3">
                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold text-[#385640]">
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-[#859284]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-[#6b9d57]" />
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="plant-organ"
                className="mb-2 block text-sm font-semibold text-[#385640]"
              >
                What are you photographing?
              </label>
              <select
                id="plant-organ"
                value={organ}
                onChange={(event) => setOrgan(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#e2eadd] bg-[#fbfcf9] px-4 py-3 text-sm text-[#24472f] outline-none focus:border-[#79a86b] focus:ring-4 focus:ring-[#79a86b]/10"
              >
                <option value="auto">Let the service decide</option>
                <option value="leaf">Leaf</option>
                <option value="flower">Flower</option>
                <option value="fruit">Fruit</option>
                <option value="bark">Bark</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-[#8a988b]">
                Disease screening is designed for plant-leaf images. Other
                photo types may produce unreliable results.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
              >
                <AlertTriangle size={18} className="mt-1 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading || !file}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#214e35] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-950/10 transition hover:bg-[#163c28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <ScanSearch size={17} />
                )}
                {loading ? "Analyzing plant..." : "Analyze plant"}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dbe6d8] px-5 py-3.5 text-sm font-semibold text-[#45604c] transition hover:bg-[#f4f8f0] disabled:opacity-60"
              >
                <RefreshCw size={15} /> Reset
              </button>
            </div>

            {loading && (
              <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#829181]">
                <Clock3 size={14} />
                Plant identification may contact an external service. Keep
                this page open while both screenings run.
              </p>
            )}
          </form>

          <div className="space-y-5">
            {!result ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[340px] flex-col items-center justify-center rounded-[1.7rem] border border-[#e3ebde] bg-white p-8 text-center shadow-[0_20px_60px_-35px_rgba(29,79,48,0.16)]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eff6e9] text-[#57894e]">
                  {loading ? (
                    <LoaderCircle size={28} className="animate-spin" />
                  ) : (
                    <Sprout size={29} />
                  )}
                </div>
                <h2 className="mt-5 text-lg font-bold text-[#24472f]">
                  {loading ? "Screening your photo" : "Your results will appear here"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#859284]">
                  {loading
                    ? "The backend is checking plant identity and screening supported disease classes."
                    : "Upload a photo and start the analysis to view species matches, disease candidates, and image-quality information."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
                aria-live="polite"
              >
                <div className="rounded-2xl border border-[#e3ebde] bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7a9271]">
                        Screening status
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-[#24472f]">
                        {result.status === "success"
                          ? "Analysis completed"
                          : result.status === "partial_success"
                            ? "Partial results available"
                            : "Analysis could not complete"}
                      </h2>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      result.status === "success"
                        ? "bg-[#edf6e8] text-[#3f7948]"
                        : result.status === "partial_success"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-700"
                    }`}>
                      {result.status?.replaceAll("_", " ") || "unknown"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#718171]">
                    {result.message || "Review each service result below."}
                  </p>
                </div>

                <ResultCard title="Plant identification" icon={Leaf}>
                  {identification?.status === "success" ? (
                    <>
                      {matches.length ? (
                        <div className="space-y-3">
                          {matches.map((match, index) => (
                            <div
                              key={`${match.scientific_name}-${index}`}
                              className={`rounded-xl border p-4 ${
                                index === 0
                                  ? "border-[#cfe2c5] bg-[#f5f9f1]"
                                  : "border-[#e7ede2] bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a988b]">
                                    Match {index + 1}
                                  </p>
                                  <p className="mt-1 break-words font-semibold text-[#31573b]">
                                    {match.scientific_name || "Unknown species"}
                                  </p>
                                  {match.common_names?.length > 0 && (
                                    <p className="mt-1 text-xs leading-5 text-[#718171]">
                                      {match.common_names.join(", ")}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-[#527458]">
                                  {percent(Number(match.score) * 100)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#859284]">
                          The service returned no ranked species matches.
                        </p>
                      )}
                      <p className="mt-4 text-xs leading-5 text-[#859284]">
                        Species scores rank the serviceâ€™s matches. They do
                        not confirm botanical identity.
                      </p>
                    </>
                  ) : (
                    <ServiceError data={identification} />
                  )}
                </ResultCard>

                <ResultCard title="Disease screening" icon={ShieldCheck}>
                  {disease?.status === "success" ? (
                    <>
                      {prediction ? (
                        <div className="rounded-2xl border border-[#cfe2c5] bg-[#f5f9f1] p-5">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#527458]">
                            <CheckCircle2 size={14} />
                            {prediction.class_status === "healthy_class"
                              ? "Healthy class predicted"
                              : "Disease class predicted"}
                          </span>
                          <h3 className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#214e35]">
                            {prettyLabel(prediction.condition)}
                          </h3>
                          <p className="mt-2 text-sm text-[#718171]">
                            Crop class: {prettyLabel(prediction.crop)}
                          </p>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-[#49654f]">
                              Model score
                            </span>
                            <span className="text-lg font-bold tabular-nums text-[#315f3b]">
                              {percent(prediction.model_score_percent)}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce9d4]">
                            <div
                              className="h-full rounded-full bg-[#6e9f54]"
                              style={{
                                width: `${Math.max(0, Math.min(100, Number(prediction.model_score_percent) || 0))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                          <AlertTriangle size={18} className="mb-2" />
                          The model marked this image as uncertain. No single
                          disease prediction has been selected.
                        </div>
                      )}

                      {topPredictions.length > 0 && (
                        <div className="mt-5">
                          <h4 className="mb-3 text-sm font-bold text-[#385640]">
                            Top model candidates
                          </h4>
                          <div className="space-y-2">
                            {topPredictions.map((item, index) => (
                              <div
                                key={`${item.label}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[#e7ede2] p-3"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-semibold text-[#385640]">
                                    {prettyLabel(item.condition || item.label)}
                                  </p>
                                  <p className="mt-1 text-xs text-[#859284]">
                                    {prettyLabel(item.crop)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-bold tabular-nums text-[#527458]">
                                  {percent(item.model_score_percent)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {quality && (
                        <div className={`mt-5 rounded-xl border p-4 ${
                          quality.potentially_blurry
                            ? "border-amber-200 bg-amber-50"
                            : "border-[#e3ebde] bg-[#f8faf5]"
                        }`}>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#385640]">
                            <ImagePlus size={17} />
                            Image quality screening
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#718171]">
                            {quality.potentially_blurry
                              ? "This image may be blurry. Retake it in good light with the leaf in focus."
                              : "The blur heuristic did not flag this image. That does not guarantee the photo is suitable for diagnosis."}
                          </p>
                          <p className="mt-2 text-[11px] text-[#859284]">
                            Sharpness estimate: {quality.laplacian_variance ?? "N/A"}
                          </p>
                        </div>
                      )}

                      {disease.warning && (
                        <p className="mt-4 text-sm leading-6 text-[#718171]">
                          {disease.warning}
                        </p>
                      )}
                    </>
                  ) : (
                    <ServiceError data={disease} />
                  )}
                </ResultCard>

                {consistency && (
                  <div className={`rounded-2xl border p-5 ${
                    consistency.status === "possible_mismatch"
                      ? "border-amber-200 bg-amber-50"
                      : "border-[#e3ebde] bg-white"
                  }`}>
                    <h3 className="font-bold text-[#24472f]">
                      Cross-check between services
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#718171]">
                      {consistency.message || "No cross-check message is available."}
                    </p>
                    <p className="mt-3 text-xs text-[#859284]">
                      Status: {consistency.status?.replaceAll("_", " ") || "not assessed"}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold">Use this as screening, not a diagnosis</h3>
                      <p className="mt-2 text-sm leading-6">
                        Model scores are not calibrated diagnostic probabilities.
                        Supported classes may not cover your crop or field conditions.
                        Do not apply pesticides based only on this result; verify
                        symptoms with a local agricultural expert.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError("");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4f7e45] underline-offset-4 hover:underline"
                >
                  <RefreshCw size={15} /> Analyze another photo
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-[#91a08e]">
          Your image is sent to the AgriWise AI backend. Plant identification
          may be processed by Pl@ntNet. Avoid uploading personal or sensitive
          images. The result is informational and should be checked locally.
        </p>
      </div>
    </section>
  );
}



