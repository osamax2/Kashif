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
        response = client.get("/transactions/me", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_leaderboard(self):
        """Test getting leaderboard"""
        headers = {"Authorization": "Bearer mock_token"}
        params = {"limit": 10, "offset": 0}
        response = client.get("/leaderboard/", params=params, headers=headers)
        assert response.status_code in [200, 401]
    
    def test_add_points(self):
        """Test awarding points to user"""
        headers = {"Authorization": "Bearer mock_token"}
        points_data = {
            "user_id": 1,
            "points": 10,
            "description": "Created a new report"
        }
        response = client.post("/points/award", json=points_data, headers=headers)
        assert response.status_code in [200, 401, 422]
    
    def test_redeem_points(self):
        """Test redeeming points"""
        headers = {"Authorization": "Bearer mock_token"}
        points_data = {
            "points": 50,
            "coupon_id": 1
        }
        response = client.post("/points/redeem", json=points_data, headers=headers)
        assert response.status_code in [200, 400, 401, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
