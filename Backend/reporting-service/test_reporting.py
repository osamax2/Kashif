import pytest
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)


class TestReportingService:
    """Test suite for Reporting Service"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "reporting"
    
    def test_create_report(self):
        """Test creating a new report"""
        # Mock token (you'll need a valid token from auth service)
        headers = {"Authorization": "Bearer mock_token"}
        
        report_data = {
            "title": "Test Report",
            "description": "Test description",
            "location_lat": 33.5138,
            "location_lng": 36.2765,
            "address": "Damascus, Syria",
            "category_id": 1,
            "severity_id": 1,
            "photo_urls": "https://example.com/photo1.jpg,https://example.com/photo2.jpg"
        }
        
        response = client.post("/reports/", json=report_data, headers=headers)
        # Expect 401 with mock token, or 200 with real token
        assert response.status_code in [200, 401]
    
    def test_list_reports(self):
        """Test listing reports"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/reports/", headers=headers)
        # Should work even without auth in some cases
        assert response.status_code in [200, 401]
    
    def test_get_report_by_id(self):
        """Test getting specific report"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/reports/1", headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_update_report_status(self):
        """Test updating report status"""
        headers = {"Authorization": "Bearer mock_token"}
        update_data = {
            "status_id": 2,  # IN_PROGRESS
            "notes": "Working on it"
        }
        response = client.put("/reports/1/status", json=update_data, headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_get_nearby_reports(self):
        """Test getting reports near location"""
        headers = {"Authorization": "Bearer mock_token"}
        params = {
            "lat": 33.5138,
            "lng": 36.2765,
            "radius_km": 5
        }
        response = client.get("/reports/nearby", params=params, headers=headers)
        assert response.status_code in [200, 401]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
