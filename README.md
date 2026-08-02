# Affordable CRM — Work & Client Manager

A CRM for a documentation-services shop (passports, driving licences, tickets…).
Tracks **clients → jobs → follow-ups → payments** so nothing is forgotten.

Data is stored in a real cloud database (Postgres, via a free Neon.tech
account) — not a file on this one computer — so it's safe even if this PC is
reformatted, and it's ready to move to a proper cloud-hosted deployment later
with no further changes.

## One-time setup (already done on this computer)

1. `py -m pip install -r requirements.txt` — installs the one thing needed to
   talk to Postgres (`psycopg2-binary`).
2. A file named **`.env`** in this folder containing one line:
   `DATABASE_URL=postgres://...` — the connection string from the Neon
   dashboard. **Never share this file or paste it anywhere public** — it's the
   password to all the shop's data.

If this app is ever set up on a *different* computer, repeat both steps there
too (the `.env` file is deliberately not something that gets copied around
automatically — see `.gitignore`).

## How to start it

Double-click **`Start DocDesk.bat`**. A black window opens (keep it open —
that's the server) and the app opens in the browser at `http://localhost:8000`.

**First login:** user **Admin**, PIN **1234**. Go to Settings to add real users
and change the PIN.

## Using it on phones

Phones must be on the **same Wi-Fi** as this computer. The black window (and
the Settings page) shows the address to open, e.g. `http://192.168.1.5:8000`.
If Windows asks about firewall access the first time, click **Allow**.

## Daily flow

1. Open the **Tasks** page every morning — Pending shows everything still
   open, sorted so overdue follow-ups are at the top.
2. New work? Hit **+ New Job** — enter the client's name and phone, choose the
   service, set the next action and date. Under 30 seconds.
3. When anything happens on a job (payment, note, status), open the job and
   record it. Every job keeps a full history of who did what and when.
4. When a client calls, go to **Clients** and type a few letters of their name
   or phone — their whole history is right there.
5. Need a bill? Open the job → **Invoice** → Print / Save as PDF.

## Where the data actually lives

In the cloud, in a Postgres database on Neon.tech — not in a file on this
computer. That means:

- It survives this PC being wiped, stolen, or replaced.
- Multiple people can use it from different devices at the same time.
- **Backup:** Settings → "Backup now" saves a snapshot of everything into the
  `backups` folder as a `.json` file — copy that folder to a pen drive or
  Google Drive now and then, same as before.
- The free Neon plan comfortably holds years of this shop's data before
  storage would ever become a concern.

## Files

| File | What it is |
|---|---|
| `Start DocDesk.bat` | Double-click to run |
| `server.py` | The web server + API |
| `db.py` | Database schema and helpers (Postgres) |
| `public/` | The web app (HTML/CSS/JS, no frameworks) |
| `.env` | Holds the database connection string — **keep private** |
| `requirements.txt` | The one Python package this needs (`psycopg2-binary`) |
| `migrate_to_postgres.py` | One-time script that moved old local data into Postgres |
| `backups/` | Backup snapshots (`.json`) |

## Later ideas (not built yet)

Document checklists per service, uploading scans of client documents, WhatsApp
status-update shortcuts, passport/licence expiry reminders, and deploying the
app itself to the cloud (Render) so it's reachable from anywhere, not just this
computer's Wi-Fi.
