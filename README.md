# Task 3 — To-Do List Backend

A multi-user task management REST API built with Node.js, Express.js, and MongoDB.

---

## 📋 Project Overview

### Problem Statement
Build a backend API for a to-do list application that supports multiple users, task CRUD operations, filtering, searching, sorting, and pagination — all secured with JWT authentication and user ownership scoping.

### CodSoft Requirement Mapping
This project fulfills **CodSoft Backend Development Internship — Task 3: To-Do List Backend**.

---

## ✨ Features

- **User Authentication** — Register, login, JWT token issuance
- **Task CRUD** — Create, read, update, delete tasks
- **Status Management** — Mark tasks as pending, in-progress, or completed
- **Priority Levels** — Low, medium, high priority support
- **Categories** — Organize tasks by custom categories
- **Due Dates** — Set and track task deadlines
- **Full-Text Search** — Search tasks by title and description
- **Filtering** — Filter by status, priority, category
- **Sorting** — Sort by any field (date, priority, title, etc.)
- **Pagination** — Bounded pagination with metadata
- **Ownership Scoping** — Users can only access their own tasks
- **Auto Completion Tracking** — `completedAt` timestamp set automatically

---

## 🛠 Technology Stack

| Technology | Purpose |
|-----------|---------|
| Node.js | Runtime |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Zod | Request validation |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |
| Swagger UI | API documentation |
| Jest + Supertest | Testing |

---

## 🏗 Architecture

```
Request → Routes → Middleware (Auth, Rate Limit) → Validation (Zod) → Controller → Service → Model → MongoDB
```

### Folder Structure

```
Task-3-Todo-Backend/
├── package.json
├── jest.config.js
├── .env.example
├── .gitignore
├── src/
│   ├── app.js                    # Express app setup
│   ├── server.js                 # Entry point
│   ├── config/
│   │   ├── index.js              # Environment config
│   │   └── database.js           # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User schema
│   │   └── Task.js               # Task schema
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── task.routes.js
│   │   └── health.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── task.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   └── task.service.js
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── errorHandler.js       # Centralized errors
│   │   └── validate.js           # Zod middleware
│   ├── validators/
│   │   ├── auth.validator.js
│   │   └── task.validator.js
│   ├── utils/
│   │   ├── AppError.js
│   │   └── response.js
│   └── docs/
│       └── swagger.js            # OpenAPI spec
├── tests/
│   ├── setup.js                  # In-memory MongoDB
│   └── api.test.js               # Integration tests
└── postman/
    └── Todo_Backend_API.postman_collection.json
```

---

## 💾 Database Schema

### User
| Field | Type | Details |
|-------|------|---------|
| name | String | Required, 2-100 chars |
| email | String | Required, unique, lowercase |
| password | String | Required, min 6 chars, hashed, never returned |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### Task
| Field | Type | Details |
|-------|------|---------|
| title | String | Required, 1-200 chars |
| description | String | Optional, max 2000 chars |
| status | String | `pending` / `in-progress` / `completed` |
| priority | String | `low` / `medium` / `high` |
| category | String | Default: `general` |
| dueDate | Date | Optional |
| completedAt | Date | Auto-set when status = completed |
| owner | ObjectId | Reference to User (indexed) |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

**Indexes:** `owner+status`, `owner+priority`, `owner+category`, `owner+dueDate`, `owner+createdAt`, text index on `title+description`

---

## 📦 Prerequisites

- Node.js v18+
- MongoDB v6+ running locally or remotely
- npm v9+

---

## 🚀 Installation & Setup

```bash
# Clone and navigate
cd Task-3-Todo-Backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Edit `.env` with your values:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/todo_backend` |
| `JWT_SECRET` | Secret key for JWT signing | **Must be set** |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Max auth attempts per window | `10` |

### Run the Server

```bash
# Development (with file watching)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:5001`

### Browser UI

The minimal frontend is served by the same Express server. Start the backend as above, then open **http://localhost:5001**. Sign in or create an account to manage your tasks. The UI uses the API on the same origin, so no separate frontend server or CORS setup is needed.

---

## 🔗 API Endpoints

**Base URL:** `http://localhost:5001/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/auth/me` | Yes | Get current user profile |

### Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tasks` | Yes | List tasks (filter, sort, paginate) |
| POST | `/tasks` | Yes | Create a new task |
| GET | `/tasks/:id` | Yes | Get a specific task |
| PATCH | `/tasks/:id` | Yes | Update a task |
| DELETE | `/tasks/:id` | Yes | Delete a task |
| PATCH | `/tasks/:id/status` | Yes | Update task status |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |

### Query Parameters for GET /tasks

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | int | `1` | Page number (1-1000) |
| `limit` | int | `10` | Items per page (1-100) |
| `status` | string | `pending` | Filter by status |
| `priority` | string | `high` | Filter by priority |
| `category` | string | `work` | Filter by category |
| `search` | string | `report` | Full-text search |
| `sortBy` | string | `dueDate` | Sort field |
| `sortOrder` | string | `asc` | Sort direction |

---

## 📝 Example API Requests

### Register
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'
```

### Create Task
```bash
curl -X POST http://localhost:5001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Complete report","priority":"high","category":"work","dueDate":"2026-12-31T23:59:59.000Z"}'
```

### Filter Tasks
```bash
curl "http://localhost:5001/api/v1/tasks?status=pending&priority=high&sortBy=dueDate&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ❌ Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / Validation error |
| 401 | Unauthorized |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Too many requests |
| 500 | Internal server error |

---

## 📚 API Documentation

- **Swagger UI:** http://localhost:5001/api/v1/docs (when server is running)
- **Postman:** Import `postman/Todo_Backend_API.postman_collection.json`

---

## 🧪 Testing

Tests use an in-memory MongoDB server — no external database needed:

```bash
npm test            # Run all tests
npm run test:verbose  # Verbose output
npm run test:coverage # With coverage
```

### Test Coverage
- User registration and login
- Duplicate email rejection
- Validation errors (missing fields, invalid email, short password)
- JWT authentication and rejection
- Task CRUD operations
- Task ownership scoping (users can't access others' tasks)
- Filtering by status and priority
- Pagination metadata
- Status updates with automatic `completedAt`
- Invalid ID handling
- Health check

---

## 🔒 Security Decisions

- Passwords hashed with bcryptjs (12 rounds)
- Passwords excluded from all JSON responses via Mongoose transform
- JWT tokens verified on every protected request
- Tasks scoped to owner — queries always filter by `owner` field
- Rate limiting on auth endpoints (10 requests per 15 minutes)
- Helmet for security headers
- Configurable CORS
- Body size limited to 10KB
- No stack traces in production responses

---

## ⚠️ Known Limitations

- No password reset or email verification
- No refresh token mechanism
- Text search requires MongoDB text indexes (created on first insert)
- No WebSocket support for real-time updates

---

## 🔮 Future Improvements

- Password reset via email
- Refresh tokens
- Task sharing between users
- Recurring tasks
- File attachments
- WebSocket notifications
- Task statistics/analytics dashboard

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| `MONGODB_URI is required` | Copy `.env.example` to `.env` and set your MongoDB URI |
| `MongoDB connection error` | Ensure MongoDB is running on the specified URI |
| `Invalid token` | Token may have expired; login again |
| Text search returns empty | Ensure the text index exists (insert at least one task first) |
