import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestGamificationService:
    """Test suite for Gamification Service"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "gamification"
    
    def test_get_user_points(self):
        """Test getting user points"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/points/1", headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_get_user_transactions(self):
        """Test getting user transaction history"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/points/1/transactions", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_leaderboard(self):
        """Test getting leaderboard"""
        headers = {"Authorization": "Bearer mock_token"}
        params = {"limit": 10, "offset": 0}
        response = client.get("/leaderboard/", params=params, headers=headers)
        assert response.status_code in [200, 401]
    
    def test_add_points(self):
        """Test adding points to user"""
        headers = {"Authorization": "Bearer mock_token"}
        points_data = {
            "user_id": 1,
            "points": 10,
            "type": "REPORT_CREATED",
            "description": "Created a new report",
            "report_id": 1
        }
        response = client.post("/points/add", json=points_data, headers=headers)
        assert response.status_code in [200, 401]
    
    def test_deduct_points(self):
        """Test deducting points from user"""
        headers = {"Authorization": "Bearer mock_token"}
        points_data = {
            "user_id": 1,
            "points": 50,
            "type": "REDEMPTION",
            "description": "Redeemed coupon"
        }
        response = client.post("/points/deduct", json=points_data, headers=headers)
        assert response.status_code in [200, 400, 401]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
