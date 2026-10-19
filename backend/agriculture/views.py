from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .services.crop_service import recommend_crop as run_crop_recommendation
from .services.advisory_service import generate_crop_advisory


@api_view(["GET"])
def health_check(request):
    return Response({
        "status": "healthy",
        "project": "AgriWise AI",
        "message": "Agriculture decision system backend is running",
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crop_recommendation(request):
    return run_crop_recommendation(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crop_advisory(request):
    return generate_crop_advisory(request)


from .services.disease_service import detect_crop_disease


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def disease_detection(request):
    return detect_crop_disease(request)

from .services.plant_service import identify_plant as run_plant_identification


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def plant_identification(request):
    return run_plant_identification(request)
from rest_framework import status as http_status


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def plant_health(request):
    import logging

    logger = logging.getLogger(__name__)
    image = request.FILES.get("image")

    # EARLY_IMAGE_VALIDATION: reject invalid uploads before calling AI services.
    from PIL import Image, UnidentifiedImageError

    max_image_bytes = 8 * 1024 * 1024
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    allowed_formats = {"JPEG", "PNG", "WEBP"}

    if image is None:
        return Response(
            {"error": "Upload an image using the 'image' field."},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    if image.size <= 0 or image.size > max_image_bytes:
        return Response(
            {"error": "Image must be non-empty and no larger than 8 MB."},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    content_type = (getattr(image, "content_type", "") or "").lower()
    if content_type not in allowed_types:
        return Response(
            {"error": "Supported image types are JPEG, PNG and WEBP."},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    try:
        image.seek(0)
        with Image.open(image) as opened_image:
            if opened_image.format not in allowed_formats:
                return Response(
                    {"error": "File content must be a JPEG, PNG or WEBP image."},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )
            opened_image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return Response(
            {"error": "The uploaded file is not a valid supported image."},
            status=http_status.HTTP_400_BAD_REQUEST,
        )
    finally:
        image.seek(0)

    results = {}

    try:
        image.seek(0)
        plant_response = run_plant_identification(request)
        results["plant_identification"] = {
            "http_status": plant_response.status_code,
            "data": plant_response.data,
        }
    except Exception:
        logger.exception("Plant identification failed in plant_health.")
        results["plant_identification"] = {
            "http_status": 500,
            "error": "Plant identification could not be completed.",
        }

    try:
        image.seek(0)
        disease_response = detect_crop_disease(request)
        results["disease_detection"] = {
            "http_status": disease_response.status_code,
            "data": disease_response.data,
        }
    except Exception:
        logger.exception("Disease detection failed in plant_health.")
        results["disease_detection"] = {
            "http_status": 500,
            "error": "Disease detection could not be completed.",
        }

    plant_result = results["plant_identification"]
    disease_result = results["disease_detection"]

    plant_data = plant_result.get("data", {})
    disease_data = disease_result.get("data", {})

    matches = plant_data.get("matches", [])
    prediction = disease_data.get("prediction")
    if not isinstance(prediction, dict):
        prediction = {}

    identified_species = (
        matches[0].get("scientific_name")
        if matches and isinstance(matches[0], dict)
        else None
    )
    identified_crop = prediction.get("crop")

    consistency = {
        "status": "not_assessed",
        "identified_species": identified_species,
        "disease_model_crop": identified_crop,
        "message": (
            "Crop consistency could not be assessed because one or both "
            "services did not return usable results."
        ),
    }

    if identified_species and identified_crop:
        species_key = identified_species.lower().replace("_", " ")
        crop_key = identified_crop.lower().strip()

        # Conservative name comparison; this is not botanical verification.
        species_genus = species_key.split()[0]
        crop_aliases = {
            "tomato": {"solanum"},
            "potato": {"solanum"},
            "apple": {"malus"},
            "grape": {"vitis"},
            "corn (maize)": {"zea"},
            "maize": {"zea"},
            "strawberry": {"fragaria"},
            "cherry": {"prunus"},
            "peach": {"prunus"},
            "pepper": {"capsicum"},
            "bell pepper": {"capsicum"},
            "orange": {"citrus"},
            "lemon": {"citrus"},
        }

        expected_genera = crop_aliases.get(crop_key)

        if expected_genera is None:
            consistency["status"] = "not_assessed"
            consistency["message"] = (
                "No configured species-to-crop mapping exists for this crop; "
                "the results were not automatically compared."
            )
        elif species_genus in expected_genera:
            consistency["status"] = "consistent"
            consistency["message"] = (
                "The top species match is broadly consistent with the crop "
                "predicted by the disease model. This does not confirm identity."
            )
        else:
            consistency["status"] = "possible_mismatch"
            consistency["message"] = (
                "The top species match may not agree with the crop predicted "
                "by the disease model. Retake the image and verify the crop "
                "before relying on the disease result."
            )

    plant_ok = plant_result.get("http_status", 500) < 400
    disease_ok = disease_result.get("http_status", 500) < 400

    if plant_ok and disease_ok:
        overall_status = "success"
    elif plant_ok or disease_ok:
        overall_status = "partial_success"
    else:
        overall_status = "failed"

    return Response({
        "status": overall_status,
        "message": (
            "AI screening results only. Species identification and disease "
            "predictions are not confirmed diagnoses."
        ),
        "crop_consistency": consistency,
        "results": results,
    })

from .services.market_service import get_market_prices
from .services.market_analytics_service import build_market_analytics


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def market_metadata(request):
    from .services.market_metadata_service import get_market_metadata
    return get_market_metadata()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def market_prices(request):
    return get_market_prices(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def market_analytics(request):
    if not isinstance(request.data, dict):
        return Response(
            {"error": "Request body must be a JSON object."},
            status=400,
        )

    from .services.market_service import get_market_prices

    response = get_market_prices(request)

    if response.status_code != 200:
        return response

    data = response.data
    analytics = build_market_analytics(data.get("records", []))

    analytics["filters"] = data.get("filters", {})
    analytics["source"] = data.get("source", {})
    analytics["provider_latest_observed_date"] = data.get(
        "latest_observed_date"
    )

    return Response(analytics, status=200)





