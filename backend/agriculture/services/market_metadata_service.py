import hashlib
import logging
import os

from django.core.cache import cache

import requests
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

CEDA_BASE_URL = "https://api.ceda.ashoka.edu.in/v1/agmarknet"
METADATA_TIMEOUT = (5, 20)
METADATA_CACHE_TIMEOUT_SECONDS = 1800


def get_market_metadata():
    cache_key = "ceda_market_metadata:v1"
    cached_data = cache.get(cache_key)
    if isinstance(cached_data, dict):
        logger.debug("Serving cached CEDA market metadata.")
        return Response(cached_data, status=status.HTTP_200_OK)

    api_key = os.getenv("CEDA_API_KEY")
    if not api_key:
        return Response(
            {
                "error": "Market data service is not configured.",
                "message": "Configure CEDA_API_KEY in the backend environment.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    result = {}

    for resource in ("commodities", "geographies"):
        try:
            response = requests.get(
                f"{CEDA_BASE_URL}/{resource}",
                headers=headers,
                timeout=METADATA_TIMEOUT,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.Timeout:
            return Response(
                {"error": f"CEDA {resource} metadata request timed out."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.HTTPError as exc:
            upstream_response = exc.response
            if upstream_response is not None and upstream_response.status_code == 429:
                retry_after = upstream_response.headers.get("Retry-After", "").strip()

                # Use the last successful metadata only as a clearly labeled fallback.
                stale_data = cache.get("ceda_market_metadata:last_success:v1")
                if isinstance(stale_data, dict):
                    stale_data = dict(stale_data)
                    stale_source = dict(stale_data.get("source", {}))
                    stale_source["cache_status"] = "stale_fallback"
                    stale_source["stale"] = True
                    stale_source["note"] = (
                        "CEDA is rate-limiting requests. These are the last "
                        "successfully retrieved metadata values and may be outdated."
                    )
                    stale_data["source"] = stale_source
                    logger.warning(
                        "Serving previously successful CEDA metadata after a rate limit."
                    )
                    return Response(stale_data, status=status.HTTP_200_OK)

                response = Response(
                    {
                        "error": f"CEDA rate limit reached while retrieving {resource} metadata.",
                        "retry_after_seconds": int(retry_after) if retry_after.isdigit() else None,
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
                if retry_after.isdigit():
                    response["Retry-After"] = retry_after
                return response

            logger.warning(
                "CEDA %s metadata request returned HTTP %s.",
                resource,
                upstream_response.status_code if upstream_response is not None else "unknown",
            )
            return Response(
                {"error": f"CEDA could not provide {resource} metadata."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except requests.RequestException:
            logger.exception("CEDA %s metadata request failed.", resource)
            return Response(
                {"error": f"Could not retrieve CEDA {resource} metadata."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            return Response(
                {"error": f"CEDA returned invalid {resource} metadata JSON."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        output = payload.get("output") if isinstance(payload, dict) else None
        data = output.get("data") if isinstance(output, dict) else None

        if (
            not isinstance(output, dict)
            or output.get("type") != "success"
            or not isinstance(data, list)
        ):
            return Response(
                {"error": f"CEDA returned an unexpected {resource} metadata format."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        result[resource] = data

    commodities = []
    for item in result["commodities"]:
        if not isinstance(item, dict):
            continue
        commodity_id = item.get("commodity_id")
        name = item.get("commodity_name")
        if isinstance(commodity_id, int) and isinstance(name, str) and name.strip():
            commodities.append({
                "commodity_id": commodity_id,
                "commodity_name": name.strip(),
            })

    geographies = []
    for item in result["geographies"]:
        if not isinstance(item, dict):
            continue
        state_id = item.get("census_state_id")
        state_name = item.get("census_state_name")
        district_id = item.get("census_district_id")
        district_name = item.get("census_district_name")

        if (
            isinstance(state_id, int)
            and isinstance(state_name, str)
            and isinstance(district_id, int)
            and isinstance(district_name, str)
            and state_name.strip()
            and district_name.strip()
        ):
            geographies.append({
                "state_id": state_id,
                "state_name": state_name.strip(),
                "district_id": district_id,
                "district_name": district_name.strip(),
            })

    states_by_id = {}
    for row in geographies:
        states_by_id[row["state_id"]] = row["state_name"]

    states = [
        {"state_id": state_id, "state_name": name}
        for state_id, name in sorted(
            states_by_id.items(), key=lambda pair: pair[1].casefold()
        )
    ]

    commodities.sort(key=lambda row: row["commodity_name"].casefold())
    geographies.sort(
        key=lambda row: (
            row["state_name"].casefold(),
            row["district_name"].casefold(),
        )
    )

    response_data = {
        "status": "success",
        "counts": {
            "commodities": len(commodities),
            "states": len(states),
            "districts": len(geographies),
        },
        "commodities": commodities,
        "states": states,
        "geographies": geographies,
        "source": {
            "name": "CEDA Agri Market Data (CEDA-AMD)",
            "url": "https://ceda.ashoka.edu.in/agmarknet",
            "note": (
                "Identifiers come from CEDA metadata. Market price records "
                "may be historical or delayed; check observation dates."
            ),
        },
    }
    response_data["source"]["cache_status"] = "fresh"
    response_data["source"]["stale"] = False

    # Short-lived cache for normal reads and durable cache for rate-limit fallback.
    cache.set(cache_key, response_data, timeout=METADATA_CACHE_TIMEOUT_SECONDS)
    cache.set("ceda_market_metadata:last_success:v1", response_data, timeout=None)
    return Response(response_data, status=status.HTTP_200_OK)
