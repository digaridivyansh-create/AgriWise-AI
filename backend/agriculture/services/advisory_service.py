from rest_framework import status
from rest_framework.response import Response

from .crop_service import (
    ARTIFACT,
    FEATURES,
    FIELD_BOUNDS,
    MODEL,
    REQUIRED_FIELDS,
    TEST_ACCURACY,
)

import numpy as np
from .weather_service import get_forecast
from .suitability_service import assess_crop_suitability


SEASON_CONTEXT = {
    "kharif": (
        "Kharif generally overlaps the monsoon period in much of India. "
        "Check local rainfall forecasts, drainage and sowing windows."
    ),
    "rabi": (
        "Rabi crops are generally associated with the cooler season. "
        "Check local sowing windows, temperature and irrigation needs."
    ),
    "zaid": (
        "Zaid generally refers to the short summer growing season between "
        "Rabi and Kharif in parts of India. Check heat and water availability."
    ),
}

OPTIONAL_WEATHER_FIELDS = {
    "forecast_7day_rainfall_mm": (0, 2000),
    "forecast_max_temperature_c": (-10, 60),
    "forecast_rain_probability_percent": (0, 100),
}


def generate_crop_advisory(request):
    data = request.data
    errors = {}
    values = {}

    # Validate the same seven features used by the trained model.
    for field in REQUIRED_FIELDS:
        if field not in data:
            errors[field] = "This field is required."
            continue

        try:
            value = float(data[field])
        except (TypeError, ValueError):
            errors[field] = "Must be a valid number."
            continue

        if not np.isfinite(value):
            errors[field] = "Value must be finite."
            continue

        minimum, maximum = FIELD_BOUNDS[field]
        if not minimum <= value <= maximum:
            errors[field] = f"Value must be between {minimum} and {maximum}."
            continue

        values[field] = value

    # Location and season are context, not model features.
    for field in ("state", "district"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            errors[field] = "This field is required and must be text."
        elif len(value.strip()) > 100:
            errors[field] = "Must be 100 characters or fewer."

    season = data.get("season")
    if not isinstance(season, str) or season.strip().lower() not in SEASON_CONTEXT:
        errors["season"] = "Choose kharif, rabi or zaid."

    if errors:
        return Response(
            {"status": "error", "error": "Invalid input", "fields": errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    season = season.strip().lower()
    features = np.array([[values[field] for field in FEATURES]], dtype=float)

    crop = str(MODEL.predict(features)[0])
    probabilities = MODEL.predict_proba(features)[0]
    confidence = float(np.max(probabilities))

    soil_flags = []
    if values["ph"] < 5.5:
        soil_flags.append(
            "The supplied pH is acidic. Confirm with a soil test before "
            "choosing any soil amendment."
        )
    elif values["ph"] > 8.0:
        soil_flags.append(
            "The supplied pH is alkaline. Confirm with a soil test before "
            "choosing any soil amendment."
        )
    else:
        soil_flags.append(
            "The supplied pH does not trigger this basic screening flag; "
            "suitability still depends on the crop and local soil conditions."
        )

    suitability_assessment = assess_crop_suitability(
        crop=crop,
        season=season,
        state=data["state"].strip(),
        district=data["district"].strip(),
    )

    weather = get_forecast(
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

        crop_name = crop.strip().lower()
        crop_messages = {
            "rice": "For rice, monitor field water levels and drainage according to the crop growth stage.",
            "wheat": "For wheat, monitor soil moisture and temperature, and check regional crop guidance.",
            "maize": "For maize, monitor heat and soil moisture, especially around flowering.",
            "cotton": "For cotton, monitor field drainage and inspect plants regularly for pest or disease symptoms.",
            "sugarcane": "For sugarcane, monitor soil moisture and drainage using local crop guidance.",
            "potato": "For potato, monitor wet conditions and crop health; seek local advice if disease symptoms appear.",
            "chickpea": "For chickpea, monitor excess moisture and field drainage after rainfall.",
        }
        weather_advice.append(
            crop_messages.get(
                crop_name,
                f"For {crop_name}, check regional crop guidance and monitor field conditions; weather alone cannot determine crop needs.",
            )
        )

        weather["crop_context"] = {
            "predicted_crop": crop_name,
            "basis": "General precautionary screening, not a validated crop-stage model.",
        }
        weather["advice"] = weather_advice
    else:
        weather["advice"] = [
            weather.get("error", "Weather forecast is unavailable."),
            "No live weather values were used in this advisory.",
        ]

    return Response(
        {
            "status": "success",
            "location": {
                "state": data["state"].strip(),
                "district": data["district"].strip(),
            },
            "season": {
                "value": season,
                "context": SEASON_CONTEXT[season],
                "basis": "General seasonal context, not a district-specific crop calendar.",
            },
            "crop_prediction": {
                "crop": crop,
                "confidence": round(confidence, 4),
                "confidence_percent": round(confidence * 100, 2),
                "model_features_used": FEATURES,
            },
            "suitability_assessment": suitability_assessment,
            "soil_screening": {
                "ph_value": values["ph"],
                "flags": soil_flags,
                "note": (
                    "This is basic screening, not a soil-health diagnosis "
                    "or fertilizer prescription."
                ),
            },
            "weather": weather,
            "model_evaluation": {
                "held_out_test_accuracy_percent": round(
                    TEST_ACCURACY * 100, 2
                ),
                "test_rows": ARTIFACT["test_rows"],
                "dataset_source": ARTIFACT["dataset_source"],
            },
            "limitations": [
                "State, district and season are not features used by the trained model.",
                "Live seven-day weather is retrieved from Open-Meteo when available.",
                "Weather forecasts can be incomplete or change; confirm important decisions with local advisories.",
                "Model evaluation is based on a held-out split of its dataset and does not establish real-farm accuracy.",
                "Confirm decisions using a local soil test, official weather forecasts and regional agricultural guidance.",
            ],
        },
        status=status.HTTP_200_OK,
    )
