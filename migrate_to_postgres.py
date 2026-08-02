"""One-time migration: copies real records from the local SQLite database
(crm.db) into the Postgres database configured via DATABASE_URL. Run once,
after `py server.py` has started at least once against Postgres (so the
schema, default Admin, and default services already exist there).

Users and service types are intentionally left alone — Postgres already has
its own Admin login and the standard service list from db.init(). Only the
client/job/payment/history data is copied, since that's the data unique to
this shop.

Run:  py migrate_to_postgres.py
"""
import sqlite3

import db

SQLITE_PATH = "crm.db"


def main():
    sq = sqlite3.connect(SQLITE_PATH)
    sq.row_factory = sqlite3.Row
    pg = db.connect()

    client_map = {}
    for row in sq.execute("SELECT * FROM clients ORDER BY id"):
        cur = pg.execute(
            "INSERT INTO clients (name, phone, alt_phone, address, notes, created_at, created_by) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (row["name"], row["phone"], row["alt_phone"], row["address"], row["notes"],
             row["created_at"], row["created_by"]),
        )
        client_map[row["id"]] = cur.lastrowid
    print(f"Migrated {len(client_map)} client(s)")

    job_map = {}
    for row in sq.execute("SELECT * FROM jobs ORDER BY id"):
        new_client_id = client_map.get(row["client_id"])
        if new_client_id is None:
            print(f"  Skipping job {row['id']} — its client was not migrated")
            continue
        cur = pg.execute(
            "INSERT INTO jobs (client_id, service_type_id, details, status, next_action, "
            "next_action_date, amount_quoted, created_at, created_by, assigned_name, completed_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (new_client_id, row["service_type_id"], row["details"], row["status"],
             row["next_action"], row["next_action_date"], row["amount_quoted"],
             row["created_at"], row["created_by"], row["assigned_name"], row["completed_at"]),
        )
        job_map[row["id"]] = cur.lastrowid
    print(f"Migrated {len(job_map)} job(s)")

    payment_count = 0
    for row in sq.execute("SELECT * FROM payments ORDER BY id"):
        new_job_id = job_map.get(row["job_id"])
        if new_job_id is None:
            continue
        pg.execute(
            "INSERT INTO payments (job_id, amount, note, received_by, received_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (new_job_id, row["amount"], row["note"], row["received_by"], row["received_at"]),
        )
        payment_count += 1
    print(f"Migrated {payment_count} payment(s)")

    note_count = 0
    for row in sq.execute("SELECT * FROM job_notes ORDER BY id"):
        new_job_id = job_map.get(row["job_id"])
        if new_job_id is None:
            continue
        pg.execute(
            "INSERT INTO job_notes (job_id, kind, text, user_id, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (new_job_id, row["kind"], row["text"], row["user_id"], row["created_at"]),
        )
        note_count += 1
    print(f"Migrated {note_count} note(s)")

    pg.close()
    sq.close()
    print("Done.")


if __name__ == "__main__":
    main()
