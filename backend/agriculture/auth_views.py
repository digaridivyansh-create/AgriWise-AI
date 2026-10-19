from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get("username")
    email = request.data.get("email", "")
    password = request.data.get("password")

    if not isinstance(username, str) or not username.strip():
        return Response(
            {"error": "A valid username is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = username.strip()

    if len(username) > 150:
        return Response(
            {"error": "Username must be 150 characters or fewer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(email, str) or len(email) > 254:
        return Response(
            {"error": "A valid email address is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(password, str) or not password:
        return Response(
            {"error": "A password is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {"error": "This username is already registered."},
            status=status.HTTP_409_CONFLICT,
        )

    try:
        validate_password(password)
    except ValidationError as exc:
        return Response(
            {"error": "Password validation failed.", "details": list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.create_user(
            username=username,
            email=email.strip(),
            password=password,
        )
    except Exception:
        return Response(
            {"error": "Unable to create the account. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "message": "Account created successfully.",
            "user": {
                "id": user.pk,
                "username": user.username,
                "email": user.email,
            },
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not isinstance(username, str) or not isinstance(password, str):
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request,
        username=username.strip(),
        password=password,
    )

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "message": "Login successful.",
            "user": {
                "id": user.pk,
                "username": user.username,
                "email": user.email,
            },
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user

    return Response(
        {
            "id": user.pk,
            "username": user.username,
            "email": user.email,
            "date_joined": user.date_joined,
        },
        status=status.HTTP_200_OK,
    )



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh_token = request.data.get("refresh")

    if not isinstance(refresh_token, str) or not refresh_token.strip():
        return Response(
            {"error": "A refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = RefreshToken(refresh_token.strip())
        token.blacklist()
    except Exception:
        return Response(
            {"error": "Invalid or revoked refresh token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {"message": "Logout successful. Refresh token revoked."},
        status=status.HTTP_200_OK,
    )
