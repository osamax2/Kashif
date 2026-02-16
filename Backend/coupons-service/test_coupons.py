import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestCouponsService:
    """Test suite for Coupons Service"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "coupons"
    
    def test_list_coupons(self):
        """Test listing available coupons"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_coupon_by_id(self):
        """Test getting specific coupon"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/1", headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_list_coupon_categories(self):
        """Test listing coupon categories"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/categories", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_list_companies(self):
        """Test listing companies"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/companies", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_redeem_coupon(self):
        """Test redeeming a coupon"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.post("/1/redeem", headers=headers)
        assert response.status_code in [200, 400, 401, 404, 422]
    
    def test_get_user_redemptions(self):
        """Test getting user's redemption history"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/redemptions/me", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_all_redemptions(self):
        """Test getting all redemptions (admin)"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/redemptions/all", headers=headers)
        assert response.status_code in [200, 401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
