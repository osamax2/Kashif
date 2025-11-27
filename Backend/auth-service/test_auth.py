import pytest
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)


class TestAuthService:
    """Test suite for Auth Service"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "auth"
    
    def test_register_user(self):
        """Test user registration"""
        user_data = {
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User",
            "phone": "+1234567890",
            "role": "USER"
        }
        response = client.post("/register", json=user_data)
        assert response.status_code in [200, 400]  # 400 if user exists
        
        if response.status_code == 200:
            data = response.json()
            assert data["email"] == user_data["email"]
            assert data["full_name"] == user_data["full_name"]
            assert "id" in data
    
    def test_login_user(self):
        """Test user login"""
        # First register
        user_data = {
            "email": "testlogin@example.com",
            "password": "password123",
            "full_name": "Test Login",
            "role": "USER"
        }
        client.post("/register", json=user_data)
        
        # Then login
        login_data = {
            "username": "testlogin@example.com",
            "password": "password123"
        }
        response = client.post("/token", data=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_get_current_user(self):
        """Test get current user with token"""
        # Register and login first
        user_data = {
            "email": "testcurrent@example.com",
            "password": "password123",
            "full_name": "Test Current",
            "role": "USER"
        }
        client.post("/register", json=user_data)
        
        login_data = {
            "username": "testcurrent@example.com",
            "password": "password123"
        }
        login_response = client.post("/token", data=login_data)
        token = login_response.json()["access_token"]
        
        # Get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testcurrent@example.com"
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        response = client.post("/token", data=login_data)
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
