export const ADMIN_TOKEN_KEY = "gmv_admin_token";
export const SELECTED_SESSION_KEY = "gmv_selected_session_id";
export const SESSION_TOKEN_KEY = "gmv_session_token";

export type SessionBundle = {
  session: {
    id: string;
    status: string;
    created_at: string;
  };
  client: {
    name: string;
    clinic_name: string;
    email: string;
  };
};

type AdminSessionsPayload = {
  sessions?: SessionBundle[];
  details?: string;
};

export function getSessionFromQuery() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("session") ?? "";
}

export function loadStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(key) ?? "";
}

export function loadEditorialContext() {
  const querySession = getSessionFromQuery();
  const sessionId = querySession || loadStoredValue(SELECTED_SESSION_KEY);
  const adminToken = loadStoredValue(ADMIN_TOKEN_KEY);

  if (sessionId && typeof window !== "undefined") {
    localStorage.setItem(SELECTED_SESSION_KEY, sessionId);
  }

  return {
    adminToken,
    sessionId,
  };
}

export function persistAdminToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function persistSessionId(sessionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SELECTED_SESSION_KEY, sessionId.trim());
}

export async function fetchAdminSessions(adminToken: string) {
  const response = await fetch("/api/admin/sessions", {
    headers: {
      "x-admin-token": adminToken.trim(),
    },
  });

  const body = (await response.json().catch(() => null)) as AdminSessionsPayload | null;

  return {
    ok: response.ok,
    status: response.status,
    sessions: body?.sessions ?? [],
    details: body?.details ?? "Falha ao carregar sessoes.",
  };
}
