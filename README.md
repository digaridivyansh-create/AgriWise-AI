# 🌱 AgriWise AI — Smart Agriculture Decision System

AgriWise AI is an AI-powered agriculture decision-support platform designed to help farmers and agricultural users make informed decisions using machine learning, plant-health screening, weather-related advisory, and market insights.

## 🚀 Features

- **🌾 Crop Recommendation:** Recommends a suitable crop based on soil nutrients and environmental conditions.
- **🌦️ Weather Advisory:** Provides agriculture-related guidance through backend advisory services.
- **🌿 Plant Health Detection:** Uses plant identification and an ONNX-based disease-screening model to help assess plant health.
- **📊 Market Insights:** Provides crop-market information and analytics through backend services.
- **🤖 Machine Learning:** Uses a trained Random Forest classifier for crop recommendations.
- **🖥️ Interactive Dashboard:** A React-based interface for accessing agriculture features.
- **🔌 Backend API:** Django-powered backend for crop recommendations, plant health, and other agriculture services.

*Note: Recommendations are decision-support suggestions and should be verified against local agricultural conditions and expert advice.*
https://agri-wise-ai-six.vercel.app/ this is deploy link

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript
- HTML and CSS

### Backend
- Python
- Django

### Machine Learning
- Scikit-learn
- Random Forest Classifier
- ONNX Runtime/model artifacts

### Data and Storage
- CSV training dataset
- Serialized crop recommendation model
- JSON model evaluation report
- SQLite for local development, where configured

## 📁 Project Structure

```text
AgriWise-AI/
├── backend/
│   ├── agriculture/
│   │   ├── ml_models/
│   │   │   ├── crop_recommender.joblib
│   │   │   ├── efficientnet_v2_s_best.onnx
│   │   │   ├── efficientnet_v2_s_best.onnx.data
│   │   │   ├── classes.json
│   │   │   └── evaluation_report.json
│   │   ├── services/
│   │   ├── migrations/
│   │   ├── models.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── config/
│   │   └── settings.py
│   ├── data/
│   │   └── crop_recommendation.csv
│   ├── manage.py
│   └── train_crop_model.py
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── assets/
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/digaridivyansh-create/AgriWise-AI.git
cd AgriWise-AI
```

### 2. Set Up the Backend

Open PowerShell:

```powershell
cd backend
```

Create and activate a virtual environment if you do not already have one:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
pip install -r requirements.txt
```

Run the Django system check:

```powershell
python manage.py check
```

Apply database migrations if required:

```powershell
python manage.py migrate
```

Start the backend server:

```powershell
python manage.py runserver
```

The local backend address is:

```text
http://127.0.0.1:8000/
```

**Dependency note:** If `requirements.txt` is not present in the repository, install the dependencies listed or documented by the project before running these commands.

### 3. Set Up the Frontend

Open a second terminal:

```powershell
cd frontend
```

Install the Node.js dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local URL printed by Vite in your terminal, commonly:

```text
http://localhost:5173/
```

Keep both the backend and frontend servers running while testing the application.

## 🌾 Crop Recommendation API

The crop recommendation endpoint is:

```http
POST /api/crop-recommendation/
Content-Type: application/json
```

Example request:

```json
{
  "nitrogen": 90,
  "phosphorus": 42,
  "potassium": 43,
  "temperature": 25.5,
  "humidity": 80,
  "ph": 6.5,
  "rainfall": 200
}
```

Example local endpoint:

```text
http://127.0.0.1:8000/api/crop-recommendation/
```

The backend validates the supplied inputs and uses the trained model to generate a crop prediction. The exact response fields depend on the current API implementation.

## 🧠 Machine Learning Model

AgriWise AI includes a trained crop recommendation model.

- **Algorithm:** Random Forest Classifier
- **Input features:** Nitrogen, phosphorus, potassium, temperature, humidity, pH, and rainfall
- **Model artifact:** `backend/agriculture/ml_models/crop_recommender.joblib`
- **Training dataset:** `backend/data/crop_recommendation.csv`
- **Training script:** `backend/train_crop_model.py`
- **Evaluation report:** `backend/agriculture/ml_models/evaluation_report.json`

The project also includes an ONNX model and its accompanying weights file for plant-health screening. Both files must remain together for the model to load correctly.

Model performance can vary across datasets, crops, regions, and real-world growing conditions. Predictions are not guarantees of crop yield or plant disease.

## 🔐 Environment Variables and Security

Never commit API keys, passwords, or private configuration files to GitHub.

The Django backend supports reading its secret key from an environment variable:

```text
DJANGO_SECRET_KEY=your-strong-random-secret-key
```

Create a local `.env` file in the backend directory if needed. Do not upload it to GitHub.

Depending on the enabled integrations, additional API keys may be needed for weather, plant identification, or market data. Check the corresponding service files for their exact environment-variable names.

Before production deployment:

- Set a strong `DJANGO_SECRET_KEY`.
- Disable Django debug mode.
- Configure `ALLOWED_HOSTS`.
- Use HTTPS and secure cookie settings.
- Configure a suitable production database.
- Keep credentials out of source control.

## 📈 Future Improvements

Potential areas for further development include:

- More region-specific crop recommendations.
- Season-aware recommendations using verified weather data.
- Improved disease screening and validation across plant varieties.
- Market price tracking and crop profitability estimates.
- More regional agricultural datasets.
- Model evaluation using independent real-world data.
- Production deployment and monitoring.

## ⚠️ Disclaimer

AgriWise AI is an agriculture decision-support project. Its predictions and recommendations may be inaccurate or incomplete. Always consider local climate, soil testing, crop varieties, current agricultural advisories, and expert guidance before making important farming decisions or applying treatments.

## 👨‍💻 Repository

GitHub: https://github.com/digaridivyansh-create/AgriWise-AI

## 📄 License

No license is specified in this repository yet. Add a `LICENSE` file if you intend to define permissions for others to use, modify, or distribute the project.
