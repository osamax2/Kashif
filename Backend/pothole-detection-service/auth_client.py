"""
Auth client for pothole detection service.
Handles authentication with the auth service to get JWT tokens.
"""
import os
import requests
from datetime import datetime, timedelta
from typing import Optional

from config import settings


class AuthClient:
    """Client for authenticating with the auth service"""
    
    def __init__(self):
        self.auth_url = os.getenv("AUTH_SERVICE_URL", "http://kashif-auth:8000")
        self.admin_email = os.getenv("ADMIN_EMAIL", "admin@kashif.com")
        self.admin_password = os.getenv("ADMIN_PASSWORD", "Admin123!")
        self._token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
    
    def get_token(self) -> Optional[str]:
        """Get a valid JWT token, refreshing if necessary"""
        # Check if current token is still valid (with 5 minute buffer)
        if self._token and self._token_expires:
            if datetime.now() < self._token_expires - timedelta(minutes=5):
                return self._token
        
        # Get new token
        return self._login()
    
    def _login(self) -> Optional[str]:
        """Login to auth service and get JWT token"""
        try:
            # The auth service uses OAuth2 password grant
            response = requests.post(
                f"{self.auth_url}/token",
                data={
                    "username": self.admin_email,
                    "password": self.admin_password,
                    "grant_type": "password"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                self._token = result.get("access_token")
                
                # Assume token expires in 24 hours if not specified
                expires_in = result.get("expires_in", 86400)
                self._token_expires = datetime.now() + timedelta(seconds=expires_in)
                
                print(f"✅ Auth: Logged in as {self.admin_email}")
                return self._token
            else:
                print(f"❌ Auth: Login failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Auth: Exception during login: {e}")
            return None


# Global auth client instance
auth_client = AuthClient()
