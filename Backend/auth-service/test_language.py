#!/usr/bin/env python3
"""
Test script for language preference endpoints
"""

import json

import requests

BASE_URL = "http://localhost:8001"  # Auth service port

def test_language_endpoints():
    print("=" * 60)
    print("Testing Language Preference Endpoints")
    print("=" * 60)
    
    # Step 1: Register a new user
    print("\n1. Registering new user...")
    register_data = {
        "email": "testlang@example.com",
        "password": "testpass123",
        "full_name": "Test Language User",
        "phone": "+966501234567",
        "language": "ar"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=register_data)
        if response.status_code == 200:
            user = response.json()
            print(f"✓ User registered: {user['email']}")
            print(f"  Default language: {user.get('language', 'NOT SET')}")
        else:
            print(f"✗ Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"✗ Error: {e}")
        return
    
    # Step 2: Login
    print("\n2. Logging in...")
    login_data = {
        "username": register_data["email"],
        "password": register_data["password"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/token", data=login_data)
        if response.status_code == 200:
            tokens = response.json()
            access_token = tokens["access_token"]
            print(f"✓ Login successful")
            print(f"  Access token: {access_token[:20]}...")
        else:
            print(f"✗ Login failed: {response.text}")
            return
    except Exception as e:
        print(f"✗ Error: {e}")
        return
    
    # Step 3: Get user profile
    print("\n3. Getting user profile...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/me", headers=headers)
        if response.status_code == 200:
            user = response.json()
            print(f"✓ Profile retrieved")
            print(f"  Email: {user['email']}")
            print(f"  Language: {user.get('language', 'NOT SET')}")
        else:
            print(f"✗ Failed to get profile: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Step 4: Update language to English
    print("\n4. Updating language to English...")
    language_data = {"language": "en"}
    
    try:
        response = requests.patch(
            f"{BASE_URL}/me/language",
            json=language_data,
            headers=headers
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Language updated successfully")
            print(f"  Message: {result['message']}")
            print(f"  New language: {result['language']}")
        else:
            print(f"✗ Failed to update language: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Step 5: Verify language was updated
    print("\n5. Verifying language update...")
    
    try:
        response = requests.get(f"{BASE_URL}/me", headers=headers)
        if response.status_code == 200:
            user = response.json()
            print(f"✓ Profile retrieved")
            print(f"  Current language: {user.get('language', 'NOT SET')}")
            
            if user.get('language') == 'en':
                print("  ✓ Language successfully changed to English!")
            else:
                print("  ✗ Language was not updated correctly")
        else:
            print(f"✗ Failed to get profile: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Step 6: Test invalid language
    print("\n6. Testing invalid language (should fail)...")
    invalid_language_data = {"language": "fr"}
    
    try:
        response = requests.patch(
            f"{BASE_URL}/me/language",
            json=invalid_language_data,
            headers=headers
        )
        if response.status_code == 400:
            print(f"✓ Correctly rejected invalid language")
            print(f"  Error: {response.json()['detail']}")
        else:
            print(f"✗ Should have rejected 'fr', got: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Step 7: Update back to Arabic
    print("\n7. Updating back to Arabic...")
    arabic_data = {"language": "ar"}
    
    try:
        response = requests.patch(
            f"{BASE_URL}/me/language",
            json=arabic_data,
            headers=headers
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Language updated back to Arabic")
            print(f"  New language: {result['language']}")
        else:
            print(f"✗ Failed to update language: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    test_language_endpoints()
    test_language_endpoints()
