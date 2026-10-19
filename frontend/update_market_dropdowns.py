
from pathlib import Path

path = Path(r"D:\AgriWiseAI\frontend\src\components\MarketInsights.jsx")
text = path.read_text(encoding="utf-8")

old_heading = '''          <p className="mt-1 text-sm text-[#71816f]">
            Enter provider IDs. This form deliberately does not guess commodity
            or location IDs.
          </p>'''

new_heading = '''          <p className="mt-1 text-sm text-[#71816f]">
            Choose from verified commodity and location data. Provider IDs are handled automatically.
          </p>
          {metadataLoading && (
            <p className="mt-3 text-sm text-[#50634f]" role="status">
              Loading real commodity and location options…
            </p>
          )}
          {metadataError && (
            <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {metadataError} Check your login session and refresh the page.
            </div>
          )}
          {metadata && (
            <p className="mt-3 text-xs text-[#71816f]">
              Loaded {metadata.counts?.commodities ?? metadata.commodities.length} commodities and{" "}
              {metadata.counts?.states ?? metadata.states.length} states/territories from the provider.
            </p>
          )}'''

old_fields = '''            <NumberField
              label="Commodity ID"
              value={filters.commodity_id}
              onChange={(value) => updateFilter("commodity_id", value)}
              step="1"
            />
            <NumberField
              label="State ID"
              value={filters.state_id}
              onChange={(value) => updateFilter("state_id", value)}
              step="1"
            />
            <NumberField
              label="District ID"
              value={filters.district_id}
              onChange={(value) => updateFilter("district_id", value)}
              step="1"
            />'''

new_fields = '''            <label className="block text-sm font-medium text-[#50634f]">
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
            </label>'''

if text.count(old_heading) != 1:
    raise SystemExit("STOP: Heading did not match exactly. No component changes made.")

if text.count(old_fields) != 1:
    raise SystemExit("STOP: Three ID fields did not match exactly. No component changes made.")

updated = text.replace(old_heading, new_heading, 1)
updated = updated.replace(old_fields, new_fields, 1)
updated = updated.replace(
    'setError("Complete commodity ID, state ID, district ID, and both dates.");',
    'setError("Select a commodity, state, district, and both dates.");',
    1,
)

path.write_text(updated, encoding="utf-8")
print("SUCCESS: Provider-backed commodity, state, and district dropdowns added.")
