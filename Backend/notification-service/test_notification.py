import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestNotificationService:
    """Test suite for Notification Service"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "notification"
    
    def test_register_device(self):
        """Test registering FCM device token"""
        headers = {"Authorization": "Bearer mock_token"}
        device_data = {
            "user_id": 1,
            "fcm_token": "test_fcm_token_123",
            "device_type": "android"
        }
        response = client.post("/devices/register", json=device_data, headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_user_notifications(self):
        """Test getting user notifications"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/notifications/user/1", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_mark_notification_read(self):
        """Test marking notification as read"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.put("/notifications/1/read", headers=headers)
        assert response.status_code in [200, 401, 404]
    
    def test_get_unread_count(self):
        """Test getting unread notification count"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/notifications/user/1/unread-count", headers=headers)
        assert response.status_code in [200, 401]
    
    def test_update_notification_settings(self):
        """Test updating notification preferences"""
        headers = {"Authorization": "Bearer mock_token"}
        settings_data = {
            "user_id": 1,
            "notification_type": "REPORT_UPDATE",
            "status": "ENABLED"
        }
        response = client.put("/settings/", json=settings_data, headers=headers)
        assert response.status_code in [200, 401]
    
    def test_get_notification_settings(self):
        """Test getting notification settings"""
        headers = {"Authorization": "Bearer mock_token"}
        response = client.get("/settings/user/1", headers=headers)
        assert response.status_code in [200, 401]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
