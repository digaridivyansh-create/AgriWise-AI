from pathlib import Path

views_path = Path("agriculture/views.py")
views = views_path.read_text(encoding="utf-8")

if "def disease_detection(request):" not in views:
    views += '''

from .services.disease_service import detect_crop_disease


@api_view(["POST"])
def disease_detection(request):
    return detect_crop_disease(request)
'''
    views_path.write_text(views, encoding="utf-8")

urls_path = Path("agriculture/urls.py")
urls = urls_path.read_text(encoding="utf-8")

route = '    path("disease-detection/", views.disease_detection, name="disease_detection"),'
if route not in urls:
    urls = urls.replace(
        'urlpatterns = [',
        'urlpatterns = [\n' + route,
        1,
    )
    urls_path.write_text(urls, encoding="utf-8")

print("Disease service created; URL and view updated.")
