import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


@lru_cache
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
        )
    return create_client(url, key)


class _SupabaseProxy:
    """Lazy proxy so the app can boot even if Supabase env vars are missing."""

    def __getattr__(self, name: str):
        return getattr(get_supabase(), name)


supabase = _SupabaseProxy()
