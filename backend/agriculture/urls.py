from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views, auth_views, account_views

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("crop-recommendation/", views.crop_recommendation, name="crop_recommendation"),
    path("crop-advisory/", views.crop_advisory, name="crop_advisory"),
    path("disease-detection/", views.disease_detection, name="disease_detection"),
    path("plant-identification/", views.plant_identification, name="plant_identification"),
    path("plant-health/", views.plant_health, name="plant_health"),
    path("market-prices/", views.market_prices, name="market_prices"),
    path("market-analytics/", views.market_analytics, name="market_analytics"),
    path("market-metadata/", views.market_metadata, name="market_metadata"),

    path("auth/signup/", auth_views.signup, name="auth_signup"),
    path("auth/login/", auth_views.login, name="auth_login"),
    path("auth/profile/", auth_views.profile, name="auth_profile"),
    path("auth/logout/", auth_views.logout, name="auth_logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("farms/", account_views.farms, name="farms"),
    path("farms/<int:farm_id>/", account_views.farm_detail, name="farm_detail"),
    path("recommendation-history/", account_views.recommendation_history, name="recommendation_history"),
]

