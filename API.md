# Termageddon API

## Overview

The Termageddon API is a Django REST Framework-based service for managing a corporate glossary system with approval workflows, perspective-based organization, and collaborative editing.

## API Documentation

### Interactive Documentation
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **ReDoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **OpenAPI Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

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

## Domain Concepts

### Perspectives
Categories or domains for organizing terms (e.g., 'Finance', 'Technology', 'Legal').

### Terms
Globally unique terms in the glossary (e.g., 'API', 'ROI', 'GDPR').

### Entries
A (term, perspective) pair that can have multiple drafts and definitions.

### Drafts
Proposed definitions for entries that require approval before becoming active.

### Approval Workflow
- Drafts require 2 approvals before they can be published
- Authors cannot approve their own drafts
- Published drafts become the active definition for an entry

## Key Endpoints

### Core Resources
- `GET /perspectives/` - List perspectives
- `GET /terms/` - List terms
- `GET /entries/` - List entries
- `GET /entry-drafts/` - List drafts

### Custom Actions
- `GET /entries/grouped-by-term/` - Entries grouped by term for glossary display
- `POST /entries/create-with-term/` - Create term and entry atomically
- `POST /entries/lookup-or-create-entry/` - Lookup or create entry
- `POST /entry-drafts/{id}/approve/` - Approve a draft
- `POST /entry-drafts/{id}/request-review/` - Request specific users to review

### Workflow Examples

#### 1. Create Term and Entry
```bash
curl -X POST http://localhost:8000/api/entries/create-with-term/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"term_text": "API", "perspective_id": 1}'
```

#### 2. Create Draft
```bash
curl -X POST http://localhost:8000/api/entry-drafts/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <your-token>" \
  -d '{"entry": 1, "content": "Application Programming Interface"}'
```

#### 3. Approve Draft
```bash
curl -X POST http://localhost:8000/api/entry-drafts/1/approve/ \
  -H "Authorization: Token <your-token>"
```

#### 4. Publish Draft
```bash
curl -X POST http://localhost:8000/api/entry-drafts/1/publish/ \
  -H "Authorization: Token <your-token>"
```

## Response Format

All responses are JSON with pagination for list endpoints:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/endpoint/?page=3",
  "previous": "http://localhost:8000/api/endpoint/?page=1",
  "results": [...]
}
```

## Error Handling

Standard HTTP status codes with JSON error responses:

- `400` - Bad Request: Validation errors
- `401` - Unauthorized: Missing or invalid token
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource doesn't exist
- `500` - Internal Server Error: Server error

## CORS

CORS enabled for:
- `http://localhost:4200` (Angular dev server)
- `http://localhost:4201`

## Testing

Run the test suite:

```bash
cd backend
source venv/bin/activate
python -m pytest
```

## Support

For detailed endpoint documentation, use the interactive Swagger UI at `/api/docs/`.
