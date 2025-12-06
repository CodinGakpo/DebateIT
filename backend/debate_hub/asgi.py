import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from api.routing import websocket_urlpatterns
# Import the Kinde middleware if you created it
# from api.middleware import KindeAuthMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'debate_hub.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            # If using Kinde middleware, wrap it here:
            # KindeAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            # )
        )
    ),
})