from django.conf import settings
from django.db import models


class SavedFarm(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_farms",
    )
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=255, blank=True)
    soil_type = models.CharField(max_length=80, blank=True)
    nitrogen = models.FloatField(null=True, blank=True)
    phosphorus = models.FloatField(null=True, blank=True)
    potassium = models.FloatField(null=True, blank=True)
    ph = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_saved_farm_name_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.name} (user {self.user_id})"


class RecommendationHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recommendation_history",
    )
    farm = models.ForeignKey(
        SavedFarm,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recommendations",
    )
    recommendation_type = models.CharField(max_length=60, default="crop")
    inputs = models.JSONField(default=dict)
    result = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recommendation_type} recommendation (user {self.user_id})"
