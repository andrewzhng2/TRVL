
# TRVL API

Run locally:

```bash
uvicorn app.main:app --reload --port 8000
```

Database:

- Start Postgres with docker-compose at repo root: `docker compose up -d db`
- Connection (default): `postgresql://trvl:trvl@localhost:5432/trvl`
