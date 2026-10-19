import json
import logging
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, UnidentifiedImageError
from rest_framework import status
from rest_framework.response import Response

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml_models"
MODEL_PATH = MODEL_DIR / "efficientnet_v2_s_best.onnx"
CLASSES_PATH = MODEL_DIR / "classes.json"
MAX_IMAGE_BYTES = 8 * 1024 * 1024
logger = logging.getLogger(__name__)
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

_session = None
_classes = None


def _load_model():
    global _session, _classes

    if _session is not None:
        return _session, _classes

    if not MODEL_PATH.is_file() or not CLASSES_PATH.is_file():
        raise FileNotFoundError("Disease model or class labels are missing.")

    metadata = json.loads(CLASSES_PATH.read_text(encoding="utf-8"))
    classes = metadata["classes"]

    if len(classes) != 38:
        raise ValueError("Unexpected number of disease classes.")

    session = ort.InferenceSession(
        str(MODEL_PATH),
        providers=["CPUExecutionProvider"],
    )

    input_shape = session.get_inputs()[0].shape
    if len(input_shape) != 4 or input_shape[1:] != [3, 224, 224]:
        raise ValueError("The model input shape is not supported.")

    _session, _classes = session, classes
    return _session, _classes



def _estimate_blur(image):
    """Return a simple Laplacian-variance sharpness estimate."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)

    if gray.shape[0] < 3 or gray.shape[1] < 3:
        return 0.0

    laplacian = (
        gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
        - 4.0 * gray[1:-1, 1:-1]
    )
    return float(np.var(laplacian))

def detect_crop_disease(request):
    uploaded = request.FILES.get("image")

    if uploaded is None:
        return Response(
            {"status": "error", "message": "Upload a leaf image using the 'image' field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if uploaded.size <= 0 or uploaded.size > MAX_IMAGE_BYTES:
        return Response(
            {"status": "error", "message": "Image must be between 1 byte and 8 MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with Image.open(uploaded) as source:
            if source.format not in ALLOWED_FORMATS:
                return Response(
                    {"status": "error", "message": "Use a JPEG, PNG, or WEBP image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            source.verify()

        uploaded.seek(0)
        with Image.open(uploaded) as source:
            if source.width < 32 or source.height < 32:
                return Response(
                    {"status": "error", "message": "Image resolution is too small."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if source.width * source.height > 25_000_000:
                return Response(
                    {"status": "error", "message": "Image dimensions are too large."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            original_image = source.convert("RGB")
            blur_score = _estimate_blur(original_image)
            # Initial heuristic only; calibrate against real field photos.
            potentially_blurry = blur_score < 50.0

            image = original_image.resize(
                (224, 224), Image.Resampling.BILINEAR
            )

        pixels = np.asarray(image, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        tensor = ((pixels - mean) / std).transpose(2, 0, 1)[None, ...]
        tensor = tensor.astype(np.float32)

        session, classes = _load_model()
        raw = session.run(
            None, {session.get_inputs()[0].name: tensor}
        )[0][0]

        if len(raw) != len(classes) or not np.all(np.isfinite(raw)):
            raise ValueError("The model returned invalid output.")

        # Stable softmax; these are model scores, not calibrated probabilities.
        shifted = raw - np.max(raw)
        exp_scores = np.exp(shifted)
        scores = exp_scores / np.sum(exp_scores)
        order = np.argsort(scores)[::-1][:3]

        def format_prediction(index):
            label = classes[int(index)]
            crop, _, condition = label.partition("___")
            healthy = "healthy" in condition.lower()
            return {
                "label": label,
                "crop": crop.replace("_", " "),
                "condition": condition.replace("_", " ").strip(),
                "model_score_percent": round(float(scores[index]) * 100, 2),
                "class_status": "healthy_class" if healthy else "disease_class",
            }

        top = [format_prediction(i) for i in order]
        best_score = float(scores[order[0]])
        second_score = float(scores[order[1]])
        margin = best_score - second_score

        # Conservative screening rule, not a validated clinical threshold.
        # Softmax scores are not calibrated probabilities and cannot prove
        # that an uploaded image contains a leaf or a supported crop.
        uncertain = (
            best_score < 0.60
            or margin < 0.15
            or potentially_blurry
        )

        prediction = top[0] if not uncertain else None

        return Response({
            "status": "success",
            "prediction": prediction,
            "top_predictions": top,
            "uncertain": uncertain,
            "image_quality": {
                "potentially_blurry": potentially_blurry,
                "laplacian_variance": round(blur_score, 2),
                "threshold": 50.0,
                "note": "This is an uncalibrated blur heuristic, not a validated quality score.",
            },
            "warning": (
                "The model result is uncertain. Take clearer photos and seek "
                "local agricultural expert advice."
                if uncertain else
                "This is an AI screening result, not a confirmed diagnosis. "
                "Check symptoms and consult a local agricultural expert before treatment."
            ),
            "model": {
                "name": "EfficientNetV2-S PlantVillage classifier",
                "class_count": len(classes),
                "runtime": "ONNX Runtime CPU",
            },
            "limitations": [
                "Trained classes may not cover your crop or disease.",
                "Field images can differ from training images.",
                "Model scores are not calibrated diagnostic probabilities.",
                "Do not apply pesticides based only on this prediction.",
            ],
        })

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return Response(
            {"status": "error", "message": "The uploaded file is not a valid supported image."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except FileNotFoundError:
        return Response(
            {"status": "error", "message": "Disease model files are missing."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        return Response(
            {"status": "error", "message": "Disease inference failed. Check server logs."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
