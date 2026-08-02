"""DocDesk CRM server — standard library only (no installs needed).

Run:  py server.py          (opens the browser automatically)
      py server.py --no-browser
"""
import json
import os
import re
import socket
import sys
import threading
import time
import webbrowser
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import db

PORT = int(os.environ.get("PORT", 8000))
IS_CLOUD = "PORT" in os.environ  # cloud hosts (Render, etc.) always assign PORT
PUBLIC_DIR = os.path.join(db.BASE_DIR, "public")

ROUTES = []    # (method, compiled regex, handler, needs_auth, needs_admin)

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
}


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def route(method, pattern, auth=True, admin=False):
    regex = re.compile("^" + re.sub(r"\{(\w+)\}", r"(?P<\g<1>>\\d+)", pattern) + "$")

    def deco(fn):
        ROUTES.append((method, regex, fn, auth, admin))
        return fn

    return deco


# ---------------------------------------------------------------- helpers

def require(body, *fields):
    for f in fields:
        v = body.get(f)
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ApiError(400, f"'{f}' is required")


def as_int(value, field, minimum=None):
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise ApiError(400, f"'{field}' must be a number")
    if minimum is not None and n < minimum:
        raise ApiError(400, f"'{field}' must be at least {minimum}")
    return n


def job_row_dict(row):
    d = dict(row)
    d["balance"] = d.get("amount_quoted", 0) - d.get("paid", 0)
    return d


def fetch_job_full(con, job_id):
    row = con.execute(
        """SELECT j.*, c.name AS client_name, c.phone AS client_phone,
                  s.name AS service_name,
                  COALESCE((SELECT SUM(amount) FROM payments p WHERE p.job_id = j.id), 0) AS paid
           FROM jobs j
           JOIN clients c ON c.id = j.client_id
           JOIN service_types s ON s.id = j.service_type_id
           WHERE j.id = ?""",
        (job_id,),
    ).fetchone()
    if not row:
        raise ApiError(404, "Job not found")
    return job_row_dict(row)


def add_timeline(con, job_id, kind, text, user):
    con.execute(
        "INSERT INTO job_notes (job_id, kind, text, user_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (job_id, kind, text, user["id"] if user else None, db.now()),
    )


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


# ---------------------------------------------------------------- auth

@route("POST", "/api/login", auth=False)
def api_login(ctx):
    body = ctx["body"]
    require(body, "user_id", "pin")
    con = ctx["con"]
    uid = as_int(body["user_id"], "user_id")
    user = con.execute("SELECT * FROM users WHERE id = ? AND active = 1", (uid,)).fetchone()
    if not user or not db.verify_pin(con, user, str(body["pin"])):
        raise ApiError(401, "Wrong PIN")
    token = db.create_session(con, user["id"])
    max_age = db.SESSION_DAYS * 24 * 3600
    ctx["set_cookie"] = f"session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}"
    return {"me": {"id": user["id"], "name": user["name"], "role": user["role"]}}


@route("POST", "/api/logout", auth=False)
def api_logout(ctx):
    token = ctx.get("token")
    if token:
        db.delete_session(ctx["con"], token)
    ctx["set_cookie"] = "session=; Path=/; HttpOnly; Max-Age=0"
    return {"ok": True}


@route("GET", "/api/bootstrap", auth=False)
def api_bootstrap(ctx):
    con = ctx["con"]
    users = [dict(r) for r in con.execute(
        "SELECT id, name FROM users WHERE active = 1 ORDER BY name")]
    services = [dict(r) for r in con.execute(
        "SELECT id, name FROM service_types WHERE active = 1 ORDER BY id")]
    me = None
    if ctx["user"]:
        u = ctx["user"]
        me = {"id": u["id"], "name": u["name"], "role": u["role"]}
    return {
        "users": users,
        "services": services,
        "statuses": db.STATUSES,
        "me": me,
        "lan_ip": None if IS_CLOUD else lan_ip(),
        "port": PORT,
        "is_cloud": IS_CLOUD,
    }


# ---------------------------------------------------------------- tasks

@route("GET", "/api/tasks")
def api_tasks(ctx):
    con = ctx["con"]
    base = """SELECT j.id, j.client_id, j.status, j.next_action, j.next_action_date,
                     j.amount_quoted, j.details, j.completed_at, j.created_at, j.assigned_name,
                     c.name AS client_name, c.phone AS client_phone,
                     s.name AS service_name,
                     COALESCE((SELECT SUM(amount) FROM payments p WHERE p.job_id = j.id), 0) AS paid
              FROM jobs j
              JOIN clients c ON c.id = j.client_id
              JOIN service_types s ON s.id = j.service_type_id """
    # dated tasks first (oldest date on top, so overdue leads), undated last
    pending = [job_row_dict(r) for r in con.execute(
        base + """WHERE j.status NOT IN ('Completed', 'Cancelled')
                  ORDER BY CASE WHEN j.next_action_date = '' THEN 1 ELSE 0 END,
                           j.next_action_date"""
    ).fetchall()]
    completed = [job_row_dict(r) for r in con.execute(
        base + """WHERE j.status IN ('Completed', 'Cancelled')
                  ORDER BY COALESCE(j.completed_at, j.created_at) DESC LIMIT 100"""
    ).fetchall()]
    return {"pending": pending, "completed": completed}


# ---------------------------------------------------------------- clients

@route("GET", "/api/clients")
def api_clients(ctx):
    q = (ctx["query"].get("q", [""])[0] or "").strip()
    con = ctx["con"]
    sql = """SELECT c.*,
                    (SELECT COUNT(*) FROM jobs j WHERE j.client_id = c.id) AS job_count,
                    (SELECT COUNT(*) FROM jobs j WHERE j.client_id = c.id
                        AND j.status NOT IN ('Completed', 'Cancelled')) AS active_jobs
             FROM clients c"""
    args = []
    if q:
        sql += " WHERE c.name ILIKE ? OR c.phone ILIKE ? OR c.alt_phone ILIKE ?"
        like = f"%{q}%"
        args = [like, like, like]
    sql += " ORDER BY c.name LIMIT 100"
    return {"clients": [dict(r) for r in con.execute(sql, args)]}


@route("POST", "/api/clients")
def api_client_create(ctx):
    body, con = ctx["body"], ctx["con"]
    require(body, "name")
    cur = con.execute(
        "INSERT INTO clients (name, phone, alt_phone, address, notes, created_at, created_by)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (body["name"].strip(), str(body.get("phone", "")).strip(),
         str(body.get("alt_phone", "")).strip(), body.get("address", "").strip(),
         body.get("notes", "").strip(), db.now(), ctx["user"]["id"]),
    )
    con.commit()
    return {"id": cur.lastrowid}


@route("GET", "/api/clients/{id}")
def api_client_get(ctx):
    con = ctx["con"]
    cid = int(ctx["params"]["id"])
    client = con.execute("SELECT * FROM clients WHERE id = ?", (cid,)).fetchone()
    if not client:
        raise ApiError(404, "Client not found")
    jobs = [job_row_dict(r) for r in con.execute(
        """SELECT j.*, s.name AS service_name,
                  COALESCE((SELECT SUM(amount) FROM payments p WHERE p.job_id = j.id), 0) AS paid
           FROM jobs j JOIN service_types s ON s.id = j.service_type_id
           WHERE j.client_id = ? ORDER BY j.id DESC""",
        (cid,),
    )]
    return {"client": dict(client), "jobs": jobs}


@route("PATCH", "/api/clients/{id}")
def api_client_update(ctx):
    con, body = ctx["con"], ctx["body"]
    cid = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM clients WHERE id = ?", (cid,)).fetchone():
        raise ApiError(404, "Client not found")
    allowed = ["name", "phone", "alt_phone", "address", "notes"]
    sets, args = [], []
    for f in allowed:
        if f in body:
            if f == "name" and not str(body[f]).strip():
                raise ApiError(400, "'name' cannot be empty")
            sets.append(f"{f} = ?")
            args.append(str(body[f]).strip())
    if sets:
        args.append(cid)
        con.execute(f"UPDATE clients SET {', '.join(sets)} WHERE id = ?", args)
        con.commit()
    return {"ok": True}


# ---------------------------------------------------------------- jobs

@route("POST", "/api/jobs")
def api_job_create(ctx):
    body, con, user = ctx["body"], ctx["con"], ctx["user"]
    require(body, "service_type_id")

    client_id = body.get("client_id")
    if client_id:
        client_id = as_int(client_id, "client_id")
        if not con.execute("SELECT id FROM clients WHERE id = ?", (client_id,)).fetchone():
            raise ApiError(404, "Client not found")
    else:
        nc = body.get("new_client") or {}
        name = str(nc.get("name", "")).strip()
        phone = str(nc.get("phone", "")).strip()
        if not name:
            raise ApiError(400, "Enter the client's name")
        existing = None
        if phone:
            existing = con.execute(
                "SELECT id FROM clients WHERE phone = ?", (phone,)).fetchone()
        if existing:
            client_id = existing["id"]
        else:
            cur = con.execute(
                "INSERT INTO clients (name, phone, created_at, created_by) VALUES (?, ?, ?, ?)",
                (name, phone, db.now(), user["id"]),
            )
            client_id = cur.lastrowid

    service_id = as_int(body["service_type_id"], "service_type_id")
    if not con.execute("SELECT id FROM service_types WHERE id = ?", (service_id,)).fetchone():
        raise ApiError(404, "Service type not found")

    amount = as_int(body.get("amount_quoted") or 0, "amount_quoted", minimum=0)
    assigned_name = str(body.get("assigned_name", "")).strip()
    cur = con.execute(
        """INSERT INTO jobs (client_id, service_type_id, details, status, next_action,
                             next_action_date, amount_quoted, created_at, created_by, assigned_name)
           VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)""",
        (client_id, service_id, body.get("details", "").strip(),
         body.get("next_action", "").strip(), body.get("next_action_date", "").strip(),
         amount, db.now(), user["id"], assigned_name),
    )
    job_id = cur.lastrowid
    created_note = "Job created" + (f" · assigned to {assigned_name}" if assigned_name else "")
    add_timeline(con, job_id, "system", created_note, user)

    advance = as_int(body.get("advance") or 0, "advance", minimum=0)
    if advance > 0:
        con.execute(
            "INSERT INTO payments (job_id, amount, note, received_by, received_at)"
            " VALUES (?, ?, 'Advance', ?, ?)",
            (job_id, advance, user["id"], db.now()),
        )
        add_timeline(con, job_id, "payment", f"Advance received: Rs {advance}", user)

    con.commit()
    return {"id": job_id, "client_id": client_id}


@route("GET", "/api/jobs/{id}")
def api_job_get(ctx):
    con = ctx["con"]
    job_id = int(ctx["params"]["id"])
    job = fetch_job_full(con, job_id)
    payments = [dict(r) for r in con.execute(
        """SELECT p.*, u.name AS received_by_name
           FROM payments p LEFT JOIN users u ON u.id = p.received_by
           WHERE p.job_id = ? ORDER BY p.id DESC""",
        (job_id,),
    )]
    timeline = [dict(r) for r in con.execute(
        """SELECT n.*, u.name AS user_name
           FROM job_notes n LEFT JOIN users u ON u.id = n.user_id
           WHERE n.job_id = ? ORDER BY n.id DESC""",
        (job_id,),
    )]
    return {"job": job, "payments": payments, "timeline": timeline}


@route("PATCH", "/api/jobs/{id}")
def api_job_update(ctx):
    con, body, user = ctx["con"], ctx["body"], ctx["user"]
    job_id = int(ctx["params"]["id"])
    job = con.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        raise ApiError(404, "Job not found")

    sets, args = [], []
    if "status" in body:
        status = body["status"]
        if status not in db.STATUSES:
            raise ApiError(400, "Invalid status")
        if status != job["status"]:
            sets.append("status = ?")
            args.append(status)
            sets.append("completed_at = ?")
            args.append(db.now() if status == "Completed" else None)
            label = {"Completed": "Marked as done", "Cancelled": "Job cancelled",
                     "Pending": "Reopened"}.get(status, f"Status: {status}")
            add_timeline(con, job_id, "status", label, user)
    if "assigned_name" in body:
        name = str(body["assigned_name"]).strip()
        if name != job["assigned_name"]:
            sets.append("assigned_name = ?")
            args.append(name)
            add_timeline(con, job_id, "status",
                         f"Assigned to {name}" if name else "Assignment removed", user)
    if "next_action" in body:
        sets.append("next_action = ?")
        args.append(str(body["next_action"]).strip())
    if "next_action_date" in body:
        nd = str(body["next_action_date"]).strip()
        if nd:
            try:
                date.fromisoformat(nd)
            except ValueError:
                raise ApiError(400, "Invalid date")
        sets.append("next_action_date = ?")
        args.append(nd)
    if "details" in body:
        sets.append("details = ?")
        args.append(str(body["details"]).strip())
    if "amount_quoted" in body:
        sets.append("amount_quoted = ?")
        args.append(as_int(body["amount_quoted"], "amount_quoted", minimum=0))
    if sets:
        args.append(job_id)
        con.execute(f"UPDATE jobs SET {', '.join(sets)} WHERE id = ?", args)
        con.commit()
    return fetch_job_full(con, job_id)


@route("POST", "/api/jobs/{id}/notes")
def api_job_note(ctx):
    con, body, user = ctx["con"], ctx["body"], ctx["user"]
    job_id = int(ctx["params"]["id"])
    require(body, "text")
    if not con.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone():
        raise ApiError(404, "Job not found")
    add_timeline(con, job_id, "note", body["text"].strip(), user)
    con.commit()
    return {"ok": True}


@route("POST", "/api/jobs/{id}/payments")
def api_job_payment(ctx):
    con, body, user = ctx["con"], ctx["body"], ctx["user"]
    job_id = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone():
        raise ApiError(404, "Job not found")
    amount = as_int(body.get("amount"), "amount", minimum=1)
    note = str(body.get("note", "")).strip()
    con.execute(
        "INSERT INTO payments (job_id, amount, note, received_by, received_at) VALUES (?, ?, ?, ?, ?)",
        (job_id, amount, note, user["id"], db.now()),
    )
    add_timeline(con, job_id, "payment", f"Payment received: Rs {amount}" + (f" ({note})" if note else ""), user)
    con.commit()
    return {"ok": True}


@route("DELETE", "/api/jobs/{id}")
def api_job_delete(ctx):
    con = ctx["con"]
    job_id = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone():
        raise ApiError(404, "Job not found")
    con.execute("DELETE FROM payments WHERE job_id = ?", (job_id,))
    con.execute("DELETE FROM job_notes WHERE job_id = ?", (job_id,))
    con.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    con.commit()
    return {"ok": True}


@route("DELETE", "/api/clients/{id}")
def api_client_delete(ctx):
    con = ctx["con"]
    cid = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM clients WHERE id = ?", (cid,)).fetchone():
        raise ApiError(404, "Client not found")
    con.execute("DELETE FROM payments WHERE job_id IN (SELECT id FROM jobs WHERE client_id = ?)", (cid,))
    con.execute("DELETE FROM job_notes WHERE job_id IN (SELECT id FROM jobs WHERE client_id = ?)", (cid,))
    con.execute("DELETE FROM jobs WHERE client_id = ?", (cid,))
    con.execute("DELETE FROM clients WHERE id = ?", (cid,))
    con.commit()
    return {"ok": True}


@route("DELETE", "/api/payments/{id}")
def api_payment_delete(ctx):
    con, user = ctx["con"], ctx["user"]
    pid = int(ctx["params"]["id"])
    p = con.execute("SELECT * FROM payments WHERE id = ?", (pid,)).fetchone()
    if not p:
        raise ApiError(404, "Payment not found")
    con.execute("DELETE FROM payments WHERE id = ?", (pid,))
    add_timeline(con, p["job_id"], "system", f"Payment entry deleted: Rs {p['amount']}", user)
    con.commit()
    return {"ok": True}


@route("DELETE", "/api/notes/{id}")
def api_note_delete(ctx):
    con = ctx["con"]
    nid = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM job_notes WHERE id = ?", (nid,)).fetchone():
        raise ApiError(404, "Entry not found")
    con.execute("DELETE FROM job_notes WHERE id = ?", (nid,))
    con.commit()
    return {"ok": True}


@route("GET", "/api/assignees")
def api_assignees(ctx):
    """Suggestion list for the assign-to field: every name used before, plus staff."""
    con = ctx["con"]
    names = {r[0] for r in con.execute(
        "SELECT DISTINCT assigned_name FROM jobs WHERE assigned_name != ''")}
    names |= {r[0] for r in con.execute("SELECT name FROM users WHERE active = 1")}
    return {"assignees": sorted(names, key=str.lower)}


# ---------------------------------------------------------------- payments overview

@route("GET", "/api/payments")
def api_payments(ctx):
    con = ctx["con"]
    pending = [j for j in (job_row_dict(r) for r in con.execute(
        """SELECT j.id, j.status, j.amount_quoted, j.client_id,
                  c.name AS client_name, c.phone AS client_phone, s.name AS service_name,
                  COALESCE((SELECT SUM(amount) FROM payments p WHERE p.job_id = j.id), 0) AS paid
           FROM jobs j
           JOIN clients c ON c.id = j.client_id
           JOIN service_types s ON s.id = j.service_type_id
           WHERE j.status != 'Cancelled'"""
    ).fetchall()) if j["balance"] > 0]
    pending.sort(key=lambda j: -j["balance"])

    recent = [dict(r) for r in con.execute(
        """SELECT p.*, u.name AS received_by_name, c.name AS client_name, s.name AS service_name,
                  j.id AS job_id
           FROM payments p
           JOIN jobs j ON j.id = p.job_id
           JOIN clients c ON c.id = j.client_id
           JOIN service_types s ON s.id = j.service_type_id
           LEFT JOIN users u ON u.id = p.received_by
           ORDER BY p.id DESC LIMIT 25"""
    )]
    t = db.today()
    received_today = con.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE received_at LIKE ?", (t + "%",)
    ).fetchone()[0]
    return {
        "pending": pending,
        "recent": recent,
        "totals": {
            "pending_total": sum(j["balance"] for j in pending),
            "received_today": received_today,
        },
    }


# ---------------------------------------------------------------- settings (admin)

@route("GET", "/api/users", admin=True)
def api_users(ctx):
    return {"users": [dict(r) for r in ctx["con"].execute(
        "SELECT id, name, role, active FROM users ORDER BY name")]}


@route("POST", "/api/users", admin=True)
def api_user_create(ctx):
    body, con = ctx["body"], ctx["con"]
    require(body, "name", "pin")
    name = body["name"].strip()
    role = body.get("role", "staff")
    if role not in ("admin", "staff"):
        raise ApiError(400, "Role must be admin or staff")
    if con.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (name,)).fetchone():
        raise ApiError(400, "A user with that name already exists")
    salt = db.new_salt()
    con.execute(
        "INSERT INTO users (name, pin_hash, salt, role) VALUES (?, ?, ?, ?)",
        (name, db.pin_hash(salt, str(body["pin"])), salt, role),
    )
    con.commit()
    return {"ok": True}


@route("PATCH", "/api/users/{id}", admin=True)
def api_user_update(ctx):
    body, con = ctx["body"], ctx["con"]
    uid = int(ctx["params"]["id"])
    user = con.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not user:
        raise ApiError(404, "User not found")
    if "active" in body:
        if uid == ctx["user"]["id"] and not body["active"]:
            raise ApiError(400, "You cannot deactivate yourself")
        con.execute("UPDATE users SET active = ? WHERE id = ?", (1 if body["active"] else 0, uid))
        if not body["active"]:
            db.delete_sessions_for_user(con, uid)
    if "pin" in body and str(body["pin"]).strip():
        db.set_pin(con, uid, str(body["pin"]))
        db.delete_sessions_for_user(con, uid)  # PIN changed — log that user out everywhere
    if "role" in body:
        if body["role"] not in ("admin", "staff"):
            raise ApiError(400, "Role must be admin or staff")
        if uid == ctx["user"]["id"] and body["role"] != "admin":
            raise ApiError(400, "You cannot remove your own admin access")
        con.execute("UPDATE users SET role = ? WHERE id = ?", (body["role"], uid))
    con.commit()
    return {"ok": True}


@route("GET", "/api/service_types", admin=True)
def api_services_all(ctx):
    return {"services": [dict(r) for r in ctx["con"].execute(
        "SELECT * FROM service_types ORDER BY active DESC, name")]}


@route("POST", "/api/service_types", admin=True)
def api_service_create(ctx):
    body, con = ctx["body"], ctx["con"]
    require(body, "name")
    name = body["name"].strip()
    existing = con.execute(
        "SELECT id FROM service_types WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
    if existing:
        con.execute("UPDATE service_types SET active = 1 WHERE id = ?", (existing["id"],))
    else:
        con.execute("INSERT INTO service_types (name) VALUES (?)", (name,))
    con.commit()
    return {"ok": True}


@route("PATCH", "/api/service_types/{id}", admin=True)
def api_service_update(ctx):
    body, con = ctx["body"], ctx["con"]
    sid = int(ctx["params"]["id"])
    if not con.execute("SELECT id FROM service_types WHERE id = ?", (sid,)).fetchone():
        raise ApiError(404, "Service not found")
    if "active" in body:
        con.execute("UPDATE service_types SET active = ? WHERE id = ?",
                    (1 if body["active"] else 0, sid))
    if "name" in body and str(body["name"]).strip():
        con.execute("UPDATE service_types SET name = ? WHERE id = ?",
                    (str(body["name"]).strip(), sid))
    con.commit()
    return {"ok": True}


@route("POST", "/api/backup", admin=True)
def api_backup(ctx):
    path = db.backup()
    return {"path": path}


# ---------------------------------------------------------------- http plumbing

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass  # keep the console clean for dad

    def _send_json(self, status, data, set_cookie=None):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(payload)

    def _session_user(self, con):
        cookies = self.headers.get("Cookie", "")
        token = None
        for part in cookies.split(";"):
            k, _, v = part.strip().partition("=")
            if k == "session":
                token = v
        return token, db.get_session_user(con, token)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        if length > 1_000_000:
            raise ApiError(413, "Request too large")
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            raise ApiError(400, "Invalid JSON")
        if not isinstance(data, dict):
            raise ApiError(400, "Invalid JSON")
        return data

    def _dispatch(self, method):
        parsed = urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api/"):
            if method == "GET":
                return self._serve_static(path)
            self.send_error(404)
            return

        con = db.connect()
        try:
            token, user = self._session_user(con)
            for m, regex, fn, needs_auth, needs_admin in ROUTES:
                if m != method:
                    continue
                match = regex.match(path)
                if not match:
                    continue
                if needs_auth and not user:
                    return self._send_json(401, {"error": "Not logged in"})
                if needs_admin and (not user or user["role"] != "admin"):
                    return self._send_json(403, {"error": "Admin access needed"})
                ctx = {
                    "con": con,
                    "user": user,
                    "token": token,
                    "params": match.groupdict(),
                    "query": parse_qs(parsed.query),
                    "body": self._read_body() if method in ("POST", "PATCH") else {},
                }
                try:
                    result = fn(ctx)
                    return self._send_json(200, result, ctx.get("set_cookie"))
                except ApiError as e:
                    return self._send_json(e.status, {"error": e.message})
                except Exception as e:  # noqa: BLE001 - report, don't crash the thread
                    print(f"[error] {method} {path}: {e!r}")
                    return self._send_json(500, {"error": "Something went wrong on the server"})
            return self._send_json(404, {"error": "Not found"})
        except ApiError as e:
            return self._send_json(e.status, {"error": e.message})
        finally:
            con.close()

    def _serve_static(self, path):
        if path == "/":
            path = "/index.html"
        safe = os.path.normpath(path.lstrip("/"))
        if safe.startswith(("..", os.sep)) or ":" in safe:
            self.send_error(404)
            return
        full = os.path.join(PUBLIC_DIR, safe)
        if not os.path.isfile(full):
            # unknown paths fall back to the app shell (hash routing handles views)
            full = os.path.join(PUBLIC_DIR, "index.html")
        ext = os.path.splitext(full)[1].lower()
        try:
            with open(full, "rb") as f:
                content = f.read()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def do_PATCH(self):
        self._dispatch("PATCH")

    def do_DELETE(self):
        self._dispatch("DELETE")


def _session_cleanup_loop():
    while True:
        time.sleep(6 * 3600)
        con = db.connect()
        try:
            db.cleanup_expired_sessions(con)
        finally:
            con.close()


def main():
    db.init()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 52)
    print("  Affordable CRM is running")
    if IS_CLOUD:
        print(f"  Listening on port {PORT} (cloud host)")
    else:
        print(f"  On this computer:  http://localhost:{PORT}")
        ip = lan_ip()
        if ip:
            print(f"  On phones (same Wi-Fi):  http://{ip}:{PORT}")
    print("  Press Ctrl+C to stop")
    print("=" * 52)
    threading.Thread(target=_session_cleanup_loop, daemon=True).start()
    if not IS_CLOUD and "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
