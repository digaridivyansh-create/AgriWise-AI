from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "crop_recommendation.csv"
MODEL_DIR = BASE_DIR / "agriculture" / "ml_models"
MODEL_PATH = MODEL_DIR / "crop_recommender.joblib"

FEATURES = [
    "nitrogen", "phosphorus", "potassium",
    "temperature", "humidity", "ph", "rainfall",
]

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)
df.columns = [str(c).strip().lower() for c in df.columns]

aliases = {
    "n": "nitrogen",
    "p": "phosphorus",
    "k": "potassium",
    "p_h": "ph",
    "ph_value": "ph",
    "crop": "label",
}
df = df.rename(columns=aliases)

required = FEATURES + ["label"]
missing = [c for c in required if c not in df.columns]
if missing:
    raise ValueError(
        f"Missing columns: {missing}. Available columns: {list(df.columns)}"
    )

df = df[required].dropna()
for col in FEATURES:
    df[col] = pd.to_numeric(df[col], errors="coerce")
df = df.dropna()
df["label"] = df["label"].astype(str).str.strip().str.lower()
df = df[df["label"] != ""]

if df["label"].nunique() < 2:
    raise ValueError("At least two crop classes are required.")

X = df[FEATURES]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1,
)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

MODEL_DIR.mkdir(parents=True, exist_ok=True)
artifact = {
    "model": model,
    "features": FEATURES,
    "classes": list(model.classes_),
    "test_accuracy": float(accuracy),
    "training_rows": int(len(X_train)),
    "test_rows": int(len(X_test)),
    "dataset_rows_used": int(len(df)),
    "dataset_source": (
        "https://huggingface.co/datasets/liaad/agricultural-data"
    ),
}
joblib.dump(artifact, MODEL_PATH)

report = classification_report(
    y_test, predictions, output_dict=True, zero_division=0
)
report_path = MODEL_DIR / "evaluation_report.json"
report_path.write_text(
    json.dumps(report, indent=2),
    encoding="utf-8",
)

print("\n=== AgriWise AI model training complete ===")
print("Rows used:", len(df))
print("Crop classes:", y.nunique())
print("Training rows:", len(X_train))
print("Held-out test rows:", len(X_test))
print(f"Held-out test accuracy: {accuracy:.4f} ({accuracy:.1%})")
print("Saved model:", MODEL_PATH)
print("Saved evaluation report:", report_path)
print("\nImportant: this score measures performance on a held-out split")
print("of this dataset, not proven accuracy on real farms.")
