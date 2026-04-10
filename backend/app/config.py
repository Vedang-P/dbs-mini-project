import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/dbs_mini_project",
)
API_TITLE = "Database-Driven Shopping Cart API"
AUTH_TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET", "change-this-in-production")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "24"))
