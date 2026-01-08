# AI Mock Interview Webapp

A full-stack AI-powered mock interview application built with React, Spring Boot, PostgreSQL, and WebSockets.

## Prerequisites

- Java 21
- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)
- Maven 3.8+

## Quick Start

### Option 1: Docker Compose (Recommended - Full Stack)

Start everything with Docker:

```bash
# From the project root (aiinter/)
docker-compose up -d
```

This will start:
- PostgreSQL on `localhost:5432`
- Backend API on `http://localhost:8080`
- Frontend on `http://localhost:3000`

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

To view logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
```

To stop everything:
```bash
docker-compose down
```

To rebuild services after code changes:
```bash
# Rebuild specific service
docker-compose up -d --build frontend
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Option 2: Manual Setup

#### 1. Start PostgreSQL Database

```bash
# From the project root (aiinter/)
docker-compose up -d postgres
```

This will start PostgreSQL on `localhost:5432` with:
- Database: `aimock`
- Username: `postgres`
- Password: `postgres`

#### 2. Start Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

The backend will run on `http://localhost:8080`

#### 3. Start Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Database Setup

The database schema is automatically created by Flyway migrations on first startup. The migrations are located in:
- `backend/src/main/resources/db/migration/`

## Configuration

### Backend Configuration
Edit `backend/src/main/resources/application.properties`:
- Database connection settings
- JWT secret and expiration
- CORS origins

### Frontend Configuration
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8080
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires JWT)

## Project Structure

```
aiinter/
├── backend/          # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/.../aimock/
│   │   │   │   ├── auth/        # Authentication & JWT
│   │   │   │   ├── session/     # Interview sessions
│   │   │   │   ├── conversation/# Messages
│   │   │   │   ├── evaluation/  # Feedback
│   │   │   │   └── websocket/   # WebSocket handlers
│   │   │   └── resources/
│   │   │       └── db/migration/ # Flyway migrations
│   │   └── test/
│   └── pom.xml
├── frontend/         # React frontend
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/ # Reusable components
│   │   ├── services/ # API services
│   │   └── contexts/ # React contexts
│   └── package.json
└── docker-compose.yml # PostgreSQL container
```

## Troubleshooting

### PostgreSQL Connection Issues
1. Make sure Docker is running: `docker ps`
2. Check if container is running: `docker-compose ps`
3. Verify connection: `docker-compose exec postgres psql -U postgres -d aimock`

### Port Already in Use
- Backend (8080): Change `server.port` in `application.properties`
- Frontend (5173): Vite will automatically use next available port
- PostgreSQL (5432): Change port mapping in `docker-compose.yml`

## Development

### Running Tests
```bash
cd backend
mvn test
```

### Building
```bash
# Backend
cd backend
mvn clean package

# Frontend
cd frontend
npm run build
```
