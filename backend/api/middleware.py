from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs
import jwt
import requests
from django.conf import settings

class KindeAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using Kinde tokens
    """
    
    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if token:
            # Verify the token with Kinde
            user = await self.get_user_from_token(token)
            scope['user'] = user
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """
        Verify Kinde JWT token and return user info
        You might want to create a User object or just return user data
        """
        try:
            # Decode the JWT token (without verification for now)
            # In production, verify with Kinde's public key
            decoded = jwt.decode(token, options={"verify_signature": False})
            
            # Create a simple user object with the data
            class KindeUser:
                def __init__(self, data):
                    self.email = data.get('email')
                    self.name = data.get('given_name', 'User')
                    self.id = data.get('sub')
                    self.is_authenticated = True
            
            return KindeUser(decoded)
        except:
            return AnonymousUser()


# Alternative: If you want to use session-based auth instead of token
class KindeSessionAuthMiddleware(BaseMiddleware):
    """
    Alternative middleware using session authentication
    """
    async def __call__(self, scope, receive, send):
        # Get session from scope
        scope['user'] = await self.get_user_from_session(scope)
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_session(self, scope):
        """
        Get user from Django session
        """
        try:
            from django.contrib.auth import get_user
            from django.contrib.sessions.models import Session
            
            # Try to get session key from cookies
            session_key = None
            for header_name, header_value in scope.get('headers', []):
                if header_name == b'cookie':
                    cookies = header_value.decode()
                    for cookie in cookies.split(';'):
                        if 'sessionid' in cookie:
                            session_key = cookie.split('=')[1].strip()
            
            if session_key:
                session = Session.objects.get(session_key=session_key)
                user_id = session.get_decoded().get('_auth_user_id')
                if user_id:
                    from django.contrib.auth.models import User
                    return User.objects.get(pk=user_id)
        except:
            pass
        
        return AnonymousUser()