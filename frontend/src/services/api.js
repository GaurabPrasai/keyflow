/**
 * Same-origin API client. In development Vite proxies /api to Django; in
 * production Vercel rewrites /api to Azure App Service. Because the browser
 * only ever sees one origin, session cookies stay first-party.
 *
 * Set VITE_API_BASE_URL only if the API really lives somewhere else.
 */
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE.slice(0, -4) : RAW_BASE;

let csrfPromise = null;

function url(path) {
  return `${BASE}/api${path}`;
}

function readCookie(name) {
  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}

export function ensureCsrf() {
  if (!csrfPromise) {
    csrfPromise = fetch(url("/csrf/"), { credentials: "include" })
      .then((response) => response.json().catch(() => ({})))
      .catch(() => {
        csrfPromise = null;
        return {};
      });
  }
  return csrfPromise;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    await ensureCsrf();
    const token = readCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  const response = await fetch(url(path), {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.detail || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request("/me/"),
  login: (credentials) => request("/login/", { method: "POST", body: credentials }),
  register: (account) => request("/register/", { method: "POST", body: account }),
  logout: () => request("/logout/", { method: "POST" }),
  health: () => request("/health/"),
  bulkSessions: (sessions) => request("/sessions/bulk/", { method: "POST", body: { sessions } }),
  listSessions: (limit = 500) => request(`/sessions/?limit=${limit}`),
  deleteSessions: () => request("/sessions/", { method: "DELETE" }),
  exportData: () => request("/export/"),
};

export default api;
