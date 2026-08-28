"""
Tiny in-memory TTL cache — used for read-heavy, non-sensitive endpoints
(e.g. admin stats) where a few seconds of staleness is fine and it saves
a round trip to the database on every request. NOT used for anything
security-sensitive (login, password checks) — those must always hit the
database fresh.

This is intentionally simple (a dict in process memory) rather than
Redis/Memcached: the app runs as a single backend instance, so a shared
external cache isn't needed yet. If the app is ever scaled to multiple
backend instances, swap this for Redis so all instances share one cache.
"""
import time
from functools import wraps

_cache: dict[str, tuple[float, object]] = {}


def cached(key: str, ttl_seconds: int = 30):
    """Decorator: caches a function's return value for ttl_seconds,
    keyed by `key` (+ any call args, so per-user caching works too)."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            cache_key = f"{key}:{args}:{sorted(kwargs.items())}"
            now = time.time()
            hit = _cache.get(cache_key)
            if hit and hit[0] > now:
                return hit[1]
            result = fn(*args, **kwargs)
            _cache[cache_key] = (now + ttl_seconds, result)
            return result
        return wrapper
    return decorator


def invalidate(prefix: str):
    """Drop all cached entries whose key starts with `prefix` — call this
    after any write (create/update/delete) that would make cached reads stale."""
    for k in [k for k in _cache if k.startswith(prefix)]:
        del _cache[k]


class TTLValue:
    """Simplest possible single-value cache with a time-to-live — used
    where the cached function takes non-hashable args (like a DB session)
    so the generic `cached` decorator above doesn't fit."""

    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self._value = None
        self._expires_at = 0.0

    def get(self):
        if self._value is not None and time.time() < self._expires_at:
            return self._value
        return None

    def set(self, value):
        self._value = value
        self._expires_at = time.time() + self.ttl_seconds

    def clear(self):
        self._value = None
        self._expires_at = 0.0
