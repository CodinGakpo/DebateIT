from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from .kinde_auth import verify_kinde_jwt
from .models import UserProfile


class ProtectedView(APIView):

    def get(self, request):
        payload = verify_kinde_jwt(request)

        kinde_id = payload.get("sub")
        email = payload.get("email", "")

        if not kinde_id:
            raise AuthenticationFailed("Invalid Kinde token")

        # Insert user if not exists
        user, created = UserProfile.objects.get_or_create(
            kinde_id=kinde_id,
            defaults={"email": email},
        )

        return Response({
            "message": "Authenticated",
            "user_id": user.id,
            "email": user.email,
            "created": created
        })
