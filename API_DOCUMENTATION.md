# Termageddon API Documentation

## Overview

The Termageddon API is a Django REST Framework-based service that provides endpoints for managing a corporate glossary system. It supports authentication, term management, draft control, approval workflows, and commenting with perspective-based organization.

## Base URL

```
http://localhost:8000/api/
```

## Authentication

The API uses token-based authentication. Include the token in the Authorization header:

```
Authorization: Token <your-token>
```

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "is_staff": false,
    "is_perspective_curator": false
  }
}
```

### Logout
```http
POST /auth/logout/
Authorization: Token <your-token>
```

**Response:**
```json
{}
```

### Current User
```http
GET /auth/me/
Authorization: Token <your-token>
```

**Response:**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "is_staff": false,
  "is_domain_expert": false
}
```

## Perspectives

### List Perspectives
```http
GET /perspectives/
Authorization: Token <your-token>
```

**Query Parameters:**
- `search` (string): Search by name
- `ordering` (string): Order by field (e.g., `name`, `-name`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/perspectives/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "string",
      "description": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Perspective
```http
GET /perspectives/{id}/
Authorization: Token <your-token>
```

### Create Perspective
```http
POST /perspectives/
Authorization: Token <your-token>
Content-Type: application/json

{
  "name": "string",
  "description": "string"
}
```

### Update Perspective
```http
PATCH /perspectives/{id}/
Authorization: Token <your-token>
Content-Type: application/json

{
  "name": "string",
  "description": "string"
}
```

## Terms

### List Terms
```http
GET /terms/
Authorization: Token <your-token>
```

**Query Parameters:**
- `search` (string): Search by term text
- `perspective` (integer): Filter by perspective ID
- `ordering` (string): Order by field (e.g., `text`, `-text`, `updated_at`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/terms/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "text": "string",
      "text_normalized": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Term
```http
GET /terms/{id}/
Authorization: Token <your-token>
```

### Create Term
```http
POST /terms/
Authorization: Token <your-token>
Content-Type: application/json

{
  "text": "string"
}
```

## Entries

### List Entries
```http
GET /entries/
Authorization: Token <your-token>
```

**Query Parameters:**
- `search` (string): Search by term text
- `perspective` (integer): Filter by perspective ID
- `is_official` (boolean): Filter by official status
- `approval_status` (string): Filter by approval status (`approved`, `pending`, `no_draft`)
- `author` (integer): Filter by author ID
- `created_after` (date): Filter entries created after date (YYYY-MM-DD)
- `created_before` (date): Filter entries created before date (YYYY-MM-DD)
- `ordering` (string): Order by field (e.g., `term__text`, `created_at`, `updated_at`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/entries/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "term": {
        "id": 1,
        "text": "string",
        "text_normalized": "string"
      },
      "perspective": {
        "id": 1,
        "name": "string",
        "description": "string"
      },
      "is_official": true,
      "active_draft": {
        "id": 1,
        "content": "string",
        "approval_count": 2,
        "is_published": true,
        "author": {
          "id": 1,
          "username": "string",
          "first_name": "string",
          "last_name": "string"
        },
        "approvers": [
          {
            "id": 1,
            "username": "string",
            "first_name": "string",
            "last_name": "string"
          }
        ],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Entry
```http
GET /entries/{id}/
Authorization: Token <your-token>
```

### Create Entry
```http
POST /entries/
Authorization: Token <your-token>
Content-Type: application/json

{
  "term": 1,
  "perspective": 1,
  "is_official": false
}
```

### Mark Entry as Official
```http
POST /entries/{id}/mark-official/
Authorization: Token <your-token>
```

## Entry Drafts

### List Entry Drafts
```http
GET /entry-drafts/
Authorization: Token <your-token>
```

**Query Parameters:**
- `entry` (integer): Filter by entry ID
- `author` (integer): Filter by author ID
- `is_published` (boolean): Filter by published status
- `ordering` (string): Order by field (e.g., `created_at`, `-created_at`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/entry-drafts/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "entry": 1,
      "content": "string",
      "approval_count": 2,
      "is_published": true,
      "author": {
        "id": 1,
        "username": "string",
        "first_name": "string",
        "last_name": "string"
      },
      "approvers": [
        {
          "id": 1,
          "username": "string",
          "first_name": "string",
          "last_name": "string"
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Entry Draft
```http
GET /entry-drafts/{id}/
Authorization: Token <your-token>
```

### Create Entry Draft
```http
POST /entry-drafts/
Authorization: Token <your-token>
Content-Type: application/json

{
  "entry": 1,
  "content": "string"
}
```

### Update Entry Draft
```http
PATCH /entry-drafts/{id}/
Authorization: Token <your-token>
Content-Type: application/json

{
  "content": "string"
}
```

### Approve Entry Draft
```http
POST /entry-drafts/{id}/approve/
Authorization: Token <your-token>
```

**Response:**
```json
{
  "message": "Draft approved successfully",
  "approval_count": 2,
  "is_published": true
}
```

### Get Unpublished Draft for Entry
```http
GET /entry-drafts/unpublished/{entry_id}/
Authorization: Token <your-token>
```

## Comments

### List Comments
```http
GET /comments/
Authorization: Token <your-token>
```

**Query Parameters:**
- `entry` (integer): Filter by entry ID
- `resolved` (boolean): Filter by resolved status
- `author` (integer): Filter by author ID
- `ordering` (string): Order by field (e.g., `created_at`, `-created_at`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/comments/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "entry": 1,
      "content": "string",
      "resolved": false,
      "author": {
        "id": 1,
        "username": "string",
        "first_name": "string",
        "last_name": "string"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Comment
```http
GET /comments/{id}/
Authorization: Token <your-token>
```

### Create Comment
```http
POST /comments/
Authorization: Token <your-token>
Content-Type: application/json

{
  "entry": 1,
  "content": "string"
}
```

### Update Comment
```http
PATCH /comments/{id}/
Authorization: Token <your-token>
Content-Type: application/json

{
  "content": "string"
}
```

### Resolve Comment
```http
POST /comments/{id}/resolve/
Authorization: Token <your-token>
```

### Unresolve Comment
```http
POST /comments/{id}/unresolve/
Authorization: Token <your-token>
```

## Users

### List Users
```http
GET /users/
Authorization: Token <your-token>
```

**Query Parameters:**
- `search` (string): Search by username, first name, or last name
- `is_perspective_curator` (boolean): Filter by perspective curator status
- `ordering` (string): Order by field (e.g., `username`, `first_name`, `last_name`)

**Response:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "string",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "is_staff": false,
      "is_perspective_curator": false,
      "date_joined": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "field_name": ["Error message"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "A server error occurred."
}
```

## Pagination

All list endpoints support pagination with the following parameters:

- `page` (integer): Page number (default: 1)
- `page_size` (integer): Number of items per page (default: 50, max: 100)

**Response Format:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/endpoint/?page=3",
  "previous": "http://localhost:8000/api/endpoint/?page=1",
  "results": [...]
}
```

## Rate Limiting

The API implements rate limiting:

- **Anonymous users:** 100 requests per hour
- **Authenticated users:** 1000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:
- `http://localhost:4200` (Angular development server)
- `http://127.0.0.1:4200`

## Content Types

- **Request Content-Type:** `application/json`
- **Response Content-Type:** `application/json`

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Examples

### Complete Workflow Example

1. **Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

2. **Create a Domain:**
```bash
curl -X POST http://localhost:8000/api/domains/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"name": "Technology", "description": "Technology-related terms"}'
```

3. **Create a Term:**
```bash
curl -X POST http://localhost:8000/api/terms/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"text": "API"}'
```

4. **Create an Entry:**
```bash
curl -X POST http://localhost:8000/api/entries/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"term": 1, "domain": 1, "is_official": false}'
```

5. **Create a Version:**
```bash
curl -X POST http://localhost:8000/api/entry-versions/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"entry": 1, "content": "Application Programming Interface"}'
```

6. **Approve the Version:**
```bash
curl -X POST http://localhost:8000/api/entry-versions/1/approve/ \
  -H "Authorization: Token <your-token>"
```

7. **Mark Entry as Official:**
```bash
curl -X POST http://localhost:8000/api/entries/1/mark-official/ \
  -H "Authorization: Token <your-token>"
```

## Testing

The API includes comprehensive test coverage. Run tests with:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

## Support

For API support or questions, please refer to the main project documentation or contact the development team.
