# Kashif Backend - FastAPI Microservices

Complete microservices backend architecture for the Kashif application using Python FastAPI, Docker, PostgreSQL, and RabbitMQ.

## Architecture

The backend consists of 5 microservices:

1. **Auth Service** (Port 8000) - Authentication & User Management
   - User registration/login
   - JWT token generation and validation
   - Password management
   - User profile management

2. **Reporting Service** (Port 8000) - Report Management
   - Create and manage reports
   - Geo-location filtering
   - Report status tracking
   - Status history

3. **Gamification Service** (Port 8000) - Points & Rewards
   - Points tracking
   - Point transactions (earning/spending)
   - Leaderboard
   - Automated point awards for actions

4. **Coupons Service** (Port 8000) - Coupon Management
   - Companies and categories
   - Coupon catalog
   - Coupon redemption
   - Redemption history

5. **Notification Service** (Port 8000) - Push Notifications
   - Firebase Cloud Messaging (FCM) integration
   - Notification storage and history
   - Device token management
   - Event-driven notifications

### Supporting Infrastructure

- **PostgreSQL** - Separate database per service (Database-per-Service pattern)
- **RabbitMQ** - Message broker for event-driven communication
- **Nginx** - API Gateway for routing requests

## Event-Driven Architecture

Services communicate via RabbitMQ events:

### Published Events

- `user.registered` (Auth Service)
- `report.created` (Reporting Service)
- `report.status_updated` (Reporting Service)
- `points.awarded` (Gamification Service)
- `points.redeemed` (Gamification Service)
- `coupon.redeemed` (Coupons Service)

### Event Consumers

- **Gamification Service** listens to:
  - `report.created` → Award points
  - `report.status_updated` → Award bonus points

- **Notification Service** listens to:
  - `user.registered` → Welcome notification
  - `report.created` → Report confirmation
  - `report.status_updated` → Status change notification
  - `points.awarded` → Points notification
  - `coupon.redeemed` → Redemption confirmation

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
cd /Users/osamaalabaji/Kashif/backend
```

2. Start all services:
```bash
  docker-compose up -d
```

This will start:
- All 5 microservices
- 5 PostgreSQL databases
- RabbitMQ message broker
- Nginx API Gateway

3. Check service health:
```bash
# API Gateway
curl http://localhost:8000/health

# Individual services
curl http://localhost:8000/api/auth/health
curl http://localhost:8000/api/reports/health
curl http://localhost:8000/api/gamification/health
curl http://localhost:8000/api/coupons/health
curl http://localhost:8000/api/notifications/health
```

4. Access RabbitMQ Management UI:
```
URL: http://localhost:15672
Username: guest
Password: guest
```

### API Endpoints

All requests go through the API Gateway at `http://localhost:8000`

#### Auth Service (`/api/auth/`)

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "+1234567890"
}

# Login
POST /api/auth/token
Form data: username=user@example.com&password=password123

# Get current user
GET /api/auth/me
Headers: Authorization: Bearer {token}

# Refresh token
POST /api/auth/refresh
{
  "refresh_token": "{refresh_token}"
}
```

#### Reporting Service (`/api/reports/`)

```bash
# Create report
POST /api/reports/
Headers: Authorization: Bearer {token}
{
  "title": "Street Damage",
  "description": "Large pothole on Main St",
  "category": "road_damage",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "address": "Main Street, Riyadh"
}

# Get all reports (with filters)
GET /api/reports/?category=road_damage&latitude=24.7136&longitude=46.6753&radius_km=5

# Get my reports
GET /api/reports/my-reports
Headers: Authorization: Bearer {token}

# Get specific report
GET /api/reports/{report_id}

# Update report status
PATCH /api/reports/{report_id}/status
Headers: Authorization: Bearer {token}
{
  "status": "in_progress",
  "comment": "Work in progress"
}
```

#### Gamification Service (`/api/gamification/`)

```bash
# Get my points
GET /api/gamification/points/me
Headers: Authorization: Bearer {token}

# Get user points (public)
GET /api/gamification/points/{user_id}

# Get my transactions
GET /api/gamification/transactions/me
Headers: Authorization: Bearer {token}

# Get leaderboard
GET /api/gamification/leaderboard?limit=100

# Redeem points
POST /api/gamification/points/redeem
Headers: Authorization: Bearer {token}
{
  "points": 100,
  "coupon_id": 1
}
```

#### Coupons Service (`/api/coupons/`)

```bash
# Get all coupons
GET /api/coupons/?category_id=1&company_id=1

# Get specific coupon
GET /api/coupons/{coupon_id}

# Redeem coupon
POST /api/coupons/{coupon_id}/redeem
Headers: Authorization: Bearer {token}

# Get my redemptions
GET /api/coupons/redemptions/me
Headers: Authorization: Bearer {token}

# Create company (admin)
POST /api/coupons/companies
Headers: Authorization: Bearer {token}
{
  "name": "Company Name",
  "logo_url": "https://...",
  "description": "Company description"
}

# Create category (admin)
POST /api/coupons/categories
Headers: Authorization: Bearer {token}
{
  "name": "Food & Beverages",
  "description": "Food related coupons"
}
```

#### Notification Service (`/api/notifications/`)

```bash
# Register device for push notifications
POST /api/notifications/register-device
Headers: Authorization: Bearer {token}
{
  "token": "fcm_device_token",
  "device_type": "ios"
}

# Get my notifications
GET /api/notifications/?unread_only=true
Headers: Authorization: Bearer {token}

# Mark notification as read
PATCH /api/notifications/{notification_id}/read
Headers: Authorization: Bearer {token}

# Get unread count
GET /api/notifications/unread-count
Headers: Authorization: Bearer {token}
```

## Development

### Service Structure

Each service follows this structure:
```
service-name/
├── Dockerfile
├── requirements.txt
├── main.py              # FastAPI app
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── database.py          # Database connection
├── crud.py              # Database operations
├── auth_client.py       # Auth service integration
├── rabbitmq_publisher.py
├── rabbitmq_consumer.py
└── alembic/            # Database migrations
```

### Running Individual Services

```bash
# Auth Service
cd auth-service
pip install -r requirements.txt
uvicorn main:app --reload

# Other services similarly
```

### Database Migrations

Each service uses Alembic for migrations:

```bash
cd auth-service

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Environment Variables

Key environment variables (set in docker-compose.yml):

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# JWT
JWT_SECRET=your-secret-key

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=http://auth-service:8000
REPORTING_SERVICE_URL=http://reporting-service:8000
GAMIFICATION_SERVICE_URL=http://gamification-service:8000

# Firebase (for notifications)
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
```

## Monitoring & Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f rabbitmq
```

### Access Databases

```bash
# Auth DB
docker exec -it auth-db psql -U auth_user -d auth_db

# Reporting DB
docker exec -it reporting-db psql -U reporting_user -d reporting_db
```

### RabbitMQ Management

Access at http://localhost:15672 to:
- Monitor queues and exchanges
- View message rates
- Debug message flow
- Manage bindings

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (will delete all data)
docker-compose down -v
```

## Production Deployment

For production:

1. Change all default passwords in docker-compose.yml
2. Use proper JWT secrets
3. Set up SSL/TLS certificates for Nginx
4. Configure Firebase credentials properly
5. Set up monitoring (Prometheus, Grafana)
6. Implement proper logging (ELK stack)
7. Use environment-specific configs
8. Set up CI/CD pipelines
9. Configure auto-scaling
10. Implement rate limiting

## Testing

### Manual Testing with cURL

See API endpoints section above for examples.

### Automated Testing

```bash
# Run tests for each service
cd auth-service
pytest

cd reporting-service
pytest
```

## Architecture Benefits

- **Scalability**: Each service can scale independently
- **Resilience**: Service failures are isolated
- **Technology Flexibility**: Each service can use different tech if needed
- **Team Autonomy**: Teams can work on services independently
- **Deployment**: Services can be deployed independently
- **Database Isolation**: Each service owns its data

## Common Issues

### RabbitMQ not connecting
- Check if RabbitMQ container is running
- Verify RABBITMQ_URL in environment variables

### Database connection errors
- Ensure database containers are healthy
- Check DATABASE_URL format

### Auth token errors
- Verify JWT_SECRET is set correctly
- Check token expiration times

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

[Your License]

## Contact

[Your Contact Information]
