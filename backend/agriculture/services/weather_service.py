import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def get_forecast(district, state):
    """Fetch a real Open-Meteo forecast for a geocoded Indian district."""
    try:
        location_response = requests.get(
            GEOCODING_URL,
            params={
                "name": district,
                "count": 10,
                "language": "en",
                "format": "json",
            },
            timeout=10,
        )
        location_response.raise_for_status()
        locations = location_response.json().get("results", [])

        state_lower = state.strip().casefold()
        district_lower = district.strip().casefold()

        matches = [
            item for item in locations
            if item.get("name", "").casefold() == district_lower
            and item.get("country_code") == "IN"
            and state_lower in (
                item.get("admin1", "").casefold(),
                item.get("admin2", "").casefold(),
            )
        ]

        if not matches:
            return {
                "status": "unavailable",
                "source": "Open-Meteo",
                "error": (
                    "Could not verify a matching Indian district and state. "
                    "Please check the spelling or provide coordinates."
                ),
            }

        location = matches[0]

        forecast_response = requests.get(
            FORECAST_URL,
            params={
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "daily": (
                    "temperature_2m_max,"
                    "temperature_2m_min,"
                    "precipitation_sum,"
                    "precipitation_probability_max"
                ),
                "timezone": "Asia/Kolkata",
                "forecast_days": 7,
            },
            timeout=15,
        )
        forecast_response.raise_for_status()
        payload = forecast_response.json()

        daily = payload.get("daily", {})
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        rain_mm = daily.get("precipitation_sum", [])
        rain_prob = daily.get("precipitation_probability_max", [])

        if not dates or not all(
            len(items) == len(dates)
            for items in (max_temps, min_temps, rain_mm, rain_prob)
        ):
            return {
                "status": "unavailable",
                "source": "Open-Meteo",
                "error": "Forecast response was incomplete.",
            }

        forecast_days = []
        for index, date in enumerate(dates):
            forecast_days.append({
                "date": date,
                "temperature_max_c": max_temps[index],
                "temperature_min_c": min_temps[index],
                "precipitation_mm": rain_mm[index],
                "precipitation_probability_percent": rain_prob[index],
            })

        return {
            "status": "live_forecast",
            "source": "Open-Meteo",
            "location": {
                "name": location.get("name"),
                "state": location.get("admin1"),
                "country": location.get("country"),
                "latitude": payload.get("latitude"),
                "longitude": payload.get("longitude"),
                "timezone": payload.get("timezone"),
            },
            "forecast_days": forecast_days,
            "advice": [],
        }

    except (requests.RequestException, ValueError, KeyError, TypeError):
        return {
            "status": "unavailable",
            "source": "Open-Meteo",
            "error": (
                "Weather service could not be reached or returned invalid "
                "data. Try again later."
            ),
        }
