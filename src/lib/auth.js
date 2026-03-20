/**
 * Simple authentication module for family recipe site
 * Uses GitHub Personal Access Token (PAT) for authentication
 * The PAT is stored in localStorage after successful login
 */

const AUTH_KEY = "recipe_site_auth";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const auth = getStoredAuth();
  if (!auth) return false;

  // Check if session has expired
  if (Date.now() > auth.expiresAt) {
    logout();
    return false;
  }

  return true;
}

/**
 * Get the stored authentication data
 * @returns {Object|null}
 */
function getStoredAuth() {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Get the stored GitHub PAT
 * @returns {string|null}
 */
export function getToken() {
  const auth = getStoredAuth();
  if (!auth || Date.now() > auth.expiresAt) {
    return null;
  }
  return auth.token;
}

/**
 * Validate a GitHub PAT by making a test API call
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<{valid: boolean, username?: string, error?: string}>}
 */
export async function validateToken(token) {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return { valid: false, error: "Token is required" };
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: true, username: data.login };
    } else if (response.status === 401) {
      return { valid: false, error: "Invalid token" };
    } else if (response.status === 403) {
      return { valid: false, error: "Token lacks required permissions" };
    } else {
      return { valid: false, error: `GitHub API error: ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

/**
 * Attempt to log in with a GitHub PAT
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<{success: boolean, username?: string, error?: string}>}
 */
export async function login(token) {
  const validation = await validateToken(token);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Store the auth data
  const authData = {
    token: token.trim(),
    username: validation.username,
    expiresAt: Date.now() + SESSION_DURATION,
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    return { success: true, username: validation.username };
  } catch (error) {
    return { success: false, error: "Failed to save authentication" };
  }
}

/**
 * Log out the current user
 */
export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Get the currently logged in username
 * @returns {string|null}
 */
export function getUsername() {
  const auth = getStoredAuth();
  return auth?.username || null;
}

/**
 * Extend the current session
 */
export function extendSession() {
  const auth = getStoredAuth();
  if (auth) {
    auth.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }
}
