import jwt
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

def verify_kinde_jwt(request):
    """Extract and decode Kinde JWT Access Token"""

    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthenticationFailed("No token provided")

    token = auth_header.split(" ")[1]

    try:
        # KINDE_REMOTE_JWKS — not required for development
        payload = jwt.decode(
            token,
            options={"verify_signature": False},  # FOR DEV ONLY
            algorithms=["RS256"],
            audience=None
        )
        return payload

    except Exception as e:
        print("JWT DECODE ERROR:", e)
        raise AuthenticationFailed("Invalid token")
