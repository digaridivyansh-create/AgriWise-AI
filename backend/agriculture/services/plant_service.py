import logging
import os

import requests
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

PLANTNET_URL = "https://my-api.plantnet.org/v2/identify/all"
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


def identify_plant(request):
    api_key = os.environ.get("PLANTNET_API_KEY")
    if not api_key:
        return Response(
            {"error": "Plant identification is not configured on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    image = request.FILES.get("image")
    if image is None:
        return Response(
            {"error": "Upload an image using the 'image' field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image.size == 0 or image.size > MAX_IMAGE_BYTES:
        return Response(
            {"error": "Image must be non-empty and no larger than 8 MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        return Response(
            {"error": "Supported image types are JPEG, PNG and WEBP."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    organ = request.data.get("organ", "auto")
    allowed_organs = {"auto", "leaf", "flower", "fruit", "bark"}
    if organ not in allowed_organs:
        return Response(
            {"error": "organ must be auto, leaf, flower, fruit or bark."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        files = {
            "images": (
                getattr(image, "name", "plant-image"),
                image,
                content_type,
            )
        }
        data = {} if organ == "auto" else {"organs": organ}

        upstream = requests.post(
            PLANTNET_URL,
            params={"api-key": api_key},
            files=files,
            data=data,
            timeout=(10, 60),
        )

        if upstream.status_code in (401, 403):
            return Response(
                {"error": "Plant identification authentication failed."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if upstream.status_code == 429:
            return Response(
                {"error": "Plant identification rate limit reached. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not upstream.ok:
            logger.warning(
                "PlantNet returned HTTP %s", upstream.status_code
            )
            return Response(
                {"error": "The plant identification provider could not process the image."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = upstream.json()
        matches = []

        for result in payload.get("results", [])[:5]:
            species = result.get("species", {})
            matches.append({
                "scientific_name": (
                    species.get("scientificNameWithoutAuthor")
                    or species.get("scientificName")
                    or "Unknown"
                ),
                "common_names": species.get("commonNames", [])[:5],
                "score": result.get("score"),
            })

        return Response({
            "status": "success",
            "provider": "Pl@ntNet",
            "identification_confirmed": False,
            "message": (
                "These are ranked species matches, not guaranteed diagnoses. "
                "Verify the species before using it for disease advice."
            ),
            "matches": matches,
        })

    except requests.Timeout:
        return Response(
            {"error": "Plant identification timed out. Please try again."},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except requests.RequestException:
        logger.exception("PlantNet request failed")
        return Response(
            {"error": "Could not contact the plant identification provider."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (ValueError, TypeError):
        logger.exception("Invalid PlantNet response")
        return Response(
            {"error": "The plant identification provider returned an invalid response."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
