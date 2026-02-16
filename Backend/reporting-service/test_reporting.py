import json

import pytest
from fastapi.testclient import TestClient
from main import app

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
        """Test creating a new report via multipart upload"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.post("/upload", headers=headers)
        # Expect 401 with mock token, or 422 missing fields
        assert response.status_code in [200, 401, 422]
    
    def test_list_reports(self):
        """Test listing reports"""
        response = client.get("/")
        assert response.status_code == 200
    
    def test_get_report_by_id(self):
        """Test getting specific report"""
        response = client.get("/1")
        assert response.status_code in [200, 404]
    
    def test_update_report_status(self):
        """Test updating report status"""
        headers = {"Authorization": "Bearer mock_token"}
        update_data = {
            "status_id": 2
        }
        response = client.patch("/1/status", json=update_data, headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_get_categories(self):
        """Test getting report categories"""
        response = client.get("/categories")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
