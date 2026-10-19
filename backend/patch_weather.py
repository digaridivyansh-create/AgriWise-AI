from pathlib import Path
import re
from datetime import datetime

path = Path("agriculture/services/advisory_service.py")
text = path.read_text(encoding="utf-8")
original = text

# Add the weather service import.
if "from .weather_service import get_forecast" not in text:
    marker = "import numpy as np"
    if marker not in text:
        raise SystemExit("STOP: Could not find the NumPy import.")
    text = text.replace(
        marker,
        marker + "\nfrom .weather_service import get_forecast",
        1,
    )

# Remove caller-supplied weather input validation.
pattern = (
    r"    # Forecast values are optional and must be supplied by the caller\.\n"
    r".*?(?=    if errors:)"
)
text, count = re.subn(pattern, "", text, count=1, flags=re.DOTALL)
if count != 1:
    raise SystemExit("STOP: Could not locate the optional weather validation block.")

# Replace the old weather-advice logic with a live forecast.
pattern = r"    weather_advice = \[\]\n.*?(?=    return Response\()"
replacement = '''    weather = get_forecast(
        data["district"].strip(),
        data["state"].strip(),
    )

    if weather["status"] == "live_forecast":
        forecast_days = weather["forecast_days"]
        weather_advice = []

        if any(
            day["precipitation_probability_percent"] is not None
            and day["precipitation_probability_percent"] >= 70
            for day in forecast_days
        ):
            weather_advice.append(
                "At least one forecast day has a 70% or higher chance of "
                "precipitation. Check the daily forecast before field operations."
            )

        if any(
            day["precipitation_mm"] is not None
            and day["precipitation_mm"] >= 100
            for day in forecast_days
        ):
            weather_advice.append(
                "A forecast day shows substantial rainfall. Check local "
                "warnings and field drainage."
            )

        if any(
            day["temperature_max_c"] is not None
            and day["temperature_max_c"] >= 35
            for day in forecast_days
        ):
            weather_advice.append(
                "A forecast day reaches 35 C or above. Check crop-specific "
                "heat guidance and local irrigation advice."
            )

        if not weather_advice:
            weather_advice.append(
                "No extreme-condition flag was triggered by these basic "
                "screening thresholds. This does not guarantee safe conditions."
            )

        weather["advice"] = weather_advice
    else:
        weather["advice"] = [
            weather.get("error", "Weather forecast is unavailable."),
            "No live weather values were used in this advisory.",
        ]

'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
if count != 1:
    raise SystemExit("STOP: Could not locate the old weather-advice block.")

# Replace the response's old weather object.
pattern = r'"weather": \{\s*"status": weather_status,\s*"source": weather_source,\s*"values": weather_values,\s*"advice": weather_advice,\s*\},'
text, count = re.subn(pattern, '"weather": weather,', text, count=1)
if count != 1:
    raise SystemExit("STOP: Could not locate the old weather response object.")

# Update the limitations to describe the live forecast accurately.
text = text.replace(
    '"No live weather API is connected in this version.",',
    '"Live seven-day weather is retrieved from Open-Meteo when available.",',
)
text = text.replace(
    '"Forecast inputs, if supplied, are not independently verified.",',
    '"Weather forecasts can be incomplete or change; confirm important decisions with local advisories.",',
)

# Keep a timestamped backup before saving.
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = path.with_name(path.name + ".backup-" + stamp)
backup.write_text(original, encoding="utf-8")
path.write_text(text, encoding="utf-8")

print("Advisory service patched successfully.")
print(f"Backup created: {backup}")
