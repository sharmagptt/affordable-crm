/* DocDesk CRM — vanilla JS, no dependencies */
"use strict";

let boot = null; // { users, services, statuses, me, lan_ip, port }
const view = document.getElementById("view");

/* company details shown on invoices — edit here if they ever change */
const COMPANY = {
  name: "Affordable Air Travels Private Limited",
  phone: "7678280442",
  email: "affordableairtravelspvtltd@gmail.com",
  address: "3, Mahender Market, Near MM Tower, Udyog Vihar 122015",
};

/* company logo recreated as SVG (navy panel, aircraft, serif caps) */
const PLANE_PATH = '<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>';
function logoSVG(height = 44) {
  const w = Math.round(height * 2.6);
  return `<svg width="${w}" height="${height}" viewBox="0 0 208 80" role="img" aria-label="${esc(COMPANY.name)}">
    <rect width="208" height="80" rx="8" fill="#1e2a5e"/>
    <g transform="translate(88,3) scale(1.3)" fill="#ffffff">${PLANE_PATH}</g>
    <text x="104" y="56" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif"
      font-size="14" font-weight="700" letter-spacing="0.5" textLength="184" lengthAdjust="spacingAndGlyphs">AFFORDABLE AIR TRAVELS</text>
    <text x="104" y="72" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif"
      font-size="11" letter-spacing="2" textLength="120" lengthAdjust="spacingAndGlyphs">PRIVATE LIMITED</text>
  </svg>`;
}

/* inline SVG icon set (stroke style) — no emojis */
const ICONS = {
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  pencil: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  rupee: '<path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  tag: '<path d="M20.59 13.41 12 22l-8.59-8.59A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.41.59z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
};
function icon(name, size = 16) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/* ---------------------------------------------------------- helpers */

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && boot) { boot.me = null; route(); }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const [datePart, timePart] = iso.split("T");
  let t = "";
  if (timePart) {
    let [h, mi] = timePart.split(":").map(Number);
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    t = `, ${h}:${String(mi).padStart(2, "0")} ${ap}`;
  }
  return fmtDate(datePart) + t;
}

function dateTag(iso) {
  if (!iso) return "";
  const t = todayStr();
  if (iso < t) {
    const days = Math.round((new Date(t) - new Date(iso)) / 86400000);
    return `<span class="chip overdue">${days} day${days > 1 ? "s" : ""} overdue</span>`;
  }
  if (iso === t) return '<span class="chip due-today">Today</span>';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tm = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (iso === tm) return "<b>Tomorrow</b>";
  return `<b>${fmtDate(iso)}</b>`;
}

function chip(status) {
  const slug = status.toLowerCase().replace(/\s+/g, "-");
  return `<span class="chip s-${slug}">${esc(status)}</span>`;
}

function phoneLink(phone) {
  if (!phone) return "";
  return `<a class="phone" href="tel:${esc(phone)}">${icon("phone", 13)} ${esc(phone)}</a>`;
}

let toastTimer = null;
function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = isError ? "err" : "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

function assigneeDatalist(names) {
  return `<datalist id="assigneeDL">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
}

/* Tells the admin whether the typed assignee actually has a staff login —
   i.e. whether this task will show up in that person's portal. */
function assigneeHint(name, logins) {
  const n = (name || "").trim();
  if (!n) return "";
  const match = (logins || []).find((l) => l.toLowerCase() === n.toLowerCase());
  return match
    ? `<span class="paid-ok">${icon("check", 12)} ${esc(match)} has a login — this task will appear in their portal.</span>`
    : `${icon("info", 12)} ${esc(n)} has no staff login, so this is just a label. Add them in Settings to give them a portal.`;
}

const AVATAR_COLORS = [
  ["#dbeafe", "#1e40af"], ["#dcfce7", "#166534"], ["#fef3c7", "#92400e"],
  ["#fce7f3", "#9d174d"], ["#ede9fe", "#5b21b6"], ["#cffafe", "#155e75"],
  ["#ffe4e6", "#9f1239"], ["#e2e8f0", "#334155"],
];
function avatar(name) {
  const n = String(name || "?").trim() || "?";
  let h = 0;
  for (const ch of n) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[h];
  const parts = n.split(/\s+/);
  const ini = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  return `<span class="avatar" style="background:${bg};color:${fg}">${esc(ini)}</span>`;
}

function assigneeTag(j) {
  return j.assigned_name ? `<span class="assignee">${icon("user", 11)} ${esc(j.assigned_name)}</span>` : "";
}

function serviceOptions(selected) {
  return boot.services.map((s) =>
    `<option value="${s.id}" ${s.id === selected ? "selected" : ""}>${esc(s.name)}</option>`).join("");
}

/* one shared renderer for job rows in lists */
function jobRow(j, { showClient = true } = {}) {
  const balance = j.balance > 0
    ? `<span class="balance-due">${money(j.balance)} due</span>`
    : (j.amount_quoted > 0 ? '<span class="paid-ok">Paid ✓</span>' : "");
  const state = j.status === "Pending"
    ? (dateTag(j.next_action_date) || '<span class="sub">no date</span>')
    : chip(j.status);
  return `
  <div class="row" data-go="#/job/${j.id}">
    ${avatar(showClient ? j.client_name : j.service_name)}
    <div class="grow">
      <div class="title">${showClient ? esc(j.client_name) + " — " : ""}${esc(j.service_name)}</div>
      <div class="sub">${j.next_action ? "→ " + esc(j.next_action) : esc(j.details || "")}</div>
      ${assigneeTag(j)}
    </div>
    <div class="right">
      <div>${state}</div>
      <div class="sub" style="margin-top:0.2rem">${balance}</div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------- router */

const pages = { tasks: renderTasks, clients: renderClients, client: renderClient,
  job: renderJob, new: renderQuickAdd, payments: renderPayments, settings: renderSettings,
  invoice: renderInvoice };

const isAdmin = () => boot.me && boot.me.role === "admin";
/* pages a staff account may open — everything else is admin-only */
const STAFF_PAGES = ["tasks", "job"];

function route() {
  const topbar = document.getElementById("topbar");
  const bottomNav = document.getElementById("bottomNav");
  if (!boot.me) {
    topbar.classList.add("hidden");
    bottomNav.classList.add("hidden");
    renderLogin();
    return;
  }
  topbar.classList.remove("hidden");
  bottomNav.classList.remove("hidden");
  document.getElementById("userName").textContent = boot.me.name;

  // staff get a smaller app: only their tasks
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("hidden", !isAdmin() && !STAFF_PAGES.includes(a.dataset.nav)));

  const parts = (location.hash || "#/tasks").slice(2).split("/");
  let page = pages[parts[0]] ? parts[0] : "tasks";
  if (!isAdmin() && !STAFF_PAGES.includes(page)) page = "tasks";
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === page ||
      (page === "client" && a.dataset.nav === "clients") ||
      (page === "job" && a.dataset.nav === "tasks")));
  pages[page](parts[1]).catch((e) => {
    view.innerHTML = `<div class="card"><b>Could not load this page.</b><div class="sub">${esc(e.message)}</div></div>`;
  });
}

window.addEventListener("hashchange", route);

document.addEventListener("click", (e) => {
  const row = e.target.closest(".row[data-go]");
  if (row && !e.target.closest("a, button, select, input, textarea")) {
    location.hash = row.dataset.go;
  }
});

/* ---------------------------------------------------------- login */

function renderLogin() {
  let selected = boot.users.length === 1 ? boot.users[0] : null;
  const draw = (err = "") => {
    view.innerHTML = `
    <div class="login-wrap">
      <div style="margin-bottom:1.4rem">${logoSVG(84)}</div>
      <div class="user-btns">
        ${boot.users.map((u) => `<button data-uid="${u.id}" class="${selected && selected.id === u.id ? "sel" : ""}">${esc(u.name)}</button>`).join("")}
      </div>
      <div id="pinBox" class="${selected ? "" : "hidden"}">
        ${err ? `<div class="login-err">${esc(err)}</div>` : ""}
        <div class="pin-wrap">
          <input id="pinInput" type="password" autocomplete="current-password"
                 autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="PIN or password">
          <button id="pinPeek" type="button" class="pin-peek" title="Show">${icon("eye", 18)}</button>
        </div>
        <button id="loginBtn" class="btn btn-big">Login</button>
      </div>
    </div>`;
    view.querySelectorAll(".user-btns button").forEach((b) =>
      b.addEventListener("click", () => {
        selected = boot.users.find((u) => u.id === Number(b.dataset.uid));
        draw();
        view.querySelector("#pinInput").focus();
      }));
    const doLogin = async () => {
      const pin = view.querySelector("#pinInput").value.trim();
      if (!pin) return;
      try {
        const data = await api("/api/login", { method: "POST", body: { user_id: selected.id, pin } });
        boot.me = data.me;
        location.hash = "#/tasks";
        route();
      } catch (e) { draw(e.message); view.querySelector("#pinInput").focus(); }
    };
    const loginBtn = view.querySelector("#loginBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", doLogin);
      const pinInput = view.querySelector("#pinInput");
      pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
      // letters are easy to mistype when they're masked — let people check
      view.querySelector("#pinPeek").addEventListener("click", (e) => {
        const showing = pinInput.type === "text";
        pinInput.type = showing ? "password" : "text";
        e.currentTarget.innerHTML = icon(showing ? "eye" : "eyeOff", 18);
        e.currentTarget.title = showing ? "Show" : "Hide";
        pinInput.focus();
      });
    }
  };
  draw();
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  boot.me = null;
  route();
});

/* ---------------------------------------------------------- tasks */

let tasksTab = "pending";
let taskFilter = "all";   // admin-only: narrow the task list to one person

async function renderTasks() {
  const d = await api("/api/tasks");

  const pendingRow = (j) => `
    <div class="row" data-go="#/job/${j.id}">
      ${avatar(j.client_name)}
      <div class="grow">
        <div class="title">${esc(j.client_name)} — ${esc(j.service_name)}</div>
        <div class="sub">${j.next_action ? "→ " + esc(j.next_action) : esc(j.details || "")}</div>
        ${assigneeTag(j)}
      </div>
      <div class="right">
        <div>${dateTag(j.next_action_date) || '<span class="sub">no date</span>'}</div>
        ${j.balance > 0 ? `<div class="sub balance-due" style="margin-top:0.2rem">${money(j.balance)} due</div>` : ""}
      </div>
      <button class="done-btn" data-done="${j.id}" title="Mark as completed">✓</button>
    </div>`;

  const completedRow = (j) => `
    <div class="row" data-go="#/job/${j.id}">
      ${avatar(j.client_name)}
      <div class="grow">
        <div class="title">${esc(j.client_name)} — ${esc(j.service_name)}</div>
        <div class="sub">${j.status === "Cancelled" ? chip("Cancelled")
          : "✓ Completed " + fmtDate((j.completed_at || "").split("T")[0])}</div>
        ${assigneeTag(j)}
      </div>
      <div class="right sub">${j.amount_quoted > 0
        ? (j.balance > 0 ? `<span class="balance-due">${money(j.balance)} due</span>` : '<span class="paid-ok">Paid ✓</span>')
        : ""}</div>
    </div>`;

  // admin can narrow the list to one person; staff already only get their own
  const people = [...new Set([...d.pending, ...d.completed]
    .map((j) => j.assigned_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const matchesFilter = (j) =>
    taskFilter === "all" ? true
      : taskFilter === "__none__" ? !j.assigned_name
      : j.assigned_name === taskFilter;

  const draw = () => {
    const all = tasksTab === "pending" ? d.pending : d.completed;
    const list = isAdmin() ? all.filter(matchesFilter) : all;
    const shown = (tab) => {
      const src = tab === "pending" ? d.pending : d.completed;
      return isAdmin() ? src.filter(matchesFilter).length : src.length;
    };
    view.innerHTML = `
      <div class="page-title">${isAdmin() ? "Tasks" : "My Tasks"}</div>
      ${isAdmin() && people.length ? `
      <div class="card" style="padding:0.7rem 1.15rem">
        <label class="f" style="margin:0">Show tasks for
          <select id="taskFilter">
            <option value="all" ${taskFilter === "all" ? "selected" : ""}>Everyone</option>
            ${people.map((p) => `<option value="${esc(p)}" ${taskFilter === p ? "selected" : ""}>${esc(p)}</option>`).join("")}
            <option value="__none__" ${taskFilter === "__none__" ? "selected" : ""}>Nobody assigned</option>
          </select>
        </label>
      </div>` : ""}
      <div class="tabs">
        <button class="tab ${tasksTab === "pending" ? "active" : ""}" data-tab="pending">${icon("clock", 15)} Pending (${shown("pending")})</button>
        <button class="tab ${tasksTab === "completed" ? "active" : ""}" data-tab="completed">${icon("checkCircle", 15)} Completed (${shown("completed")})</button>
      </div>
      <div class="card">
        ${list.map(tasksTab === "pending" ? pendingRow : completedRow).join("")
          || `<div class="empty">${tasksTab === "pending"
              ? (isAdmin() ? "No pending tasks. Tap + New Job to add one." : "Nothing pending — you're all caught up.")
              : "Nothing completed yet."}</div>`}
      </div>`;

    const filterSel = view.querySelector("#taskFilter");
    if (filterSel) filterSel.addEventListener("change", (e) => {
      taskFilter = e.target.value;
      draw();
    });
    view.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
      tasksTab = b.dataset.tab;
      draw();
    }));
    view.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      try {
        await api("/api/jobs/" + b.dataset.done, { method: "PATCH", body: { status: "Completed" } });
        toast("Marked as completed");
        renderTasks();
      } catch (e) { toast(e.message, true); }
    }));
  };
  draw();
}

/* ---------------------------------------------------------- clients */

async function renderClients() {
  view.innerHTML = `
    <div class="page-title">Clients</div>
    <div class="card">
      <label class="f">Search by name or phone
        <input id="clientSearch" type="text" placeholder="Start typing…" autocomplete="off">
      </label>
      <button id="addClientBtn" class="btn btn-light">+ Add new client</button>
      <div id="addClientForm" class="hidden" style="margin-top:1rem">
        <div class="form-grid">
          <label class="f">Name *<input id="ncName"></label>
          <label class="f">Phone<input id="ncPhone" inputmode="tel"></label>
          <label class="f">Alternate phone<input id="ncAlt" inputmode="tel"></label>
          <label class="f">Address<input id="ncAddr"></label>
          <label class="f full">Notes<input id="ncNotes"></label>
        </div>
        <button id="saveClientBtn" class="btn">Save client</button>
      </div>
    </div>
    <div class="card"><div id="clientList"></div></div>`;

  const list = view.querySelector("#clientList");
  const load = async (q = "") => {
    const d = await api("/api/clients" + (q ? "?q=" + encodeURIComponent(q) : ""));
    list.innerHTML = d.clients.map((c) => `
      <div class="row" data-go="#/client/${c.id}">
        ${avatar(c.name)}
        <div class="grow">
          <div class="title">${esc(c.name)}</div>
          <div class="sub">${phoneLink(c.phone) || '<span class="sub">no phone</span>'}</div>
        </div>
        <div class="right sub">${c.active_jobs ? `<b>${c.active_jobs} pending</b> · ` : ""}${c.job_count} job${c.job_count === 1 ? "" : "s"}</div>
      </div>`).join("") || '<div class="empty">No clients found. Add the first one above.</div>';
  };
  load();

  let timer = null;
  view.querySelector("#clientSearch").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => load(e.target.value.trim()), 250);
  });
  view.querySelector("#addClientBtn").addEventListener("click", () =>
    view.querySelector("#addClientForm").classList.toggle("hidden"));
  view.querySelector("#saveClientBtn").addEventListener("click", async () => {
    try {
      const d = await api("/api/clients", { method: "POST", body: {
        name: view.querySelector("#ncName").value,
        phone: view.querySelector("#ncPhone").value,
        alt_phone: view.querySelector("#ncAlt").value,
        address: view.querySelector("#ncAddr").value,
        notes: view.querySelector("#ncNotes").value,
      }});
      toast("Client saved");
      location.hash = "#/client/" + d.id;
    } catch (e) { toast(e.message, true); }
  });
}

async function renderClient(id) {
  const d = await api("/api/clients/" + id);
  const c = d.client;
  view.innerHTML = `
    <a class="back" href="#/clients">← All clients</a>
    <div class="card">
      <div class="job-head">
        <h2>${esc(c.name)}</h2>
        <div class="spacer"></div>
        <button id="editBtn" class="btn btn-light btn-sm">${icon("pencil", 13)} Edit</button>
        <button id="delClientBtn" class="btn btn-danger btn-sm">${icon("trash", 13)} Delete</button>
      </div>
      <div class="sub" style="font-size:1rem">
        ${phoneLink(c.phone)} ${c.alt_phone ? " · " + phoneLink(c.alt_phone) : ""}
      </div>
      ${c.address ? `<div class="sub">${icon("pin", 12)} ${esc(c.address)}</div>` : ""}
      ${c.notes ? `<div class="sub">${icon("note", 12)} ${esc(c.notes)}</div>` : ""}
      <div id="editForm" class="hidden" style="margin-top:1rem">
        <div class="form-grid">
          <label class="f">Name *<input id="ecName" value="${esc(c.name)}"></label>
          <label class="f">Phone<input id="ecPhone" value="${esc(c.phone)}"></label>
          <label class="f">Alternate phone<input id="ecAlt" value="${esc(c.alt_phone)}"></label>
          <label class="f">Address<input id="ecAddr" value="${esc(c.address)}"></label>
          <label class="f full">Notes<input id="ecNotes" value="${esc(c.notes)}"></label>
        </div>
        <button id="saveEditBtn" class="btn">Save changes</button>
      </div>
    </div>
    <a href="#/new/${c.id}" class="btn btn-big" style="display:block;text-align:center;text-decoration:none;margin-bottom:1rem">+ New job for ${esc(c.name)}</a>
    <div class="card">
      <h3>Jobs <span class="count">${d.jobs.length}</span></h3>
      ${d.jobs.map((j) => jobRow(j, { showClient: false })).join("") || '<div class="empty">No jobs yet.</div>'}
    </div>`;

  view.querySelector("#editBtn").addEventListener("click", () =>
    view.querySelector("#editForm").classList.toggle("hidden"));
  view.querySelector("#delClientBtn").addEventListener("click", async () => {
    const warn = d.jobs.length
      ? `Delete ${c.name} permanently?\nTheir ${d.jobs.length} job(s), payments and history will ALL be deleted. This cannot be undone.`
      : `Delete ${c.name} permanently? This cannot be undone.`;
    if (!confirm(warn)) return;
    try {
      await api("/api/clients/" + id, { method: "DELETE" });
      toast("Client deleted");
      location.hash = "#/clients";
    } catch (e) { toast(e.message, true); }
  });
  view.querySelector("#saveEditBtn").addEventListener("click", async () => {
    try {
      await api("/api/clients/" + id, { method: "PATCH", body: {
        name: view.querySelector("#ecName").value,
        phone: view.querySelector("#ecPhone").value,
        alt_phone: view.querySelector("#ecAlt").value,
        address: view.querySelector("#ecAddr").value,
        notes: view.querySelector("#ecNotes").value,
      }});
      toast("Saved");
      renderClient(id);
    } catch (e) { toast(e.message, true); }
  });
}

/* ---------------------------------------------------------- quick add */

async function renderQuickAdd(prefillClientId) {
  let selectedClient = null;
  const asg = await api("/api/assignees");
  if (prefillClientId) {
    const d = await api("/api/clients/" + prefillClientId);
    selectedClient = { id: d.client.id, name: d.client.name, phone: d.client.phone };
  }

  view.innerHTML = `
    <div class="page-title">New Job</div>
    <div class="card">
      <h3>1. Client Details</h3>
      <div id="clientPick"></div>
    </div>
    <div class="card">
      <h3>2. What is the work?</h3>
      <div class="form-grid">
        <label class="f">Service *<select id="jService">${serviceOptions()}</select></label>
        <label class="f">Amount agreed (₹)<input id="jAmount" inputmode="numeric" placeholder="0"></label>
        <label class="f">Assigned to<input id="jAssign" list="assigneeDL" placeholder="Type a name" autocomplete="off"></label>
        <label class="f">Details<input id="jDetails" placeholder="e.g. Fresh passport for son, urgent"></label>
      </div>
      <div id="jAssignHint" class="sub"></div>
    </div>
    <div class="card">
      <h3>3. Follow-up & advance</h3>
      <div class="form-grid">
        <label class="f">Next action<input id="jNext" placeholder="e.g. Collect Aadhaar copy"></label>
        <label class="f">Follow-up date<input id="jDate" type="date">
          <span class="quick-dates">
            <button class="btn btn-light btn-sm" data-days="0">Today</button>
            <button class="btn btn-light btn-sm" data-days="1">Tomorrow</button>
            <button class="btn btn-light btn-sm" data-days="7">+1 week</button>
          </span>
        </label>
        <label class="f">Advance received (₹)<input id="jAdvance" inputmode="numeric" placeholder="0"></label>
      </div>
    </div>
    ${stagedDocsCard()}
    <button id="saveJobBtn" class="btn btn-big">Save job</button>
    ${assigneeDatalist(asg.assignees)}`;

  const pick = view.querySelector("#clientPick");
  const drawPick = () => {
    if (selectedClient) {
      pick.innerHTML = `
        <div class="row" style="cursor:default">
          <div class="grow"><div class="title">${icon("check", 14)} ${esc(selectedClient.name)}</div>
          <div class="sub">${esc(selectedClient.phone || "")}</div></div>
          <button id="clearClient" class="btn btn-light btn-sm">Change</button>
        </div>`;
      pick.querySelector("#clearClient").addEventListener("click", () => { selectedClient = null; drawPick(); });
      return;
    }
    pick.innerHTML = `
      <div class="form-grid">
        <label class="f">Client name *<input id="qcName" autocomplete="off"></label>
        <label class="f">Phone number<input id="qcPhone" inputmode="tel" autocomplete="off"></label>
      </div>
      <div class="sub">If this phone number matches an existing client, the job is added to their history automatically.</div>`;
  };
  drawPick();

  const jAssign = view.querySelector("#jAssign");
  const jAssignHint = view.querySelector("#jAssignHint");
  jAssign.addEventListener("input", () => {
    jAssignHint.innerHTML = assigneeHint(jAssign.value, asg.logins);
  });

  const stagedDocs = [];
  wireStagedDocs(stagedDocs);

  view.querySelectorAll(".quick-dates button").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const d = new Date(); d.setDate(d.getDate() + Number(b.dataset.days));
      view.querySelector("#jDate").value =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }));

  view.querySelector("#saveJobBtn").addEventListener("click", async () => {
    const body = {
      service_type_id: Number(view.querySelector("#jService").value),
      details: view.querySelector("#jDetails").value,
      amount_quoted: Number(view.querySelector("#jAmount").value || 0),
      advance: Number(view.querySelector("#jAdvance").value || 0),
      next_action: view.querySelector("#jNext").value,
      next_action_date: view.querySelector("#jDate").value,
      assigned_name: view.querySelector("#jAssign").value.trim(),
    };
    if (selectedClient) {
      body.client_id = selectedClient.id;
    } else {
      const name = view.querySelector("#qcName");
      const phone = view.querySelector("#qcPhone");
      if (!name || !name.value.trim()) { toast("Enter the client's name", true); return; }
      body.new_client = { name: name.value, phone: phone.value };
    }
    const saveBtn = view.querySelector("#saveJobBtn");
    saveBtn.disabled = true;
    try {
      const d = await api("/api/jobs", { method: "POST", body });
      // the job exists now, so the files held in the browser can be attached
      let failed = 0;
      for (let i = 0; i < stagedDocs.length; i++) {
        saveBtn.textContent = `Uploading document ${i + 1} of ${stagedDocs.length}…`;
        try {
          await uploadDocument(d.id, stagedDocs[i]);
        } catch (_) { failed++; }
      }
      toast(failed
        ? `Job saved, but ${failed} document(s) failed to upload`
        : (stagedDocs.length ? `Job saved with ${stagedDocs.length} document(s)` : "Job saved"),
        failed > 0);
      location.hash = "#/job/" + d.id;
    } catch (e) {
      toast(e.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save job";
    }
  });
}

/* ---------------------------------------------------------- documents */

function fileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* Shrink photos before upload — a raw phone photo is several MB, which would
   burn through the database's free storage in a few dozen documents. */
async function compressImage(file, maxDim = 1600, quality = 0.72) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    // keep the original if compressing somehow made it bigger
    return blob && blob.size < file.size ? blob : file;
  } catch (_) {
    return file; // unsupported format (e.g. HEIC on some browsers) — send as-is
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",", 2)[1]);
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsDataURL(blob);
  });
}

async function uploadDocument(jobId, file, name) {
  const isImage = file.type.startsWith("image/") && file.type !== "image/heic";
  const payload = isImage ? await compressImage(file) : file;
  if (payload.size > 10_000_000) throw new Error("That file is too large (max 10 MB)");
  const data = await blobToBase64(payload);
  return api(`/api/jobs/${jobId}/documents`, {
    method: "POST",
    body: {
      name: name || file.name || "photo.jpg",
      mime: isImage ? (payload === file ? file.type : "image/jpeg") : (file.type || "application/pdf"),
      data,
    },
  });
}

/* Live camera capture. Needs a secure page (https or localhost) — the same
   browser rule that applies to the microphone. */
async function captureFromCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("This browser cannot open the camera");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
    audio: false,
  });
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "cam-overlay";
    overlay.innerHTML = `
      <video autoplay playsinline></video>
      <div class="cam-bar">
        <button class="btn btn-ghost" data-cam="cancel">Cancel</button>
        <button class="cam-shutter" data-cam="shoot" title="Take photo"></button>
        <span style="width:5rem"></span>
      </div>`;
    document.body.appendChild(overlay);
    const video = overlay.querySelector("video");
    video.srcObject = stream;
    const close = (result) => {
      stream.getTracks().forEach((t) => t.stop());
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector('[data-cam="cancel"]').addEventListener("click", () => close(null));
    overlay.querySelector('[data-cam="shoot"]').addEventListener("click", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        close(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }, "image/jpeg", 0.85);
    });
  });
}

const canCaptureLive = () =>
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;

/* Attach documents while the job is still being typed in. The job doesn't exist
   yet, so files are held in the browser and uploaded right after it's created. */
function stagedDocsCard() {
  return `
    <div class="card">
      <h3>${icon("paperclip")} Documents <span class="count" id="sdCount">0</span></h3>
      <div class="inline-form" style="margin-bottom:0.8rem">
        <button id="sdCamBtn" class="btn" ${canCaptureLive() ? "" : "disabled"}>${icon("camera", 15)} Take photo</button>
        <button id="sdFileBtn" class="btn btn-light">${icon("upload", 15)} Choose file</button>
        <input id="sdFileInput" type="file" accept="image/*,application/pdf" multiple class="hidden">
      </div>
      ${canCaptureLive() ? "" : `<div class="sub" style="margin-bottom:0.6rem">${icon("info", 12)} Live camera needs a secure (https) address — "Choose file" still works, and on a phone it offers the camera.</div>`}
      <div class="doc-grid" id="sdGrid"></div>
      <div class="sub" id="sdHint" style="margin-top:0.5rem">Photos are shrunk automatically. They upload when you save the job.</div>
    </div>`;
}

function wireStagedDocs(staged) {
  const grid = view.querySelector("#sdGrid");
  const countEl = view.querySelector("#sdCount");
  const fileInput = view.querySelector("#sdFileInput");

  const draw = () => {
    countEl.textContent = staged.length;
    grid.innerHTML = staged.map((f, i) => `
      <div class="doc">
        ${f.type.startsWith("image/")
          ? `<img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">`
          : `<div class="doc-file">${icon("file", 26)}<span>PDF</span></div>`}
        <div class="doc-meta">
          <div class="doc-name" title="${esc(f.name)}">${esc(f.name)}</div>
          <div class="sub">${fileSize(f.size)}</div>
        </div>
        <button class="x-btn" data-unstage="${i}" title="Remove">✕</button>
      </div>`).join("");
    grid.querySelectorAll("[data-unstage]").forEach((b) =>
      b.addEventListener("click", () => {
        staged.splice(Number(b.dataset.unstage), 1);
        draw();
      }));
  };
  draw();

  view.querySelector("#sdFileBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    staged.push(...e.target.files);
    fileInput.value = "";
    draw();
  });
  const cam = view.querySelector("#sdCamBtn");
  if (cam && !cam.disabled) {
    cam.addEventListener("click", async () => {
      try {
        const shot = await captureFromCamera();
        if (shot) { staged.push(shot); draw(); }
      } catch (e) {
        toast(e.name === "NotAllowedError" ? "Camera permission was blocked" : e.message, true);
      }
    });
  }
}

function documentsCard(docs, readOnly = false) {
  const canCapture = canCaptureLive();
  return `
    <div class="card">
      <h3>${icon("paperclip")} Documents <span class="count">${docs.length}</span></h3>
      ${readOnly ? "" : `
      <div class="inline-form" style="margin-bottom:0.8rem">
        <button id="docCamBtn" class="btn" ${canCapture ? "" : "disabled"}>${icon("camera", 15)} Take photo</button>
        <button id="docFileBtn" class="btn btn-light">${icon("upload", 15)} Choose file</button>
        <input id="docFileInput" type="file" accept="image/*,application/pdf" multiple class="hidden">
        <span id="docStatus" class="sub"></span>
      </div>
      ${canCapture ? "" : `<div class="sub" style="margin-bottom:0.6rem">${icon("info", 12)} Live camera needs a secure (https) address — "Choose file" still works, and on a phone it offers the camera.</div>`}`}
      <div class="doc-grid">
        ${docs.map((d) => `
          <div class="doc">
            <a href="/api/documents/${d.id}" target="_blank" rel="noopener" title="${esc(d.name)}">
              ${d.mime.startsWith("image/")
                ? `<img src="/api/documents/${d.id}" alt="${esc(d.name)}" loading="lazy">`
                : `<div class="doc-file">${icon("file", 26)}<span>PDF</span></div>`}
            </a>
            <div class="doc-meta">
              <div class="doc-name" title="${esc(d.name)}">${esc(d.name)}</div>
              <div class="sub">${fileSize(d.size)}${d.uploaded_by_name ? " · " + esc(d.uploaded_by_name) : ""}</div>
            </div>
            ${readOnly ? "" : `<button class="x-btn" data-deldoc="${d.id}" title="Delete this document">✕</button>`}
          </div>`).join("") || '<div class="empty">No documents yet.</div>'}
      </div>
    </div>`;
}

function wireDocuments(jobId, reload) {
  const statusEl = view.querySelector("#docStatus");
  const fileInput = view.querySelector("#docFileInput");
  const send = async (files) => {
    let done = 0;
    for (const f of files) {
      statusEl.textContent = `Uploading ${++done} of ${files.length}…`;
      try {
        await uploadDocument(jobId, f);
      } catch (e) {
        toast(e.message, true);
        statusEl.textContent = "";
        return;
      }
    }
    statusEl.textContent = "";
    toast(files.length > 1 ? `${files.length} documents added` : "Document added");
    reload();
  };

  view.querySelector("#docFileBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const files = [...e.target.files];
    if (files.length) send(files);
  });

  const camBtn = view.querySelector("#docCamBtn");
  if (camBtn && !camBtn.disabled) {
    camBtn.addEventListener("click", async () => {
      try {
        const shot = await captureFromCamera();
        if (shot) send([shot]);
      } catch (e) {
        toast(e.name === "NotAllowedError" ? "Camera permission was blocked" : e.message, true);
      }
    });
  }

  view.querySelectorAll("[data-deldoc]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this document permanently?")) return;
    try {
      await api("/api/documents/" + b.dataset.deldoc, { method: "DELETE" });
      toast("Document deleted");
      reload();
    } catch (e) { toast(e.message, true); }
  }));
}

/* ---------------------------------------------------------- staff task view */

/* What a staff member sees for one of their tasks: the client to contact, what
   to do, and a place to record what happened. No money, no editing, no delete. */
function renderStaffJob(id, d, j, kindIcon, documents = []) {
  view.innerHTML = `
    <a class="back" href="#/tasks">← My Tasks</a>
    <div class="card">
      <div class="job-head">
        <h2>${esc(j.service_name)}</h2>
        ${j.status !== "Pending" ? chip(j.status) : ""}
        <div class="spacer"></div>
        ${j.status === "Pending"
          ? `<button id="doneBtn" class="btn btn-green">${icon("check", 15)} Mark as done</button>`
          : `<button id="reopenBtn" class="btn btn-light">${icon("rotate", 13)} Reopen</button>`}
      </div>
      <div class="row" style="cursor:default">
        ${avatar(j.client_name)}
        <div class="grow">
          <div class="title">${esc(j.client_name)}</div>
          <div class="sub">${phoneLink(j.client_phone)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>${icon("arrow")} What to do</h3>
      <div style="font-size:1.08rem;font-weight:600">${esc(j.next_action) || '<span class="sub">No specific action noted</span>'}</div>
      ${j.next_action_date ? `<div style="margin-top:0.4rem">${dateTag(j.next_action_date)}</div>` : ""}
      ${j.details ? `<div class="sub" style="margin-top:0.6rem">${esc(j.details)}</div>` : ""}
    </div>

    ${documentsCard(documents, true)}

    <div class="card">
      <h3>${icon("clock")} Notes</h3>
      <div class="inline-form" style="margin-bottom:0.6rem">
        <label class="f">Add a note<input id="noteText" placeholder="e.g. Client will come Saturday"></label>
        <button id="noteBtn" class="btn">Add</button>
      </div>
      <ul class="tl">
        ${d.timeline.map((n) => `
          <li><span class="k">${kindIcon[n.kind] || icon("note", 15)}</span>
            <div><div>${esc(n.text)}</div>
            <div class="when">${esc(n.user_name || "")} · ${fmtDateTime(n.created_at)}</div></div>
          </li>`).join("") || '<li class="empty">Nothing yet.</li>'}
      </ul>
    </div>`;

  const patch = async (body, msg) => {
    try { await api("/api/jobs/" + id, { method: "PATCH", body }); toast(msg); renderJob(id); }
    catch (e) { toast(e.message, true); }
  };
  const doneBtn = view.querySelector("#doneBtn");
  if (doneBtn) doneBtn.addEventListener("click", () => patch({ status: "Completed" }, "Marked as done"));
  const reopenBtn = view.querySelector("#reopenBtn");
  if (reopenBtn) reopenBtn.addEventListener("click", () => patch({ status: "Pending" }, "Moved back to pending"));
  view.querySelector("#noteBtn").addEventListener("click", async () => {
    const text = view.querySelector("#noteText").value.trim();
    if (!text) return;
    try {
      await api(`/api/jobs/${id}/notes`, { method: "POST", body: { text } });
      renderJob(id);
    } catch (e) { toast(e.message, true); }
  });
}

/* ---------------------------------------------------------- job page */

async function renderJob(id) {
  // the assignee list is admin-only; documents are visible to whoever owns the task
  const [d, asg, docs] = await Promise.all([
    api("/api/jobs/" + id),
    isAdmin() ? api("/api/assignees") : Promise.resolve({ assignees: [], logins: [] }),
    api(`/api/jobs/${id}/documents`),
  ]);
  const j = d.job;
  const kindIcon = { note: icon("note", 15), status: icon("swap", 15),
    payment: icon("banknote", 15), system: icon("info", 15) };

  if (!isAdmin()) return renderStaffJob(id, d, j, kindIcon, docs.documents);

  view.innerHTML = `
    <a class="back" href="javascript:history.back()">← Back</a>
    <div class="card">
      <div class="job-head">
        <h2>${esc(j.service_name)}</h2>
        ${j.status !== "Pending" ? chip(j.status) : ""}
        <div class="spacer"></div>
        <a class="btn btn-light btn-sm" href="#/invoice/${j.id}">${icon("file", 13)} Invoice</a>
        ${j.status === "Pending"
          ? `<button id="doneBtn" class="btn btn-green">${icon("check", 15)} Mark as done</button>
             <button id="cancelJobBtn" class="btn btn-danger btn-sm">Cancel job</button>`
          : `<button id="reopenBtn" class="btn btn-light">${icon("rotate", 13)} Reopen</button>`}
        <button id="delJobBtn" class="btn btn-danger btn-sm">${icon("trash", 13)} Delete</button>
      </div>
      <div class="row" data-go="#/client/${j.client_id}">
        ${avatar(j.client_name)}
        <div class="grow">
          <div class="title">${esc(j.client_name)}</div>
          <div class="sub">${phoneLink(j.client_phone)}</div>
        </div>
        <div class="right sub">view client →</div>
      </div>
      <div class="inline-form" style="margin-top:0.6rem">
        <label class="f">Assigned to (who does the job)
          <input id="assignInp" list="assigneeDL" value="${esc(j.assigned_name)}" placeholder="Type a name…" autocomplete="off">
        </label>
      </div>
      <div id="assignHint" class="sub" style="margin-top:0.3rem"></div>
      ${assigneeDatalist(asg.assignees)}
      <div class="sub" style="margin-top:0.5rem">Started ${fmtDateTime(j.created_at)}${j.completed_at ? " · Completed " + fmtDateTime(j.completed_at) : ""}</div>
    </div>

    <div class="card">
      <h3>${icon("arrow")} Next action</h3>
      <div class="inline-form">
        <label class="f">What to do<input id="naText" value="${esc(j.next_action)}" placeholder="e.g. Check application status"></label>
        <label class="f">By when<input id="naDate" type="date" value="${esc(j.next_action_date)}"></label>
        <button id="naSave" class="btn">Save</button>
      </div>
      <span class="quick-dates">
        <button class="btn btn-light btn-sm" data-days="0">Today</button>
        <button class="btn btn-light btn-sm" data-days="1">Tomorrow</button>
        <button class="btn btn-light btn-sm" data-days="7">+1 week</button>
      </span>
    </div>

    <div class="card">
      <h3>${icon("rupee")} Money</h3>
      <div class="money-grid">
        <div class="cell"><div class="v">${money(j.amount_quoted)}</div><div class="l">Agreed</div></div>
        <div class="cell"><div class="v paid-ok">${money(j.paid)}</div><div class="l">Received</div></div>
        <div class="cell"><div class="v ${j.balance > 0 ? "balance-due" : ""}">${money(j.balance)}</div><div class="l">Balance</div></div>
      </div>
      <div class="inline-form">
        <label class="f">Add payment (₹)<input id="payAmt" inputmode="numeric" placeholder="0"></label>
        <label class="f">Note<input id="payNote" placeholder="cash / UPI…"></label>
        <button id="payBtn" class="btn">+ Payment</button>
      </div>
      <div class="inline-form" style="margin-top:0.7rem">
        <label class="f">Change agreed amount (₹)<input id="quoteAmt" inputmode="numeric" value="${j.amount_quoted}"></label>
        <button id="quoteBtn" class="btn btn-light">Update</button>
      </div>
      ${d.payments.length ? `<div style="margin-top:0.8rem">
        ${d.payments.map((p) => `
        <div class="row" style="cursor:default">
          <div class="grow sub"><b class="paid-ok">${money(p.amount)}</b>${p.note ? " · " + esc(p.note) : ""} · ${esc(p.received_by_name || "")} · ${fmtDateTime(p.received_at)}</div>
          <button class="x-btn" data-delpay="${p.id}" title="Delete this payment">✕</button>
        </div>`).join("")}
      </div>` : ""}
    </div>

    <div class="card">
      <h3>${icon("file")} Details</h3>
      <label class="f"><textarea id="jobDetails" rows="2">${esc(j.details)}</textarea></label>
      <button id="detailsBtn" class="btn btn-light btn-sm">Save details</button>
    </div>

    ${documentsCard(docs.documents)}

    <div class="card">
      <h3>${icon("clock")} History & notes</h3>
      <div class="inline-form" style="margin-bottom:0.6rem">
        <label class="f">Add a note<input id="noteText" placeholder="e.g. Client will come Saturday"></label>
        <button id="noteBtn" class="btn">Add</button>
      </div>
      <ul class="tl">
        ${d.timeline.map((n) => `
          <li><span class="k">${kindIcon[n.kind] || icon("note", 15)}</span>
            <div><div>${esc(n.text)}</div>
            <div class="when">${esc(n.user_name || "")} · ${fmtDateTime(n.created_at)}</div></div>
            <span class="spacer"></span>
            <button class="x-btn" data-delnote="${n.id}" title="Delete this entry">✕</button>
          </li>`).join("") || '<li class="empty">Nothing yet.</li>'}
      </ul>
    </div>`;

  const patch = async (body, msg) => {
    try { await api("/api/jobs/" + id, { method: "PATCH", body }); toast(msg); renderJob(id); }
    catch (e) { toast(e.message, true); }
  };

  const doneBtn = view.querySelector("#doneBtn");
  if (doneBtn) doneBtn.addEventListener("click", () => patch({ status: "Completed" }, "Marked as done"));
  const cancelJobBtn = view.querySelector("#cancelJobBtn");
  if (cancelJobBtn) cancelJobBtn.addEventListener("click", () => {
    if (confirm("Cancel this job? It will move to the Completed tab as cancelled.")) {
      patch({ status: "Cancelled" }, "Job cancelled");
    }
  });
  const reopenBtn = view.querySelector("#reopenBtn");
  if (reopenBtn) reopenBtn.addEventListener("click", () => patch({ status: "Pending" }, "Moved back to Pending"));
  const assignInp = view.querySelector("#assignInp");
  const assignHint = view.querySelector("#assignHint");
  const drawAssignHint = () => {
    assignHint.innerHTML = assigneeHint(assignInp.value, asg.logins);
  };
  drawAssignHint();
  assignInp.addEventListener("input", drawAssignHint);
  assignInp.addEventListener("change", (e) =>
    patch({ assigned_name: e.target.value.trim() }, "Assignee updated"));
  view.querySelector("#delJobBtn").addEventListener("click", async () => {
    if (!confirm("Delete this job permanently?\nAll its payments and history will be deleted too. This cannot be undone.")) return;
    try {
      await api("/api/jobs/" + id, { method: "DELETE" });
      toast("Job deleted");
      location.hash = "#/tasks";
    } catch (e) { toast(e.message, true); }
  });
  view.querySelectorAll("[data-delpay]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this payment entry? The balance will go back up.")) return;
    try {
      await api("/api/payments/" + b.dataset.delpay, { method: "DELETE" });
      toast("Payment deleted");
      renderJob(id);
    } catch (e) { toast(e.message, true); }
  }));
  view.querySelectorAll("[data-delnote]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this history entry?")) return;
    try {
      await api("/api/notes/" + b.dataset.delnote, { method: "DELETE" });
      renderJob(id);
    } catch (e) { toast(e.message, true); }
  }));
  wireDocuments(id, () => renderJob(id));
  view.querySelector("#naSave").addEventListener("click", () =>
    patch({ next_action: view.querySelector("#naText").value,
            next_action_date: view.querySelector("#naDate").value }, "Follow-up saved"));
  view.querySelectorAll(".quick-dates button").forEach((b) =>
    b.addEventListener("click", () => {
      const dd = new Date(); dd.setDate(dd.getDate() + Number(b.dataset.days));
      view.querySelector("#naDate").value =
        `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    }));
  view.querySelector("#quoteBtn").addEventListener("click", () =>
    patch({ amount_quoted: Number(view.querySelector("#quoteAmt").value || 0) }, "Amount updated"));
  view.querySelector("#detailsBtn").addEventListener("click", () =>
    patch({ details: view.querySelector("#jobDetails").value }, "Details saved"));

  view.querySelector("#payBtn").addEventListener("click", async () => {
    const amt = Number(view.querySelector("#payAmt").value || 0);
    if (!amt) { toast("Enter the payment amount", true); return; }
    try {
      await api(`/api/jobs/${id}/payments`, { method: "POST",
        body: { amount: amt, note: view.querySelector("#payNote").value } });
      toast("Payment recorded");
      renderJob(id);
    } catch (e) { toast(e.message, true); }
  });
  view.querySelector("#noteBtn").addEventListener("click", async () => {
    const text = view.querySelector("#noteText").value.trim();
    if (!text) return;
    try {
      await api(`/api/jobs/${id}/notes`, { method: "POST", body: { text } });
      renderJob(id);
    } catch (e) { toast(e.message, true); }
  });
}

/* ---------------------------------------------------------- invoice */

async function renderInvoice(id) {
  const d = await api("/api/jobs/" + id);
  const j = d.job;
  const cd = await api("/api/clients/" + j.client_id);
  const c = cd.client;
  const invNo = "INV-" + String(j.id).padStart(4, "0");

  view.innerHTML = `
    <div class="no-print" style="display:flex;gap:0.6rem;margin-bottom:1rem">
      <a class="btn btn-ghost" href="#/job/${j.id}">← Back to job</a>
      <div class="spacer"></div>
      <button id="printBtn" class="btn">${icon("printer", 15)} Print / Save as PDF</button>
    </div>
    <div class="invoice card">
      <div class="inv-head">
        <div>
          ${logoSVG(62)}
          <div class="inv-sub" style="margin-top:0.55rem">${esc(COMPANY.address)}</div>
          <div class="inv-sub">Phone: ${esc(COMPANY.phone)} · Email: ${esc(COMPANY.email)}</div>
        </div>
        <div class="inv-label">
          <div class="inv-title">INVOICE</div>
          <div class="inv-sub"><b>${invNo}</b></div>
          <div class="inv-sub">Date: ${fmtDate(todayStr())}</div>
        </div>
      </div>
      <div class="inv-billto">
        <div class="inv-mini">BILL TO</div>
        <div style="font-weight:700">${esc(c.name)}</div>
        ${c.phone ? `<div class="inv-sub">${esc(c.phone)}</div>` : ""}
        ${c.address ? `<div class="inv-sub">${esc(c.address)}</div>` : ""}
      </div>
      <table class="inv-table">
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>${esc(j.service_name)}${j.details ? " — " + esc(j.details) : ""}</td>
            <td style="text-align:right">${money(j.amount_quoted)}</td>
          </tr>
        </tbody>
      </table>
      <div class="inv-totals">
        <div><span>Total</span><b>${money(j.amount_quoted)}</b></div>
        <div><span>Received</span><b>${money(j.paid)}</b></div>
        <div class="inv-due"><span>Balance due</span><b>${money(j.balance)}</b></div>
      </div>
      ${j.amount_quoted > 0 && j.balance <= 0 ? '<div class="inv-paid">PAID ✓</div>' : ""}
      ${d.payments.length ? `
      <div class="inv-mini" style="margin-top:1.2rem">PAYMENTS RECEIVED</div>
      <table class="inv-table small">
        <tbody>
        ${d.payments.slice().reverse().map((p) => `
          <tr><td>${fmtDateTime(p.received_at)}${p.note ? " · " + esc(p.note) : ""}</td>
              <td style="text-align:right">${money(p.amount)}</td></tr>`).join("")}
        </tbody>
      </table>` : ""}
      <div class="inv-foot">Thank you for your business!<br>${esc(COMPANY.name)} · ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</div>
    </div>`;

  view.querySelector("#printBtn").addEventListener("click", () => window.print());
}

/* ---------------------------------------------------------- payments */

async function renderPayments() {
  const d = await api("/api/payments");
  view.innerHTML = `
    <div class="page-title">Payments</div>
    <div class="stats">
      <div class="stat ${d.totals.pending_total ? "alert" : ""}"><div class="num">${money(d.totals.pending_total)}</div><div class="lbl">Total to collect</div></div>
      <div class="stat"><div class="num">${money(d.totals.received_today)}</div><div class="lbl">Received today</div></div>
    </div>
    <div class="card ${d.pending.length ? "danger" : ""}">
      <h3>To collect <span class="count">${d.pending.length}</span></h3>
      ${d.pending.map((j) => `
        <div class="row" data-go="#/job/${j.id}">
          <div class="grow">
            <div class="title">${esc(j.client_name)}</div>
            <div class="sub">${esc(j.service_name)} · ${chip(j.status)} ${j.client_phone ? "· " + phoneLink(j.client_phone) : ""}</div>
          </div>
          <div class="right">
            <div class="balance-due">${money(j.balance)}</div>
            <div class="sub">${money(j.paid)} of ${money(j.amount_quoted)} paid</div>
          </div>
          <a class="btn btn-light btn-sm" href="#/invoice/${j.id}" title="Generate invoice">${icon("file", 15)}</a>
        </div>`).join("") || '<div class="empty">Nothing pending all collected.</div>'}
    </div>
    <div class="card">
      <h3>Recently received</h3>
      ${d.recent.map((p) => `
        <div class="row" data-go="#/job/${p.job_id}">
          <div class="grow">
            <div class="title">${esc(p.client_name)} — ${money(p.amount)}</div>
            <div class="sub">${esc(p.service_name)}${p.note ? " · " + esc(p.note) : ""}</div>
          </div>
          <div class="right sub">${esc(p.received_by_name || "")}<br>${fmtDateTime(p.received_at)}</div>
        </div>`).join("") || '<div class="empty">No payments recorded yet.</div>'}
    </div>`;
}

/* ---------------------------------------------------------- settings */

async function renderSettings() {
  const phoneCard = `
    <div class="card">
      <h3>${icon("smartphone")} Open on a phone</h3>
      ${boot.is_cloud
        ? `<p>This app is hosted online, so any phone can open it from anywhere — just share this website's address (the one in the browser's address bar right now).</p>
           <p class="sub">Tip: open it in the phone's browser, then use "Add to Home Screen" to make it feel like an app.</p>`
        : boot.lan_ip
        ? `<p>On any phone connected to the <b>same Wi-Fi</b> as this computer, open:</p>
           <p style="font-size:1.3rem;font-weight:700;margin:0.5rem 0">http://${esc(boot.lan_ip)}:${boot.port}</p>
           <p class="sub">Tip: open it in the phone's browser, then use "Add to Home Screen" to make it feel like an app.</p>`
        : "<p class='sub'>Could not detect the network address. Check the black server window — it shows the phone link.</p>"}
    </div>`;

  if (boot.me.role !== "admin") {
    view.innerHTML = `<div class="page-title">Settings</div>${phoneCard}
      <div class="card"><p class="sub">User and service management is available to the admin.</p></div>`;
    return;
  }

  const [ud, sd, st] = await Promise.all([
    api("/api/users"), api("/api/service_types"), api("/api/storage")]);
  const usedPct = Math.min(100, (st.bytes / st.limit_bytes) * 100);

  view.innerHTML = `
    <div class="page-title">Settings</div>
    ${phoneCard}
    <div class="card">
      <h3>${icon("users")} Users</h3>
      ${ud.users.map((u) => `
        <div class="row" style="cursor:default">
          <div class="grow"><div class="title">${esc(u.name)} ${u.role === "admin" ? '<span class="chip s-pending">admin</span>' : ""} ${u.active ? "" : '<span class="chip s-cancelled">inactive</span>'}</div></div>
          <div class="right">
            <button class="btn btn-light btn-sm" data-act="pin" data-id="${u.id}" data-name="${esc(u.name)}">Reset PIN</button>
            ${u.id !== boot.me.id ? `<button class="btn ${u.active ? "btn-danger" : "btn-light"} btn-sm" data-act="toggle" data-id="${u.id}" data-active="${u.active}">${u.active ? "Deactivate" : "Activate"}</button>` : ""}
          </div>
        </div>`).join("")}
      <div class="inline-form" style="margin-top:0.8rem">
        <label class="f">Name<input id="nuName"></label>
        <label class="f">PIN or password<input id="nuPin" type="text" autocapitalize="off"
          autocorrect="off" spellcheck="false" placeholder="letters or numbers"></label>
        <label class="f">Role<select id="nuRole"><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
        <button id="nuBtn" class="btn">+ Add user</button>
      </div>
    </div>
    <div class="card">
      <h3>${icon("tag")} Services offered</h3>
      ${sd.services.map((s) => `
        <div class="row" style="cursor:default">
          <div class="grow"><div class="title" style="${s.active ? "" : "color:var(--muted);text-decoration:line-through"}">${esc(s.name)}</div></div>
          <div class="right"><button class="btn ${s.active ? "btn-danger" : "btn-light"} btn-sm" data-sact="toggle" data-id="${s.id}" data-active="${s.active}">${s.active ? "Hide" : "Restore"}</button></div>
        </div>`).join("")}
      <div class="inline-form" style="margin-top:0.8rem">
        <label class="f">New service name<input id="nsName" placeholder="e.g. Voter ID"></label>
        <button id="nsBtn" class="btn">+ Add service</button>
      </div>
    </div>
    <div class="card">
      <h3>${icon("paperclip")} Document storage</h3>
      <p class="sub" style="margin-bottom:0.5rem">
        <b>${st.documents}</b> document(s) using <b>${fileSize(st.bytes)}</b> of ${fileSize(st.limit_bytes)}.
      </p>
      <div class="meter"><span style="width:${usedPct.toFixed(1)}%"></span></div>
      <p class="sub" style="margin-top:0.5rem">Photos are automatically shrunk before saving, so roughly 1,500–2,500 documents fit in the free plan. Delete old ones from a job if this ever fills up.</p>
    </div>
    <div class="card">
      <h3>${icon("download")} Backup</h3>
      <p class="sub" style="margin-bottom:0.7rem">Saves a safe copy of all data into the <b>backups</b> folder next to the app. Do this regularly — and occasionally copy that folder to a pen drive or Google Drive. (Document files themselves are not included — only their details.)</p>
      <button id="backupBtn" class="btn">Backup now</button>
    </div>`;

  const refresh = async () => {
    boot = await api("/api/bootstrap");
    renderSettings();
  };

  view.querySelectorAll("[data-act='pin']").forEach((b) => b.addEventListener("click", async () => {
    const pin = prompt(`New PIN or password for ${b.dataset.name}\n(letters and numbers both allowed, at least 4 characters):`);
    if (!pin || !pin.trim()) return;
    try { await api("/api/users/" + b.dataset.id, { method: "PATCH", body: { pin: pin.trim() } }); toast("PIN updated"); }
    catch (e) { toast(e.message, true); }
  }));
  view.querySelectorAll("[data-act='toggle']").forEach((b) => b.addEventListener("click", async () => {
    try {
      await api("/api/users/" + b.dataset.id, { method: "PATCH", body: { active: b.dataset.active !== "1" } });
      toast("Updated"); refresh();
    } catch (e) { toast(e.message, true); }
  }));
  view.querySelector("#nuBtn").addEventListener("click", async () => {
    try {
      const r = await api("/api/users", { method: "POST", body: {
        name: view.querySelector("#nuName").value,
        pin: view.querySelector("#nuPin").value,
        role: view.querySelector("#nuRole").value,
      }});
      toast(r.adopted_jobs
        ? `User added — ${r.adopted_jobs} existing task(s) moved into their portal`
        : "User added");
      refresh();
    } catch (e) { toast(e.message, true); }
  });
  view.querySelectorAll("[data-sact='toggle']").forEach((b) => b.addEventListener("click", async () => {
    try {
      await api("/api/service_types/" + b.dataset.id, { method: "PATCH", body: { active: b.dataset.active !== "1" } });
      toast("Updated"); refresh();
    } catch (e) { toast(e.message, true); }
  }));
  view.querySelector("#nsBtn").addEventListener("click", async () => {
    try {
      await api("/api/service_types", { method: "POST", body: { name: view.querySelector("#nsName").value } });
      toast("Service added"); refresh();
    } catch (e) { toast(e.message, true); }
  });
  view.querySelector("#backupBtn").addEventListener("click", async () => {
    try {
      const d = await api("/api/backup", { method: "POST" });
      toast("Backup saved: " + d.path.split("\\").pop());
    } catch (e) { toast(e.message, true); }
  });
}

/* ---------------------------------------------------------- start */

(async function start() {
  document.querySelector("#topbar .brand").innerHTML = logoSVG(40);
  boot = await api("/api/bootstrap");
  route();
})();
