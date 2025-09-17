# Auth setup

Environment variables:

- `DATABASE_URL` (optional for local) e.g. `postgresql+psycopg://trvl:trvl@localhost:5432/trvl`
- `GOOGLE_CLIENT_ID` Google OAuth client ID for Web

Endpoints:

- POST `/auth/google` { id_token } → { token, user }
- GET `/auth/me` with `Authorization: Bearer <token>` → user
- POST `/auth/logout` with `Authorization: Bearer <token>`


# TRVL API

Run locally:

```bash
uvicorn app.main:app --reload --port 8000
```

Database:

- Start Postgres with docker-compose at repo root: `docker compose up -d db`
- Connection (default): `postgresql://trvl:trvl@localhost:5432/trvl`
