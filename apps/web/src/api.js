import { supabase } from "./supabase";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function resolveAccessToken(preferredToken) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Always prefer the freshest in-memory/local session token.
  if (session?.access_token) {
    return session.access_token;
  }
  return preferredToken || "";
}

async function send(path, method, body, token) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function isAuthError(response, data) {
  if (response.status !== 401 && response.status !== 403) {
    return false;
  }
  const detail = String(data?.detail || data?.error || "").toLowerCase();
  return detail.includes("token") || detail.includes("jwt") || detail.includes("auth");
}

export async function apiFetch(path, accessToken, options = {}) {
  const { method = "GET", body } = options;

  let token = await resolveAccessToken(accessToken);
  let response = await send(path, method, body, token);
  let data = await readResponse(response);

  // Single retry with a refreshed session token for edge races right after login.
  if (isAuthError(response, data)) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const refreshedToken = refreshed?.session?.access_token;

    if (refreshedToken && refreshedToken !== token) {
      token = refreshedToken;
      response = await send(path, method, body, token);
      data = await readResponse(response);
    }
  }

  if (!response.ok) {
    const message = data.detail || data.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}
