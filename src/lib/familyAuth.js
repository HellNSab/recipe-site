const FAMILY_AUTH_KEY = "recipe_family_auth";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isFamilyAuthenticated() {
  try {
    const stored = localStorage.getItem(FAMILY_AUTH_KEY);
    if (!stored) return false;
    const { expiresAt } = JSON.parse(stored);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(FAMILY_AUTH_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function familyLogin(password) {
  if (password !== import.meta.env.VITE_FAMILY_PASSWORD) {
    return false;
  }
  localStorage.setItem(
    FAMILY_AUTH_KEY,
    JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION })
  );
  return true;
}

export function familyLogout() {
  localStorage.removeItem(FAMILY_AUTH_KEY);
}
