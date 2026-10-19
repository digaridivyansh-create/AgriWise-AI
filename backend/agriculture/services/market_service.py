import hashlib
import json
import logging
import os
from datetime import date

from django.core.cache import cache

import requests
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

CEDA_PRICES_URL = "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"
CEDA_SOURCE_NAME = "CEDA Agri Market Data (CEDA-AMD), 2000-2023"
CEDA_SOURCE_URL = "https://ceda.ashoka.edu.in/agmarknet"
MAX_DATE_RANGE_DAYS = 366
MARKET_CACHE_TIMEOUT_SECONDS = 900


def _positive_integer(value, field_name, errors, allow_zero=False):
    if isinstance(value, bool):
        errors[field_name] = "Must be an integer."
        return None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        errors[field_name] = "Must be an integer."
        return None

    if str(value).strip() != str(parsed):
        errors[field_name] = "Must be a whole integer."
        return None

    minimum = 0 if allow_zero else 1
    if parsed < minimum:
        errors[field_name] = (
            "Must be zero or greater." if allow_zero else "Must be greater than zero."
        )
        return None

    return parsed


def _parse_date(value, field_name, errors):
    if not isinstance(value, str):
        errors[field_name] = "Use YYYY-MM-DD format."
        return None

    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        errors[field_name] = "Use a valid YYYY-MM-DD date."
        return None

    if parsed.isoformat() != value:
        errors[field_name] = "Use YYYY-MM-DD format."
        return None

    return parsed


def get_market_prices(request):
    if not isinstance(request.data, dict):
        return Response(
            {"error": "Request body must be a JSON object."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = request.data
    errors = {}

    commodity_id = _positive_integer(
        payload.get("commodity_id"), "commodity_id", errors
    )
    state_id = _positive_integer(payload.get("state_id"), "state_id", errors)

    raw_district_ids = payload.get("district_id")
    if not isinstance(raw_district_ids, list) or not raw_district_ids:
        errors["district_id"] = "Provide a non-empty array of district IDs."
        district_ids = None
    else:
        district_ids = []
        for index, value in enumerate(raw_district_ids):
            parsed = _positive_integer(
                value, f"district_id[{index}]", errors
            )
            if parsed is not None:
                district_ids.append(parsed)

    raw_market_ids = payload.get("market_id", [])
    if not isinstance(raw_market_ids, list):
        errors["market_id"] = "Provide an array of market IDs."
        market_ids = None
    else:
        market_ids = []
        for index, value in enumerate(raw_market_ids):
            parsed = _positive_integer(
                value, f"market_id[{index}]", errors, allow_zero=False
            )
            if parsed is not None:
                market_ids.append(parsed)

    from_date = _parse_date(payload.get("from_date"), "from_date", errors)
    to_date = _parse_date(payload.get("to_date"), "to_date", errors)

    if from_date and to_date:
        if from_date > to_date:
            errors["to_date"] = "Must be on or after from_date."
        elif (to_date - from_date).days > MAX_DATE_RANGE_DAYS:
            errors["to_date"] = (
                f"Date range must not exceed {MAX_DATE_RANGE_DAYS + 1} calendar days."
            )

    if errors:
        return Response(
            {"error": "Invalid input", "fields": errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    api_key = os.getenv("CEDA_API_KEY")
    if not api_key:
        return Response(
            {
                "error": "Market data service is not configured.",
                "message": "Configure CEDA_API_KEY in the backend environment.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    body = {
        "commodity_id": commodity_id,
        "state_id": state_id,
        "district_id": district_ids,
        "market_id": market_ids,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
    }

    cache_fingerprint = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    cache_key = f"ceda_market_prices:{cache_fingerprint}"
    cached_data = cache.get(cache_key)
    if isinstance(cached_data, dict):
        logger.debug("Serving cached CEDA market prices.")
        return Response(cached_data, status=status.HTTP_200_OK)

    try:
        upstream = requests.post(
            CEDA_PRICES_URL,
            json=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
            timeout=(5, 20),
        )
    except requests.Timeout:
        return Response(
            {"error": "CEDA market data request timed out. Please try again."},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except requests.RequestException:
        logger.exception("CEDA market data request failed.")
        return Response(
            {"error": "Could not connect to the market data provider."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if upstream.status_code in (401, 403):
        logger.warning("CEDA rejected market data credentials (HTTP %s).", upstream.status_code)
        return Response(
            {"error": "CEDA authentication failed. Check the configured API key."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if upstream.status_code == 429:
        response = Response(
            {
                "error": "CEDA rate limit reached. Please wait before trying again.",
                "retry_after_seconds": (
                    int(upstream.headers["Retry-After"])
                    if upstream.headers.get("Retry-After", "").strip().isdigit()
                    else None
                ),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        retry_after = upstream.headers.get("Retry-After", "").strip()
        if retry_after.isdigit():
            response["Retry-After"] = retry_after
        return response

    if not upstream.ok:
        logger.warning("CEDA returned HTTP %s for market prices.", upstream.status_code)
        return Response(
            {"error": "CEDA could not fulfil the market data request."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    try:
        result = upstream.json()
    except ValueError:
        logger.error("CEDA returned invalid JSON for market prices.")
        return Response(
            {"error": "CEDA returned an unreadable response."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not isinstance(result, dict):
        return Response(
            {"error": "CEDA returned an unexpected response format."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    output = result.get("output")
    if not isinstance(output, dict):
        return Response(
            {"error": "CEDA returned an unexpected response format."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if output.get("type") != "success":
        logger.warning("CEDA reported an unsuccessful market data response.")
        return Response(
            {"error": "CEDA reported that the market data request was unsuccessful."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    records = output.get("data")
    if not isinstance(records, list):
        return Response(
            {"error": "CEDA returned an unexpected records format."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    observed_dates = [
        row.get("date")
        for row in records
        if isinstance(row, dict) and isinstance(row.get("date"), str)
    ]

    response_data = {
        "status": "success",
        "count": len(records),
        "filters": body,
        "records": records,
        "latest_observed_date": max(observed_dates) if observed_dates else None,
        "data_available": bool(records),
        "source": {
            "name": CEDA_SOURCE_NAME,
            "provider": "Centre for Economic Data & Analysis, Ashoka University",
            "url": CEDA_SOURCE_URL,
            "note": (
                "Market records may be historical or delayed. "
                "Check each record's date before making decisions. "
                "Data is provided without a guarantee of accuracy."
            ),
        },
    }
    cache.set(cache_key, response_data, timeout=MARKET_CACHE_TIMEOUT_SECONDS)
    return Response(response_data, status=status.HTTP_200_OK)
