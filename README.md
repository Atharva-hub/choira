# Project & Task Management API

A RESTful API where users register, log in, manage their projects and tasks, filter and paginate tasks, and view dashboard statistics.

- **Users and projects** are stored in **MySQL** (relational data with a foreign key).
- **Tasks** are stored in **MongoDB** through **Mongoose**.
- Authentication uses **JWT**; passwords are hashed with **bcrypt**.
- The code base uses **ES modules** (`import` / `export`) throughout.

## Contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Installation and setup](#installation-and-setup)
4. [MySQL configuration](#mysql-configuration)
5. [MongoDB configuration](#mongodb-configuration)
6. [Environment variables](#environment-variables)
7. [Running the API](#running-the-api)
8. [Response format](#response-format)
9. [API reference](#api-reference)
10. [Database design](#database-design)
11. [Testing](#testing)
12. [Security notes](#security-notes)

## Tech stack

| Purpose | Technology |
| --- | --- |
| Runtime | Node.js 18+ (ES modules) |
| Web framework | Express 5 |
| Relational database | MySQL 8 with `mysql2` (connection pool, prepared statements) |
| Document database | MongoDB with Mongoose |
| Authentication | `jsonwebtoken` (JWT, HS256) |
| Password hashing | `bcrypt` |
| Validation | Joi |
| Security and logging | `helmet`, `cors`, `morgan` |
| Configuration | `dotenv` |

## Project structure

```
task-manager-api/
├── database/
│   └── schema.sql              # MySQL tables (users, projects)
├── postman/
│   └── task-manager-api.postman_collection.json
├── scripts/
│   └── initDb.js               # creates the MySQL database and tables
├── src/
│   ├── config/                 # env.js, mysql.js, mongo.js
│   ├── controllers/            # read request -> call service -> send response
│   ├── middleware/             # auth, validate, notFound, errorHandler
│   ├── models/                 # user + project (MySQL queries), task (Mongoose)
│   ├── routes/                 # URL -> middleware -> controller
│   ├── services/               # business rules
│   ├── utils/                  # ApiError, apiResponse, jwt
│   ├── validators/             # Joi schemas
│   ├── app.js                  # Express app (middleware + routes)
│   └── server.js               # connects databases, starts the server
├── tests/
│   └── api.test.js             # end-to-end tests (node:test)
├── .env.example
├── docker-compose.yml          # optional: MySQL + MongoDB in Docker
└── package.json
```

A request flows through the layers in one direction:

```
route -> authenticate -> validate -> controller -> service -> model -> database
                                                      |
                              any thrown error -> errorHandler -> JSON response
```

## Installation and setup

Prerequisites: Node.js 18 or newer, MySQL 8, MongoDB 6 or newer.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and fill in your own values
cp .env.example .env

# 3. Create the MySQL database and tables
npm run db:init

# 4. Start the API
npm run dev
```

The API is then available at `http://localhost:4000`. `GET /health` confirms it is running.

## MySQL configuration

1. Make sure MySQL is running (macOS with Homebrew: `brew services start mysql`).
2. Put your MySQL credentials in `.env` (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
3. Run `npm run db:init`. It creates the database named in `MYSQL_DATABASE` if it does not exist, then runs `database/schema.sql` to create the `users` and `projects` tables. It is safe to run more than once.

If you prefer a dedicated MySQL user instead of `root`, create one first:

```sql
CREATE DATABASE IF NOT EXISTS task_manager;
CREATE USER 'task_user'@'localhost' IDENTIFIED BY '<choose-a-password>';
GRANT ALL PRIVILEGES ON task_manager.* TO 'task_user'@'localhost';
FLUSH PRIVILEGES;
```

To apply the schema by hand instead of using the script:

```bash
mysql -u <user> -p task_manager < database/schema.sql
```

## MongoDB configuration

1. Make sure MongoDB is running (macOS with Homebrew: `brew services start mongodb-community`), or create a free MongoDB Atlas cluster.
2. Set `MONGO_URI` in `.env`:
   - Local: `mongodb://localhost:27017/task_manager`
   - Atlas: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/task_manager`

No manual setup is needed. MongoDB creates the database and the `tasks` collection on the first write, and Mongoose creates the indexes defined in `src/models/task.model.js`.

### Optional: run both databases with Docker

If you have Docker, `docker compose up -d` starts MySQL and MongoDB using the values from your `.env` file. Use a non-root `MYSQL_USER` with this option, then run `npm run db:init`.

## Environment variables

Copy `.env.example` to `.env`. The app refuses to start if a required variable is missing.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `PORT` | no | `4000` | Port the API listens on |
| `MYSQL_HOST` | yes | | MySQL host |
| `MYSQL_PORT` | no | `3306` | MySQL port |
| `MYSQL_USER` | yes | | MySQL user |
| `MYSQL_PASSWORD` | no | empty | MySQL password |
| `MYSQL_DATABASE` | yes | | MySQL database name |
| `MONGO_URI` | yes | | MongoDB connection string |
| `JWT_SECRET` | yes | | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | no | `1d` | Token lifetime (`15m`, `12h`, `7d`, ...) |
| `BCRYPT_SALT_ROUNDS` | no | `10` | bcrypt cost factor |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Running the API

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server and restarts it when a file changes |
| `npm start` | Starts the server |
| `npm run db:init` | Creates the MySQL database and tables |
| `npm test` | Runs the end-to-end tests |

## Response format

Every response has the same shape.

Success:

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": { "project": { "id": 1, "name": "Website Redesign" } }
}
```

List endpoints with pagination add a `pagination` object next to `data`.

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email" }
  ]
}
```

`errors` is an empty array when there are no field-level details.

### Status codes

| Code | Meaning in this API |
| --- | --- |
| `200` | Request succeeded |
| `201` | Resource created |
| `400` | Validation failed, invalid ID, or malformed JSON |
| `401` | Missing, invalid or expired token; wrong email or password |
| `404` | Resource or route not found (also returned for resources owned by another user) |
| `409` | Duplicate email |
| `500` | Unexpected server or database error (details are logged, not returned) |

## API reference

Base URL: `http://localhost:4000`

All endpoints except `register` and `login` require the header:

```
Authorization: Bearer <token>
```

### Summary

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | no | Create an account |
| POST | `/api/auth/login` | no | Log in and receive a token |
| GET | `/api/auth/me` | yes | Get the logged-in user's profile |
| PUT | `/api/auth/profile` | yes | Update the logged-in user's profile |
| POST | `/api/projects` | yes | Create a project |
| GET | `/api/projects` | yes | List my projects (optional `?status=`) |
| GET | `/api/projects/:id` | yes | Get one project |
| PUT | `/api/projects/:id` | yes | Update a project |
| DELETE | `/api/projects/:id` | yes | Delete a project and its tasks |
| POST | `/api/tasks` | yes | Create a task in one of my projects |
| GET | `/api/tasks` | yes | List my tasks (pagination and filters) |
| GET | `/api/tasks/:id` | yes | Get one task |
| PUT | `/api/tasks/:id` | yes | Update a task |
| DELETE | `/api/tasks/:id` | yes | Delete a task |
| GET | `/api/dashboard` | yes | Statistics for the logged-in user |

### Authentication

#### POST /api/auth/register

| Field | Rules |
| --- | --- |
| `name` | required, 2 to 100 characters |
| `email` | required, valid email, unique |
| `password` | required, 8 to 72 characters, at least one letter and one number |

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Atharva","email":"atharva@example.com","password":"Password123"}'
```

`201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "Atharva",
      "email": "atharva@example.com",
      "createdAt": "2026-10-10T08:26:42.000Z",
      "updatedAt": "2026-10-10T08:26:42.000Z"
    },
    "token": "<jwt>"
  }
}
```

`409 Conflict` when the email is already registered:

```json
{ "success": false, "message": "An account with this email already exists", "errors": [] }
```

`400 Bad Request` when validation fails:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "name length must be at least 2 characters long" },
    { "field": "email", "message": "email must be a valid email" },
    { "field": "password", "message": "password length must be at least 8 characters long" }
  ]
}
```

#### POST /api/auth/login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"atharva@example.com","password":"Password123"}'
```

`200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": 1, "name": "Atharva", "email": "atharva@example.com", "createdAt": "...", "updatedAt": "..." },
    "token": "<jwt>"
  }
}
```

`401 Unauthorized` for an unknown email or a wrong password (same message for both):

```json
{ "success": false, "message": "Invalid email or password", "errors": [] }
```

#### GET /api/auth/me

```bash
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer <token>"
```

`200 OK`

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "user": { "id": 1, "name": "Atharva", "email": "atharva@example.com", "createdAt": "...", "updatedAt": "..." }
  }
}
```

`401 Unauthorized` without a token:

```json
{ "success": false, "message": "Access token is missing. Send it as: Authorization: Bearer <token>", "errors": [] }
```

#### PUT /api/auth/profile

Send at least one of `name`, `email`, `password`. Changing the password also requires `currentPassword`. The user is always taken from the token, so a user can only update their own profile.

```bash
curl -X PUT http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Atharva V","password":"NewPassword456","currentPassword":"Password123"}'
```

`200 OK`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { "id": 1, "name": "Atharva V", "email": "atharva@example.com", "createdAt": "...", "updatedAt": "..." }
  }
}
```

Errors: `400` (empty body or `password` without `currentPassword`), `401` (wrong `currentPassword`), `409` (email already used by another account).

### Projects

Project fields:

| Field | Rules |
| --- | --- |
| `name` | required on create, 1 to 150 characters |
| `description` | optional, up to 2000 characters |
| `status` | optional, one of `active`, `completed`, `archived` (default `active`) |

#### POST /api/projects

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign","description":"New marketing site"}'
```

`201 Created`

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": 1,
      "userId": 1,
      "name": "Website Redesign",
      "description": "New marketing site",
      "status": "active",
      "createdAt": "2026-10-10T08:26:42.000Z",
      "updatedAt": "2026-10-10T08:26:42.000Z"
    }
  }
}
```

#### GET /api/projects

Returns only the logged-in user's projects, newest first. Optional filter: `?status=active`.

```bash
curl "http://localhost:4000/api/projects?status=active" -H "Authorization: Bearer <token>"
```

`200 OK`

```json
{
  "success": true,
  "message": "Projects fetched successfully",
  "data": { "projects": [ { "id": 1, "userId": 1, "name": "Website Redesign", "status": "active", "...": "..." } ] }
}
```

#### GET /api/projects/:id

`200 OK` with `data.project`.
`400` when the id is not a positive integer:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [ { "field": "id", "message": "id must be a valid project id" } ]
}
```

`404` when the project does not exist or belongs to another user:

```json
{ "success": false, "message": "Project not found", "errors": [] }
```

#### PUT /api/projects/:id

Send at least one of `name`, `description`, `status`.

```bash
curl -X PUT http://localhost:4000/api/projects/1 \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

`200 OK` with the updated `data.project`. Errors: `400`, `404`.

#### DELETE /api/projects/:id

Deletes the project from MySQL and its tasks from MongoDB.

`200 OK`

```json
{ "success": true, "message": "Project deleted successfully", "data": { "deletedTasks": 3 } }
```

### Tasks

Task fields:

| Field | Rules |
| --- | --- |
| `title` | required on create, 1 to 200 characters |
| `description` | optional, up to 2000 characters |
| `status` | optional, one of `todo`, `in_progress`, `completed` (default `todo`) |
| `priority` | optional, one of `low`, `medium`, `high` (default `medium`) |
| `dueDate` | optional, ISO date such as `2026-11-01`, or `null` |
| `completedAt` | read-only; set automatically when `status` becomes `completed`, cleared when the task is reopened |
| `projectId` | required on create; must be a project owned by the logged-in user |

#### POST /api/tasks

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Design homepage","priority":"high","dueDate":"2026-11-01","projectId":1}'
```

`201 Created`

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": "6ac9f69e36734bd2f9cfa534",
      "title": "Design homepage",
      "description": "",
      "status": "todo",
      "priority": "high",
      "dueDate": "2026-11-01T00:00:00.000Z",
      "completedAt": null,
      "projectId": 1,
      "ownerId": 1,
      "createdAt": "2026-10-10T08:26:06.347Z",
      "updatedAt": "2026-10-10T08:26:06.347Z"
    }
  }
}
```

`404` when `projectId` does not exist or belongs to another user:

```json
{ "success": false, "message": "Project not found", "errors": [] }
```

#### GET /api/tasks

Returns the logged-in user's tasks, newest first.

| Query parameter | Rules | Default |
| --- | --- | --- |
| `page` | integer, 1 or more | `1` |
| `limit` | integer, 1 to 100 | `10` |
| `status` | `todo`, `in_progress`, `completed` | none |
| `priority` | `low`, `medium`, `high` | none |
| `projectId` | positive integer | none |

```bash
curl "http://localhost:4000/api/tasks?page=1&limit=10&status=todo&priority=high" \
  -H "Authorization: Bearer <token>"
```

`200 OK`

```json
{
  "success": true,
  "message": "Tasks fetched successfully",
  "data": {
    "tasks": [
      {
        "id": "6ac9f69e36734bd2f9cfa534",
        "title": "Design homepage",
        "description": "",
        "status": "todo",
        "priority": "high",
        "dueDate": "2026-11-01T00:00:00.000Z",
        "completedAt": null,
        "projectId": 1,
        "ownerId": 1,
        "createdAt": "2026-10-10T08:26:06.347Z",
        "updatedAt": "2026-10-10T08:26:06.347Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

`400` for invalid query values such as `page=0`, `limit=1000` or `status=done`.

#### GET /api/tasks/:id

`200 OK` with `data.task`.
`400` when the id is not a valid MongoDB ObjectId:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [ { "field": "id", "message": "id must be a valid task id" } ]
}
```

`404` when the task does not exist or belongs to another user:

```json
{ "success": false, "message": "Task not found", "errors": [] }
```

#### PUT /api/tasks/:id

Send at least one task field. If `projectId` changes, the new project must also belong to the logged-in user.

```bash
curl -X PUT http://localhost:4000/api/tasks/6ac9f69e36734bd2f9cfa534 \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

`200 OK` with the updated `data.task`. Errors: `400`, `404`.

#### DELETE /api/tasks/:id

`200 OK`

```json
{ "success": true, "message": "Task deleted successfully", "data": null }
```

### Dashboard

#### GET /api/dashboard

```bash
curl http://localhost:4000/api/dashboard -H "Authorization: Bearer <token>"
```

`200 OK`

```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "stats": {
      "totalProjects": 2,
      "activeProjects": 1,
      "completedProjects": 1,
      "totalTasks": 13,
      "pendingTasks": 9,
      "completedTasks": 4,
      "highPriorityTasks": 5
    }
  }
}
```

Project numbers come from MySQL and task numbers from MongoDB; the queries run in parallel. A pending task is any task that is not completed (`todo` or `in_progress`).

## Database design

### MySQL

`users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT UNSIGNED | primary key, auto increment |
| `name` | VARCHAR(100) | |
| `email` | VARCHAR(255) | unique index |
| `password_hash` | VARCHAR(255) | bcrypt hash, never returned by the API |
| `created_at`, `updated_at` | TIMESTAMP | maintained by MySQL |

`projects`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT UNSIGNED | primary key, auto increment |
| `user_id` | INT UNSIGNED | foreign key to `users.id`, `ON DELETE CASCADE` |
| `name` | VARCHAR(150) | |
| `description` | TEXT | nullable |
| `status` | ENUM | `active`, `completed`, `archived` |
| `created_at`, `updated_at` | TIMESTAMP | maintained by MySQL |

Index `(user_id, status)` supports listing a user's projects and the dashboard counts.

### MongoDB

`tasks` collection (Mongoose model `Task`): `title`, `description`, `status`, `priority`, `dueDate`, `completedAt`, `projectId`, `ownerId`, `createdAt`, `updatedAt`.

Indexes: `{ ownerId, createdAt }`, `{ ownerId, projectId }`, `{ ownerId, status, priority }`.

### Design decisions

- **Linking the two databases.** A task stores `projectId` and `ownerId` as numbers that match the MySQL primary keys. A foreign key cannot span two databases, so the service layer checks that the project exists and belongs to the user before a task is created or moved.
- **`ownerId` on every task.** Listing, filtering and dashboard counts only need MongoDB, with no MySQL lookup per task.
- **Ownership in every query.** Project queries include `user_id = ?` and task queries include `ownerId`, so data is isolated at the query level.
- **404 instead of 403** for resources owned by someone else, so the API does not reveal which IDs exist.
- **Deleting a project** removes its tasks in MongoDB from the service layer. The two deletes are not one transaction; the project row is removed first because it is the source of truth for ownership.
- **Timestamps** are stored and returned in UTC.

## Testing

### Postman

Import `postman/task-manager-api.postman_collection.json` into Postman (or Thunder Client). The collection variable `baseUrl` defaults to `http://localhost:4000`.

Run the requests from top to bottom. Register and Login save the token, and Create Project and Create Task save their ids, so later requests work without copying values by hand. The collection covers authentication, project and task CRUD, pagination, filtering, validation errors and unauthorized access.

### Automated tests

```bash
npm test
```

The tests start the app on a random port and call it over HTTP, using the databases from your `.env` file. They create their own users with unique emails and delete everything they created when they finish.

## Security notes

- Passwords are hashed with bcrypt and the hash never leaves the service layer.
- JWTs are signed with a secret from the environment, expire, and are verified on every protected request. The user is reloaded from MySQL each time, so a token for a deleted account stops working.
- All SQL uses prepared statements with placeholders.
- Request data is validated with Joi; unknown fields are stripped before they reach a service.
- Login returns the same message for an unknown email and a wrong password.
- `helmet` sets security headers and JSON bodies are limited to 10 kB.
- Secrets live only in `.env`, which is ignored by Git.
