# Multi-Language Support - Backend Integration Guide

## Overview
This guide explains how to integrate the language preference feature into your backend API. The frontend app now supports Arabic (ar) and English (en) with full RTL/LTR layout switching.

## Required Backend Changes

### 1. Database Schema Update

Add a `language` column to the `users` table:

```sql
ALTER TABLE users ADD COLUMN language VARCHAR(2) DEFAULT 'ar';
```

**Allowed values:**
- `'ar'` - Arabic (default)
- `'en'` - English

### 2. Update User Model

Add the `language` field to your User model:

```python
# models/user.py
from sqlalchemy import Column, String

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    phone = Column(String, nullable=True)
    password_hash = Column(String)
    total_points = Column(Integer, default=0)
    language = Column(String(2), default='ar')  # NEW FIELD
    # ... other fields
```

### 3. API Endpoint - Update Language Preference

Create or update this endpoint to save language preference:

```python
# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

router = APIRouter()

class LanguageUpdate(BaseModel):
    language: str  # 'ar' or 'en'

@router.patch("/api/auth/me/language")
async def update_language_preference(
    language_data: LanguageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's language preference.
    
    Request body:
    {
        "language": "ar"  // or "en"
    }
    """
    # Validate language
    if language_data.language not in ['ar', 'en']:
        raise HTTPException(
            status_code=400,
            detail="Invalid language. Must be 'ar' or 'en'"
        )
    
    # Update user
    current_user.language = language_data.language
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Language preference updated successfully",
        "language": current_user.language
    }
```

### 4. Update Profile Endpoint

Make sure the language field is returned in user profile responses:

```python
@router.get("/api/auth/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile including language preference"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "total_points": current_user.total_points,
        "language": current_user.language,  # Include language
        "level_id": current_user.level_id,
        "status": current_user.status,
        "role": current_user.role,
        # ... other fields
    }
```

### 5. Update Registration Endpoint (Optional)

Allow users to set language during registration:

```python
class RegisterData(BaseModel):
    email: str
    password: str
    full_name: str
    phone_number: Optional[str] = None
    language: Optional[str] = 'ar'  # Default to Arabic

@router.post("/api/auth/register")
async def register(
    user_data: RegisterData,
    db: Session = Depends(get_db)
):
    # Validate language
    if user_data.language not in ['ar', 'en']:
        user_data.language = 'ar'
    
    # Create user with language preference
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone_number,
        language=user_data.language,  # Save language preference
        # ... other fields
    )
    
    # ... rest of registration logic
```

## Frontend Integration

The frontend automatically:
1. **Loads** language preference from AsyncStorage on app start
2. **Syncs** with backend when user changes language in settings
3. **Applies** RTL/LTR layout based on selected language
4. **Persists** preference across app restarts

### Frontend API Call

The frontend makes this call when user changes language:

```typescript
// Frontend code (already implemented)
PATCH /api/auth/me/language
Headers: {
  Authorization: Bearer <access_token>
  Content-Type: application/json
}
Body: {
  "language": "ar"  // or "en"
}
```

## Testing

### Test Language Update:

```bash
# Using curl
curl -X PATCH http://your-server/api/auth/me/language \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'

# Expected response
{
  "message": "Language preference updated successfully",
  "language": "en"
}
```

### Test Profile with Language:

```bash
curl -X GET http://your-server/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response includes language field
{
  "id": 123,
  "email": "user@example.com",
  "full_name": "User Name",
  "language": "ar",
  ...
}
```

## Error Handling

### Invalid Language:
```json
{
  "detail": "Invalid language. Must be 'ar' or 'en'"
}
```

### Unauthorized:
```json
{
  "detail": "Not authenticated"
}
```

## Migration Script

If you have existing users, run this migration:

```sql
-- Set default language for all existing users
UPDATE users SET language = 'ar' WHERE language IS NULL;

-- Verify migration
SELECT id, email, language FROM users LIMIT 10;
```

## Notification Translations (Optional)

For push notifications, you can use the user's language preference:

```python
def send_notification(user_id: int, notification_type: str):
    user = get_user(user_id)
    
    # Choose message based on user language
    if user.language == 'ar':
        message = get_arabic_message(notification_type)
    else:
        message = get_english_message(notification_type)
    
    # Send notification
    send_push_notification(user.device_token, message)
```

## Implementation Checklist

- [ ] Add `language` column to users table
- [ ] Update User model with language field
- [ ] Create PATCH `/api/auth/me/language` endpoint
- [ ] Update GET `/api/auth/me` to return language
- [ ] (Optional) Update registration to accept language
- [ ] Test language update endpoint
- [ ] Test profile endpoint returns language
- [ ] Run migration for existing users
- [ ] (Optional) Implement notification translations

## Support

Supported Languages:
- **ar** - العربية (Arabic) - RTL
- **en** - English - LTR

Default Language: **Arabic (ar)**

The frontend will gracefully handle backend errors and continue working with local storage even if the backend sync fails.
