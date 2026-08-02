"""Database layer: Postgres (e.g. Neon) via psycopg2, with a thin compatibility
wrapper so the rest of the app can keep using sqlite-style `?` placeholders and
row access (row["col"] or row[0]).
"""
import hashlib
import json
import os
import re
import secrets
from datetime import datetime, timedelta

import psycopg2
import psycopg2.pool

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

STATUSES = ["Pending", "Completed", "Cancelled"]
CLOSED_STATUSES = ("Completed", "Cancelled")

SEED_SERVICES = [
    "Passport",
    "Driving Licence",
    "PAN Card",
    "Aadhaar Update",
    "Visa",
    "Flight Ticket",
    "Train Ticket",
    "Other",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    salt     TEXT NOT NULL DEFAULT '',
    role     TEXT NOT NULL DEFAULT 'staff',
    active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS clients (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    alt_phone  TEXT NOT NULL DEFAULT '',
    address    TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_types (
    id     SERIAL PRIMARY KEY,
    name   TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jobs (
    id               SERIAL PRIMARY KEY,
    client_id        INTEGER NOT NULL REFERENCES clients(id),
    service_type_id  INTEGER NOT NULL REFERENCES service_types(id),
    details          TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'Pending',
    next_action      TEXT NOT NULL DEFAULT '',
    next_action_date TEXT NOT NULL DEFAULT '',
    amount_quoted    INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL,
    created_by       INTEGER REFERENCES users(id),
    assigned_name    TEXT NOT NULL DEFAULT '',
    completed_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS payments (
    id          SERIAL PRIMARY KEY,
    job_id      INTEGER NOT NULL REFERENCES jobs(id),
    amount      INTEGER NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    received_by INTEGER REFERENCES users(id),
    received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);

CREATE TABLE IF NOT EXISTS job_notes (
    id         SERIAL PRIMARY KEY,
    job_id     INTEGER NOT NULL REFERENCES jobs(id),
    kind       TEXT NOT NULL DEFAULT 'note',
    text       TEXT NOT NULL,
    user_id    INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes(job_id);
"""

# Tables with a SERIAL "id" primary key — used to auto-add "RETURNING id" to
# INSERT statements so callers can keep using sqlite-style cur.lastrowid.
# "sessions" is deliberately excluded (its primary key is "token", not "id").
_ID_TABLES = {"users", "clients", "service_types", "jobs", "payments", "job_notes"}


# ---------------------------------------------------------------- config

def get_database_url():
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() == "DATABASE_URL":
                    return v.strip().strip('"').strip("'")
    raise RuntimeError(
        "DATABASE_URL is not set.\n"
        "Create a file named '.env' in the CRM folder containing one line:\n"
        "DATABASE_URL=postgres://...   (copy this from your Neon dashboard)"
    )


# ---------------------------------------------------------------- row + connection wrapper

class Row:
    """Behaves like sqlite3.Row: supports row['col'], row[0], dict(row)."""
    __slots__ = ("_cols", "_data")

    def __init__(self, cols, data):
        self._cols = cols
        self._data = data

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._data[key]
        try:
            idx = self._cols.index(key)
        except ValueError:
            raise KeyError(key)
        return self._data[idx]

    def keys(self):
        return self._cols

    def __iter__(self):
        return iter(self._data)

    def __repr__(self):
        return repr(dict(zip(self._cols, self._data)))


class ResultProxy:
    def __init__(self, cur, lastrowid=None):
        self._cur = cur
        self.lastrowid = lastrowid
        self._cols = tuple(d[0] for d in cur.description) if cur.description else ()

    def fetchone(self):
        row = self._cur.fetchone()
        return Row(self._cols, row) if row is not None else None

    def fetchall(self):
        return [Row(self._cols, row) for row in self._cur.fetchall()]

    def __iter__(self):
        return iter(self.fetchall())


_INSERT_RE = re.compile(r"INSERT\s+INTO\s+(\w+)", re.IGNORECASE)


class Conn:
    """Thin wrapper matching the small subset of sqlite3.Connection's
    interface the app relies on, backed by a pooled psycopg2 connection."""

    def __init__(self, raw):
        self._raw = raw

    def execute(self, sql, params=()):
        pg_sql = sql.replace("?", "%s")
        stripped = pg_sql.strip()
        auto_returning = False
        if stripped.upper().startswith("INSERT INTO") and "RETURNING" not in stripped.upper():
            m = _INSERT_RE.match(stripped)
            if m and m.group(1).lower() in _ID_TABLES:
                pg_sql = stripped.rstrip().rstrip(";") + " RETURNING id"
                auto_returning = True
        cur = self._raw.cursor()
        cur.execute(pg_sql, params)
        lastrowid = None
        if auto_returning:
            row = cur.fetchone()
            lastrowid = row[0] if row else None
        return ResultProxy(cur, lastrowid)

    def executescript(self, sql):
        cur = self._raw.cursor()
        cur.execute(sql)

    def commit(self):
        pass  # autocommit is on — every statement is already durable

    def close(self):
        _get_pool().putconn(self._raw)


_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(1, 10, get_database_url())
    return _pool


def connect():
    raw = _get_pool().getconn()
    # Autocommit avoids Postgres' "current transaction is aborted" trap: with
    # explicit transactions, one failed statement blocks every later command
    # on that connection until a rollback. Autocommit makes each statement
    # its own transaction, matching how this app was written against SQLite.
    raw.autocommit = True
    return Conn(raw)


# ---------------------------------------------------------------- auth helpers

PBKDF2_ITERATIONS = 200_000
SESSION_DAYS = 30


def new_salt():
    return secrets.token_hex(16)


def pin_hash(salt, pin):
    return hashlib.pbkdf2_hmac("sha256", str(pin).encode(), salt.encode(), PBKDF2_ITERATIONS).hex()


def pin_hash_legacy(name, pin):
    """Old unsalted scheme — kept only so any account created before the
    salted scheme existed still upgrades automatically on next login."""
    return hashlib.sha256(f"{name.strip().lower()}:{pin}".encode()).hexdigest()


def verify_pin(con, user, pin):
    if user["salt"]:
        return pin_hash(user["salt"], pin) == user["pin_hash"]
    if pin_hash_legacy(user["name"], pin) == user["pin_hash"]:
        salt = new_salt()
        con.execute("UPDATE users SET salt = ?, pin_hash = ? WHERE id = ?",
                    (salt, pin_hash(salt, pin), user["id"]))
        return True
    return False


def set_pin(con, user_id, pin):
    salt = new_salt()
    con.execute("UPDATE users SET salt = ?, pin_hash = ? WHERE id = ?",
                (salt, pin_hash(salt, pin), user_id))


def now():
    return datetime.now().isoformat(timespec="seconds")


def today():
    return datetime.now().date().isoformat()


def create_session(con, user_id):
    token = secrets.token_hex(24)
    expires = (datetime.now() + timedelta(days=SESSION_DAYS)).isoformat(timespec="seconds")
    con.execute("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (token, user_id, now(), expires))
    return token


def get_session_user(con, token):
    if not token:
        return None
    return con.execute(
        """SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token = ? AND s.expires_at > ? AND u.active = 1""",
        (token, now()),
    ).fetchone()


def delete_session(con, token):
    con.execute("DELETE FROM sessions WHERE token = ?", (token,))


def delete_sessions_for_user(con, user_id):
    con.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))


def cleanup_expired_sessions(con):
    con.execute("DELETE FROM sessions WHERE expires_at <= ?", (now(),))


# ---------------------------------------------------------------- init / backup

def init():
    con = connect()
    con.executescript(SCHEMA)
    if con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        salt = new_salt()
        con.execute(
            "INSERT INTO users (name, pin_hash, salt, role) VALUES (?, ?, ?, 'admin')",
            ("Admin", pin_hash(salt, "1234"), salt),
        )
    for name in SEED_SERVICES:
        con.execute("INSERT INTO service_types (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (name,))
    cleanup_expired_sessions(con)
    con.close()


BACKUP_TABLES = ["users", "clients", "service_types", "jobs", "payments", "job_notes", "sessions"]


def backup():
    """Postgres has no single-file VACUUM INTO equivalent, so this exports
    every table to a timestamped JSON snapshot instead — good enough to
    restore from by hand if it's ever needed."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    dest = os.path.join(BACKUP_DIR, f"crm_backup_{stamp}.json")
    con = connect()
    try:
        snapshot = {}
        for table in BACKUP_TABLES:
            rows = con.execute(f"SELECT * FROM {table}").fetchall()
            snapshot[table] = [dict(r) for r in rows]
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, default=str)
    finally:
        con.close()
    return dest
