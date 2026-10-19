import io

import numpy as np
from PIL import Image, ImageFilter
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from agriculture.services.disease_service import _estimate_blur


class DiseaseImageQualityTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    def test_blurred_image_has_lower_sharpness_score(self):
        pixels = np.zeros((256, 256), dtype=np.uint8)
        pixels[::2, :] = 255
        sharp_image = Image.fromarray(pixels).convert("RGB")
        blurred_image = sharp_image.filter(
            ImageFilter.GaussianBlur(radius=8)
        )

        sharp_score = _estimate_blur(sharp_image)
        blurred_score = _estimate_blur(blurred_image)

        self.assertGreater(sharp_score, blurred_score)
        self.assertLess(blurred_score, 50.0)

    def test_missing_image_returns_400(self):
        response = self.client.post(
            "/api/disease-detection/",
            data={},
        )

        self.assertEqual(response.status_code, 400)

    def test_invalid_image_returns_400(self):
        upload = SimpleUploadedFile(
            "not_an_image.jpg",
            b"This is not a real image.",
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/disease-detection/",
            data={"image": upload},
        )

        self.assertEqual(response.status_code, 400)

    def test_valid_image_returns_successful_api_response(self):
        buffer = io.BytesIO()
        image = Image.effect_noise((256, 256), 100).convert("RGB")
        image.save(buffer, format="JPEG")

        upload = SimpleUploadedFile(
            "test_leaf.jpg",
            buffer.getvalue(),
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/disease-detection/",
            data={"image": upload},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("image_quality", response.data)
        self.assertIn("uncertain", response.data)

class PlantHealthValidationTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    def test_missing_image_returns_400(self):
        response = self.client.post("/api/plant-health/", data={})

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_unsupported_content_type_returns_400(self):
        upload = SimpleUploadedFile(
            "test.txt",
            b"This is not an image",
            content_type="text/plain",
        )

        response = self.client.post(
            "/api/plant-health/",
            data={"image": upload},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_invalid_image_content_returns_400(self):
        upload = SimpleUploadedFile(
            "fake.jpg",
            b"This is not a real JPEG image",
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/plant-health/",
            data={"image": upload},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

from unittest.mock import patch


class PlantHealthCombinedEndpointTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    def make_image(self):
        buffer = io.BytesIO()
        Image.new("RGB", (64, 64), color="green").save(
            buffer, format="JPEG"
        )
        return SimpleUploadedFile(
            "leaf.jpg", buffer.getvalue(), content_type="image/jpeg"
        )

    @patch("agriculture.views.detect_crop_disease")
    @patch("agriculture.views.run_plant_identification")
    def test_partial_success_when_plant_identification_fails(
        self, mock_plant, mock_disease
    ):
        from rest_framework.response import Response
        from rest_framework import status

        mock_plant.return_value = Response(
            {"error": "Provider unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        mock_disease.return_value = Response(
            {"status": "success", "prediction": None, "uncertain": True},
            status=status.HTTP_200_OK,
        )

        response = self.client.post(
            "/api/plant-health/", {"image": self.make_image()}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "partial_success")
        self.assertEqual(
            response.data["results"]["plant_identification"]["http_status"],
            503,
        )
        mock_disease.assert_called_once()

    @patch("agriculture.views.detect_crop_disease")
    @patch("agriculture.views.run_plant_identification")
    def test_partial_success_when_disease_detection_fails(
        self, mock_plant, mock_disease
    ):
        from rest_framework.response import Response
        from rest_framework import status

        mock_plant.return_value = Response(
            {
                "status": "success",
                "matches": [{
                    "scientific_name": "Solanum lycopersicum",
                    "score": 0.9,
                }],
            },
            status=status.HTTP_200_OK,
        )
        mock_disease.return_value = Response(
            {"error": "Model unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

        response = self.client.post(
            "/api/plant-health/", {"image": self.make_image()}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "partial_success")
        self.assertEqual(
            response.data["results"]["disease_detection"]["http_status"],
            503,
        )
        mock_plant.assert_called_once()

    @patch("agriculture.views.detect_crop_disease")
    @patch("agriculture.views.run_plant_identification")
    def test_failed_when_both_services_fail(
        self, mock_plant, mock_disease
    ):
        from rest_framework.response import Response
        from rest_framework import status

        mock_plant.return_value = Response(
            {"error": "Plant service unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        mock_disease.return_value = Response(
            {"error": "Disease service unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

        response = self.client.post(
            "/api/plant-health/", {"image": self.make_image()}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "failed")
        mock_plant.assert_called_once()
        mock_disease.assert_called_once()



class CropAdvisoryTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    def valid_payload(self):
        return {
            "nitrogen": 90,
            "phosphorus": 42,
            "potassium": 43,
            "temperature": 25.5,
            "humidity": 80,
            "ph": 6.5,
            "rainfall": 200,
            "state": "Uttar Pradesh",
            "district": "Ghaziabad",
            "season": "rabi",
        }

    def test_missing_rainfall_returns_400(self):
        payload = self.valid_payload()
        del payload["rainfall"]
        response = self.client.post(
            "/api/crop-advisory/", payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("rainfall", response.data["fields"])

    def test_invalid_season_returns_400(self):
        payload = self.valid_payload()
        payload["season"] = "monsoon"
        response = self.client.post(
            "/api/crop-advisory/", payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("season", response.data["fields"])

    @patch(
        "agriculture.services.advisory_service.get_forecast",
        return_value={
            "status": "unavailable",
            "source": "Open-Meteo",
            "error": "Weather service unavailable for this test.",
        },
    )
    def test_advisory_succeeds_when_weather_is_unavailable(
        self, mock_forecast
    ):
        response = self.client.post(
            "/api/crop-advisory/", self.valid_payload(),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(
            response.data["weather"]["status"], "unavailable"
        )
        self.assertTrue(
            any(
                "No live weather values were used" in message
                for message in response.data["weather"]["advice"]
            )
        )
        mock_forecast.assert_called_once_with(
            "Ghaziabad", "Uttar Pradesh"
        )


class CropSuitabilityServiceTests(TestCase):
    def test_valid_inputs_return_insufficient_data(self):
        from agriculture.services.suitability_service import (
            assess_crop_suitability,
        )

        result = assess_crop_suitability(
            crop="rice",
            season="rabi",
            state="Uttar Pradesh",
            district="Ghaziabad",
        )

        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["crop"], "rice")
        self.assertEqual(result["season"], "rabi")
        self.assertTrue(result["required_checks"])

    def test_invalid_season_is_rejected(self):
        from agriculture.services.suitability_service import (
            assess_crop_suitability,
        )

        with self.assertRaises(ValueError):
            assess_crop_suitability(
                crop="rice",
                season="monsoon",
                state="Uttar Pradesh",
                district="Ghaziabad",
            )

    def test_missing_location_is_rejected(self):
        from agriculture.services.suitability_service import (
            assess_crop_suitability,
        )

        with self.assertRaises(ValueError):
            assess_crop_suitability(
                crop="rice",
                season="rabi",
                state="Uttar Pradesh",
                district="",
            )

import os
from unittest.mock import Mock, patch

import requests
from django.test import TestCase


class MarketPricesEndpointTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    endpoint = "/api/market-prices/"

    valid_payload = {
        "commodity_id": 3,
        "state_id": 9,
        "district_id": [183],
        "market_id": [],
        "from_date": "2025-09-01",
        "to_date": "2025-09-30",
    }

    sample_record = {
        "date": "2025-09-30",
        "commodity_id": 3,
        "census_state_id": 9,
        "census_district_id": 183,
        "market_id": 684,
        "min_price": 2900,
        "max_price": 3020,
        "modal_price": 3000,
    }

    def _upstream_response(self, records):
        response = Mock()
        response.status_code = 200
        response.ok = True
        response.json.return_value = {
            "output": {
                "type": "success",
                "data": records,
            }
        }
        return response

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_valid_request_returns_market_records(self, mock_post):
        mock_post.return_value = self._upstream_response(
            [self.sample_record]
        )

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["records"], [self.sample_record])
        self.assertEqual(
            response.data["latest_observed_date"], "2025-09-30"
        )
        self.assertTrue(response.data["data_available"])

        sent = mock_post.call_args
        self.assertEqual(
            sent.kwargs["headers"]["Authorization"],
            "Bearer test-key",
        )
        self.assertEqual(
            sent.kwargs["json"]["commodity_id"], 3
        )

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_empty_records_are_successful_with_no_data(self, mock_post):
        mock_post.return_value = self._upstream_response([])

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["records"], [])
        self.assertIsNone(response.data["latest_observed_date"])
        self.assertFalse(response.data["data_available"])

    @patch("agriculture.services.market_service.requests.post")
    def test_invalid_payload_does_not_call_ceda(self, mock_post):
        payload = dict(self.valid_payload)
        payload["from_date"] = "not-a-date"

        response = self.client.post(
            self.endpoint,
            data=payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("from_date", response.data["fields"])
        mock_post.assert_not_called()

    @patch.dict(os.environ, {}, clear=True)
    @patch("agriculture.services.market_service.requests.post")
    def test_missing_api_key_returns_503(self, mock_post):
        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        mock_post.assert_not_called()

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_upstream_authentication_failure_returns_502(self, mock_post):
        upstream = Mock()
        upstream.status_code = 401
        upstream.ok = False
        mock_post.return_value = upstream

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("authentication failed", response.data["error"].lower())

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_upstream_timeout_returns_504(self, mock_post):
        mock_post.side_effect = requests.Timeout("simulated timeout")

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 504)
        self.assertIn("timed out", response.data["error"].lower())

from datetime import date

from django.test import SimpleTestCase

from agriculture.services.market_analytics_service import build_market_analytics


class MarketAnalyticsServiceTests(SimpleTestCase):
    def test_daily_trend_and_market_comparison(self):
        records = [
            {
                "date": "2025-09-01",
                "market_id": 684,
                "modal_price": 3000,
            },
            {
                "date": "2025-09-01",
                "market_id": 2605,
                "modal_price": 3100,
            },
            {
                "date": "2025-09-02",
                "market_id": 684,
                "modal_price": 3300,
            },
            {
                "date": "2025-09-02",
                "market_id": 2605,
                "modal_price": 3200,
            },
        ]

        result = build_market_analytics(
            records,
            as_of=date(2025, 9, 2),
        )

        self.assertEqual(result["summary"]["valid_records_count"], 4)
        self.assertEqual(result["summary"]["markets_count"], 2)
        self.assertEqual(
            result["daily_trend"][0]["average_modal_price"], 3050.0
        )
        self.assertEqual(
            result["daily_trend"][1]["average_modal_price"], 3250.0
        )
        self.assertEqual(
            result["daily_trend"][1]["change_percent_from_previous_day"],
            6.56,
        )
        self.assertFalse(result["freshness"]["is_stale"])

    def test_invalid_records_are_counted(self):
        records = [
            {
                "date": "2025-09-01",
                "market_id": 684,
                "modal_price": 3000,
            },
            {
                "date": "not-a-date",
                "market_id": 684,
                "modal_price": 3100,
            },
            {
                "date": "2025-09-02",
                "market_id": 684,
                "modal_price": -10,
            },
        ]

        result = build_market_analytics(
            records,
            as_of=date(2025, 9, 2),
        )

        self.assertEqual(result["summary"]["valid_records_count"], 1)
        self.assertEqual(result["summary"]["invalid_records_count"], 2)

    def test_empty_dataset_is_handled(self):
        result = build_market_analytics([], as_of=date(2025, 9, 2))

        self.assertFalse(result["data_available"])
        self.assertEqual(result["summary"]["valid_records_count"], 0)
        self.assertEqual(result["daily_trend"], [])
        self.assertEqual(result["market_comparison"], [])


class MarketAnalyticsEndpointTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        self.client = APIClient()
        user = get_user_model().objects.create_user(
            username="endpoint_test_user",
            password="AgriWise-Test-Password-742!",
        )
        self.client.force_authenticate(user=user)
    endpoint = "/api/market-analytics/"

    valid_payload = MarketPricesEndpointTests.valid_payload
    sample_record = MarketPricesEndpointTests.sample_record
    _upstream_response = MarketPricesEndpointTests._upstream_response

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_successful_response_contains_analytics(self, mock_post):
        mock_post.return_value = self._upstream_response(
            [self.sample_record]
        )

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["data_available"])
        self.assertEqual(
            response.data["summary"]["valid_records_count"], 1
        )
        self.assertEqual(
            response.data["provider_latest_observed_date"],
            "2025-09-30",
        )
        self.assertIn("freshness", response.data)
        mock_post.assert_called_once()

    @patch.dict(os.environ, {"CEDA_API_KEY": "test-key"})
    @patch("agriculture.services.market_service.requests.post")
    def test_upstream_failure_is_returned(self, mock_post):
        upstream = Mock()
        upstream.status_code = 401
        upstream.ok = False
        mock_post.return_value = upstream

        response = self.client.post(
            self.endpoint,
            data=self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("error", response.data)
        mock_post.assert_called_once()

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


User = get_user_model()


class AuthenticationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "AgriWise-Test-Password-742!"
        self.user = User.objects.create_user(
            username="test_farmer",
            email="farmer@example.com",
            password=self.password,
        )

    def test_signup_creates_user_and_returns_tokens(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "new_farmer",
                "email": "newfarmer@example.com",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="new_farmer").exists())
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_signup_rejects_duplicate_username(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "test_farmer",
                "email": "another@example.com",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_login_returns_tokens_for_valid_credentials(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "test_farmer",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_rejects_invalid_password(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "test_farmer",
                "password": "Wrong-Password!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_profile_requires_authentication(self):
        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, 401)

    def test_refresh_rotates_refresh_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "test_farmer",
                "password": self.password,
            },
            format="json",
        )
        refresh = login_response.data["refresh"]

        response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotEqual(response.data["refresh"], refresh)

    def test_logout_blacklists_refresh_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "test_farmer",
                "password": self.password,
            },
            format="json",
        )
        access = login_response.data["access"]
        refresh = login_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + access)
        logout_response = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(logout_response.status_code, 200)

        refresh_response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, 401)

    def test_logout_requires_authentication(self):
        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_profile_accepts_valid_access_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "test_farmer",
                "password": self.password,
            },
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + login_response.data["access"]
        )
        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "test_farmer")
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from agriculture.models import SavedFarm, RecommendationHistory


class AccountSecurityTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user_a = User.objects.create_user(
            username="farmer_a",
            email="farmer_a@example.com",
            password="TestPassword!234",
        )
        self.user_b = User.objects.create_user(
            username="farmer_b",
            email="farmer_b@example.com",
            password="TestPassword!234",
        )
        self.farm_a = SavedFarm.objects.create(
            user=self.user_a,
            name="North Field",
            location="Test Village",
            soil_type="Loamy",
        )
        self.farm_b = SavedFarm.objects.create(
            user=self.user_b,
            name="South Field",
        )

    def authenticate_as(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken

        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_farm_list_requires_authentication(self):
        response = self.client.get("/api/farms/")
        self.assertEqual(response.status_code, 401)

    def test_user_only_sees_their_own_farms(self):
        self.authenticate_as(self.user_a)

        response = self.client.get("/api/farms/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "North Field")

    def test_user_cannot_read_another_users_farm(self):
        self.authenticate_as(self.user_a)

        response = self.client.get(f"/api/farms/{self.farm_b.pk}/")

        self.assertEqual(response.status_code, 404)

    def test_user_cannot_update_another_users_farm(self):
        self.authenticate_as(self.user_a)

        response = self.client.patch(
            f"/api/farms/{self.farm_b.pk}/",
            {"name": "Stolen Field"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.farm_b.refresh_from_db()
        self.assertEqual(self.farm_b.name, "South Field")

    def test_user_cannot_delete_another_users_farm(self):
        self.authenticate_as(self.user_a)

        response = self.client.delete(f"/api/farms/{self.farm_b.pk}/")

        self.assertEqual(response.status_code, 404)
        self.assertTrue(SavedFarm.objects.filter(pk=self.farm_b.pk).exists())

    def test_duplicate_farm_name_for_same_user_is_rejected(self):
        self.authenticate_as(self.user_a)

        response = self.client.post(
            "/api/farms/",
            {"name": "North Field"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_different_users_can_use_the_same_farm_name(self):
        self.authenticate_as(self.user_a)

        response = self.client.post(
            "/api/farms/",
            {"name": "South Field"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_user_cannot_attach_history_to_another_users_farm(self):
        self.authenticate_as(self.user_a)

        response = self.client.post(
            "/api/recommendation-history/",
            {
                "farm_id": self.farm_b.pk,
                "recommendation_type": "crop",
                "inputs": {"nitrogen": 90},
                "result": {"crop": "rice"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(RecommendationHistory.objects.count(), 0)

    def test_history_list_requires_authentication(self):
        response = self.client.get("/api/recommendation-history/")
        self.assertEqual(response.status_code, 401)

    def test_history_is_private_to_each_user(self):
        RecommendationHistory.objects.create(
            user=self.user_a,
            farm=self.farm_a,
            recommendation_type="crop",
            inputs={"nitrogen": 90},
            result={"crop": "rice"},
        )
        RecommendationHistory.objects.create(
            user=self.user_b,
            farm=self.farm_b,
            recommendation_type="crop",
            inputs={"nitrogen": 20},
            result={"crop": "maize"},
        )

        self.authenticate_as(self.user_a)
        response = self.client.get("/api/recommendation-history/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["result"]["crop"], "rice")

    def test_user_can_create_history_for_their_own_farm(self):
        self.authenticate_as(self.user_a)

        response = self.client.post(
            "/api/recommendation-history/",
            {
                "farm_id": self.farm_a.pk,
                "recommendation_type": "crop",
                "inputs": {"nitrogen": 90},
                "result": {"crop": "rice"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["farm_id"], self.farm_a.pk)


