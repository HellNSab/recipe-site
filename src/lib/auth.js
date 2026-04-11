const AUTH_KEY = "recipe_admin_auth";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getStoredAuth() {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const auth = getStoredAuth();
  if (!auth) return false;
  if (Date.now() > auth.expiresAt) {
    logout();
    return false;
  }
  return true;
}

export function login(password) {
  if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
    return false;
  }
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION })
  );
  return true;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

// Token comes from the build environment — never entered by the user
export function getToken() {
  if (!isAuthenticated()) return null;
  return import.meta.env.VITE_GITHUB_TOKEN || null;
}

export function extendSession() {
  const auth = getStoredAuth();
  if (auth) {
    auth.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }
}
