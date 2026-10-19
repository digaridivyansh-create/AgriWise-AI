"""Conservative crop suitability screening.

This module deliberately does not claim to validate crop suitability.
It reports whether enough verified information is available to assess it.
"""

SUPPORTED_SEASONS = {"kharif", "rabi", "zaid"}


def assess_crop_suitability(crop, season, state, district):
    """Return a transparent preliminary screening result.

    Crop prediction, season, and location alone are not sufficient to
    establish agronomic suitability. Until verified regional crop-calendar
    rules are configured, return insufficient_data rather than guessing.
    """
    normalized_crop = str(crop).strip().lower()
    normalized_season = str(season).strip().lower()
    normalized_state = str(state).strip()
    normalized_district = str(district).strip()

    if not normalized_crop:
        raise ValueError("crop must not be empty")

    if normalized_season not in SUPPORTED_SEASONS:
        raise ValueError("season must be kharif, rabi, or zaid")

    if not normalized_state or not normalized_district:
        raise ValueError("state and district must not be empty")

    return {
        "status": "insufficient_data",
        "crop": normalized_crop,
        "season": normalized_season,
        "location": {
            "state": normalized_state,
            "district": normalized_district,
        },
        "reason": (
            "No verified crop-calendar rule is configured for this "
            "crop, season, and district combination."
        ),
        "required_checks": [
            "Regional crop calendar and sowing window",
            "Soil type and laboratory soil-test results",
            "Water availability and irrigation access",
            "Locally recommended crop variety",
        ],
        "basis": "Conservative screening; not a validated agronomic diagnosis.",
    }
