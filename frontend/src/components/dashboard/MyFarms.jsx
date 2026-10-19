import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Tractor, Pencil, Trash2, X, RefreshCw, Sprout } from "lucide-react";
import api from "../../api/client";

const emptyForm = {
  name: "",
  location: "",
  soil_type: "",
  nitrogen: "",
  phosphorus: "",
  potassium: "",
  ph: "",
};

const numericFields = ["nitrogen", "phosphorus", "potassium", "ph"];

function toPayload(form) {
  const payload = {
    name: form.name.trim(),
    location: form.location.trim(),
    soil_type: form.soil_type.trim(),
  };

  for (const field of numericFields) {
    payload[field] = form[field] === "" ? null : Number(form[field]);
  }

  return payload;
}

export default function MyFarms() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState(null);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/farms/");
      setFarms(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Couldn't load your farms. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(farm) {
    setEditingId(farm.id);
    setForm({
      name: farm.name ?? "",
      location: farm.location ?? "",
      soil_type: farm.soil_type ?? "",
      nitrogen: farm.nitrogen ?? "",
      phosphorus: farm.phosphorus ?? "",
      potassium: farm.potassium ?? "",
      ph: farm.ph ?? "",
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim()) {
      setError("Please enter a farm name.");
      return;
    }

    if (form.ph !== "" && (!Number.isFinite(Number(form.ph)) || Number(form.ph) < 0 || Number(form.ph) > 14)) {
      setError("Soil pH must be between 0 and 14.");
      return;
    }

    for (const field of numericFields) {
      if (form[field] !== "" && !Number.isFinite(Number(form[field]))) {
        setError(`${field.toUpperCase()} must be a valid number.`);
        return;
      }
    }

    setSaving(true);

    try {
      const payload = toPayload(form);

      if (editingId !== null) {
        await api.patch(`/farms/${editingId}/`, payload);
        setNotice("Farm updated successfully.");
      } else {
        await api.post("/farms/", payload);
        setNotice("Farm saved successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadFarms();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Couldn't save this farm. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFarm(farm) {
    const confirmed = window.confirm(
      `Delete "${farm.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(farm.id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/farms/${farm.id}/`);
      setFarms((previous) => previous.filter((item) => item.id !== farm.id));
      setNotice(`"${farm.name}" was deleted.`);
      if (editingId === farm.id) {
        setShowForm(false);
        setEditingId(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Couldn't delete this farm. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const fields = [
    { name: "nitrogen", label: "Nitrogen (N)", placeholder: "e.g. 90" },
    { name: "phosphorus", label: "Phosphorus (P)", placeholder: "e.g. 42" },
    { name: "potassium", label: "Potassium (K)", placeholder: "e.g. 43" },
    { name: "ph", label: "Soil pH", placeholder: "0–14" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72856d]">
            Farm management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#193d2b]">
            My Farms
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687969]">
            Save your farm details and soil measurements in one place for easier agricultural planning.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadFarms}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce7d6] bg-white px-4 py-3 text-sm font-bold text-[#31583d] transition hover:bg-[#f0f6eb] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#214e35] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#173b27]"
          >
            <Plus size={17} />
            Add farm
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#687969]">Saved farms</p>
            <Tractor size={20} className="text-[#4c8054]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">
            {farms.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#687969]">With a location</p>
            <MapPin size={20} className="text-[#4c8054]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">
            {farms.filter((farm) => farm.location?.trim()).length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#687969]">With soil details</p>
            <Sprout size={20} className="text-[#4c8054]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#193d2b]">
            {farms.filter((farm) => farm.soil_type || farm.ph != null).length}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {showForm && (
        <section className="rounded-3xl border border-[#dce7d6] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#193d2b]">
                {editingId !== null ? "Edit farm" : "Add a farm"}
              </h2>
              <p className="mt-1 text-sm text-[#71816f]">
                Add the details you know; soil measurements can be filled in later.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close farm form"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-[#71816f] hover:bg-[#f5f8f1]"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#365541]">
                Farm name *
                <input
                  required
                  maxLength={120}
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. North Field"
                  className="mt-2 w-full rounded-xl border border-[#dce7d6] bg-white px-4 py-3 font-normal text-[#193d2b] outline-none transition focus:border-[#4d8156] focus:ring-2 focus:ring-[#4d8156]/15"
                />
              </label>

              <label className="block text-sm font-semibold text-[#365541]">
                Location
                <input
                  maxLength={255}
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="Village, district or region"
                  className="mt-2 w-full rounded-xl border border-[#dce7d6] bg-white px-4 py-3 font-normal text-[#193d2b] outline-none transition focus:border-[#4d8156] focus:ring-2 focus:ring-[#4d8156]/15"
                />
              </label>

              <label className="block text-sm font-semibold text-[#365541] sm:col-span-2">
                Soil type
                <select
                  name="soil_type"
                  value={form.soil_type}
                  onChange={updateField}
                  className="mt-2 w-full rounded-xl border border-[#dce7d6] bg-white px-4 py-3 font-normal text-[#193d2b] outline-none focus:border-[#4d8156] focus:ring-2 focus:ring-[#4d8156]/15"
                >
                  <option value="">Select if known</option>
                  <option value="Alluvial">Alluvial</option>
                  <option value="Black">Black soil</option>
                  <option value="Red">Red soil</option>
                  <option value="Laterite">Laterite</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Clay">Clay</option>
                  <option value="Loamy">Loamy</option>
                  <option value="Other">Other / mixed</option>
                </select>
              </label>
            </div>

            <div>
              <h3 className="mb-1 font-bold text-[#193d2b]">Soil measurements</h3>
              <p className="mb-4 text-xs text-[#71816f]">
                Optional. Use recent soil-test values where available.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {fields.map((field) => (
                  <label key={field.name} className="block text-sm font-semibold text-[#365541]">
                    {field.label}
                    <input
                      type="number"
                      step="any"
                      name={field.name}
                      value={form[field.name]}
                      onChange={updateField}
                      placeholder={field.placeholder}
                      className="mt-2 w-full rounded-xl border border-[#dce7d6] bg-white px-4 py-3 font-normal text-[#193d2b] outline-none transition focus:border-[#4d8156] focus:ring-2 focus:ring-[#4d8156]/15"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#edf1e9] pt-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#dce7d6] px-5 py-3 text-sm font-bold text-[#45604c] hover:bg-[#f5f8f1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#214e35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173b27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId !== null ? "Save changes" : "Save farm"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#e0e9d9] bg-white p-12 text-center text-sm text-[#71816f]">
          Loading your farms...
        </div>
      ) : farms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbdcc4] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf5e8] text-[#31583d]">
            <Tractor size={30} />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-[#193d2b]">Start with your first farm</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71816f]">
            Save a farm's location and soil information so you can keep its details organised.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#214e35] px-5 py-3 text-sm font-bold text-white hover:bg-[#173b27]"
          >
            <Plus size={17} /> Add your first farm
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm) => (
            <article
              key={farm.id}
              className="rounded-2xl border border-[#e0e9d9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf5e8] text-[#31583d]">
                    <Tractor size={23} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold text-[#193d2b]">{farm.name}</h2>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#71816f]">
                      <MapPin size={13} />
                      {farm.location || "Location not added"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#f1f6ed] px-3 py-1.5 text-xs font-semibold text-[#45604c]">
                  {farm.soil_type || "Soil type unknown"}
                </span>
                <span className="rounded-full bg-[#f1f6ed] px-3 py-1.5 text-xs font-semibold text-[#45604c]">
                  {farm.ph != null ? `pH ${farm.ph}` : "pH not added"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["N", farm.nitrogen],
                  ["P", farm.phosphorus],
                  ["K", farm.potassium],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#f7f9f4] p-3 text-center">
                    <p className="text-xs font-bold text-[#71816f]">{label}</p>
                    <p className="mt-1 text-lg font-extrabold text-[#193d2b]">
                      {value ?? "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-2 border-t border-[#edf1e9] pt-4">
                <button
                  type="button"
                  onClick={() => openEditForm(farm)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#dce7d6] px-3 py-2.5 text-sm font-bold text-[#365541] transition hover:bg-[#f5f8f1]"
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteFarm(farm)}
                  disabled={deletingId === farm.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deletingId === farm.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
