
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import backlog, auth, trips

app = FastAPI(title="TRVL API")

# CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://accounts.google.com",
        "https://your-app.vercel.app",   # update after you deploy frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# Example protected (service role) usage placeholder:
@app.get("/api/example")
def example():
    return {"message": "Hello from FastAPI on Render!"}

app.include_router(backlog.router)
app.include_router(auth.router)
app.include_router(trips.router)
