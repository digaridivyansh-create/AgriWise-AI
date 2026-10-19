from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SavedFarm, RecommendationHistory


FARM_FIELDS = {
    "name",
    "location",
    "soil_type",
    "nitrogen",
    "phosphorus",
    "potassium",
    "ph",
}


def farm_data(farm):
    return {
        "id": farm.pk,
        "name": farm.name,
        "location": farm.location,
        "soil_type": farm.soil_type,
        "nitrogen": farm.nitrogen,
        "phosphorus": farm.phosphorus,
        "potassium": farm.potassium,
        "ph": farm.ph,
        "created_at": farm.created_at,
        "updated_at": farm.updated_at,
    }


def history_data(item):
    return {
        "id": item.pk,
        "farm_id": item.farm_id,
        "recommendation_type": item.recommendation_type,
        "inputs": item.inputs,
        "result": item.result,
        "created_at": item.created_at,
    }


def validate_farm_payload(data, partial=False):
    if not isinstance(data, dict):
        return "Expected a JSON object."

    if not partial and not isinstance(data.get("name"), str):
        return "A farm name is required."

    if "name" in data:
        if not isinstance(data["name"], str) or not data["name"].strip():
            return "Farm name must be a non-empty string."
        if len(data["name"].strip()) > 120:
            return "Farm name must be 120 characters or fewer."

    for field in ("location", "soil_type"):
        if field in data:
            if not isinstance(data[field], str):
                return f"{field} must be a string."
            max_length = 255 if field == "location" else 80
            if len(data[field]) > max_length:
                return f"{field} must be {max_length} characters or fewer."

    for field in ("nitrogen", "phosphorus", "potassium", "ph"):
        if field in data and data[field] is not None:
            if isinstance(data[field], bool) or not isinstance(data[field], (int, float)):
                return f"{field} must be a number or null."
            value = float(data[field])
            if value != value or value in (float("inf"), float("-inf")):
                return f"{field} must be a finite number."
            if field == "ph" and not 0 <= value <= 14:
                return "ph must be between 0 and 14."

    unknown = set(data.keys()) - FARM_FIELDS
    if unknown:
        return "Unsupported fields: " + ", ".join(sorted(unknown))

    return None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def farms(request):
    if request.method == "GET":
        queryset = SavedFarm.objects.filter(user=request.user)
        return Response([farm_data(item) for item in queryset])

    error = validate_farm_payload(request.data)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    values = {
        key: value.strip() if isinstance(value, str) and key in ("name", "location", "soil_type") else value
        for key, value in request.data.items()
    }

    try:
        farm = SavedFarm.objects.create(user=request.user, **values)
    except IntegrityError:
        return Response(
            {"error": "You already have a farm with that name."},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(farm_data(farm), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def farm_detail(request, farm_id):
    farm = get_object_or_404(SavedFarm, pk=farm_id, user=request.user)

    if request.method == "GET":
        return Response(farm_data(farm))

    if request.method == "DELETE":
        farm.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    error = validate_farm_payload(request.data, partial=True)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    values = {
        key: value.strip() if isinstance(value, str) and key in ("name", "location", "soil_type") else value
        for key, value in request.data.items()
    }

    for key, value in values.items():
        setattr(farm, key, value)

    try:
        farm.save()
    except IntegrityError:
        return Response(
            {"error": "You already have a farm with that name."},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(farm_data(farm))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def recommendation_history(request):
    if request.method == "GET":
        queryset = RecommendationHistory.objects.filter(user=request.user)
        return Response([history_data(item) for item in queryset])

    data = request.data
    if not isinstance(data, dict):
        return Response(
            {"error": "Expected a JSON object."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed = {"farm_id", "recommendation_type", "inputs", "result"}
    unknown = set(data.keys()) - allowed
    if unknown:
        return Response(
            {"error": "Unsupported fields: " + ", ".join(sorted(unknown))},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recommendation_type = data.get("recommendation_type", "crop")
    inputs = data.get("inputs", {})
    result = data.get("result", {})
    farm_id = data.get("farm_id")

    if not isinstance(recommendation_type, str) or not recommendation_type.strip():
        return Response(
            {"error": "recommendation_type must be a non-empty string."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(recommendation_type) > 60:
        return Response(
            {"error": "recommendation_type must be 60 characters or fewer."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not isinstance(inputs, dict) or not isinstance(result, dict):
        return Response(
            {"error": "inputs and result must be JSON objects."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    farm = None
    if farm_id is not None:
        farm = get_object_or_404(SavedFarm, pk=farm_id, user=request.user)

    item = RecommendationHistory.objects.create(
        user=request.user,
        farm=farm,
        recommendation_type=recommendation_type.strip(),
        inputs=inputs,
        result=result,
    )

    return Response(history_data(item), status=status.HTTP_201_CREATED)
