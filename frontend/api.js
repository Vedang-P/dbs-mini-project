const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const VERCEL_BACKEND_PREFIX = "/_/backend";
const SESSION_KEY = "authSession";

export function getApiBase() {
  const customBase = (localStorage.getItem("apiBase") || "").trim();
  if (customBase) {
    return customBase.replace(/\/$/, "");
  }

  const host = window.location.hostname || "";
  const isLocalHost = host === "127.0.0.1" || host === "localhost";
  const isLocalFastApi = isLocalHost && window.location.port === "8000";

  if (isLocalFastApi) {
    return window.location.origin;
  }

  if (window.location.origin && window.location.origin.startsWith("http")) {
    return `${window.location.origin}${VERCEL_BACKEND_PREFIX}`;
  }

  return DEFAULT_API_BASE;
}

export function getAuthSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.user) return null;

    if (parsed.expires_at) {
      const expiry = new Date(parsed.expires_at).getTime();
      if (Number.isFinite(expiry) && Date.now() > expiry) {
        clearActiveUser();
        return null;
      }
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function setAuthSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAuthToken() {
  const session = getAuthSession();
  return session?.access_token || null;
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const requestHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    headers: requestHeaders,
    ...options,
  });

  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    payload = {};
  }

  if (!response.ok) {
    const detail = payload.detail || "Request failed";
    if (response.status === 401) {
      clearActiveUser();
      if (!window.location.pathname.endsWith("/login.html")) {
        window.location.href = "login.html";
      }
    }
    throw new Error(detail);
  }

  return payload;
}

export function setActiveUser(user) {
  const session = getAuthSession();
  const nextSession = {
    ...(session || {}),
    user,
  };
  setAuthSession(nextSession);
}

export function getActiveUser() {
  const session = getAuthSession();
  if (session?.user) return session.user;

  // Backward compatibility for old local data.
  const legacy = localStorage.getItem("activeUser");
  if (!legacy) return null;
  try {
    return JSON.parse(legacy);
  } catch (_) {
    return null;
  }
}

export function clearActiveUser() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("activeUser");
}

export function requireActiveUser() {
  const user = getActiveUser();
  const token = getAuthToken();
  if (!user?.user_id || !token) {
    clearActiveUser();
    window.location.href = "login.html";
    return null;
  }
  return user;
}
