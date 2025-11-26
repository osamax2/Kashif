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
        response = client.get("/coupons/", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_coupon_by_id(self):
        """Test getting specific coupon"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/coupons/1", headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_list_coupon_categories(self):
        """Test listing coupon categories"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/categories/", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_list_companies(self):
        """Test listing companies"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/companies/", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_redeem_coupon(self):
        """Test redeeming a coupon"""
        headers = {"Authorization": "Bearer mock_token"}
        redemption_data = {
            "coupon_id": 1,
            "user_id": 1
        }
        response = client.post("/coupons/redeem", json=redemption_data, headers=headers)
        assert response.status_code in [200, 400, 401, 404]
    
    def test_get_user_redemptions(self):
        """Test getting user's redemption history"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/redemptions/user/1", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_cancel_redemption(self):
        """Test canceling a redemption"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.put("/redemptions/1/cancel", headers=headers)
        assert response.status_code in [200, 401, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
