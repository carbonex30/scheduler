# Scheduler Backend

FastAPI-based backend for intelligent employee scheduling system.

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp ../.env.example ../.env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
# Create initial migration (already done)
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

4. Run the development server:
```bash
uvicorn app.main:app --reload
```

## Database Migrations

### Create a new migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migration
```bash
alembic downgrade -1
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
app/
├── api/v1/          # API endpoints
├── models/          # SQLAlchemy models
├── schemas/         # Pydantic schemas
├── services/        # Business logic
├── optimizer/       # Schedule optimization engine
├── ml/              # Machine learning models
├── workers/         # Celery background tasks
├── utils/           # Utility functions
├── config.py        # Configuration
├── database.py      # Database connection
└── main.py          # FastAPI application
```

## Running with Docker

```bash
cd ..
docker-compose up backend
```

## Testing

```bash
pytest
```
