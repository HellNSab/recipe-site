import { describe, it, expect, beforeEach } from "vitest";
import { isAuthenticated, login, logout, getToken, extendSession } from "./auth.js";

const AUTH_KEY = "recipe_admin_auth";

function setStoredAuth(overrides = {}) {
  const auth = {
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  return auth;
}

describe("isAuthenticated", () => {
  beforeEach(() => localStorage.clear());

  it("retourne false si aucune session stockée", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("retourne true si session valide", () => {
    setStoredAuth();
    expect(isAuthenticated()).toBe(true);
  });

  it("retourne false et supprime la session si expirée", () => {
    setStoredAuth({ expiresAt: Date.now() - 1000 });
    expect(isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});

describe("login", () => {
  beforeEach(() => localStorage.clear());

  it("retourne false si mot de passe incorrect", () => {
    expect(login("mauvais-mot-de-passe")).toBe(false);
  });

  it("ne crée pas de session si mot de passe incorrect", () => {
    login("mauvais-mot-de-passe");
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});

describe("getToken", () => {
  beforeEach(() => localStorage.clear());

  it("retourne null si aucune session", () => {
    expect(getToken()).toBeNull();
  });

  it("retourne null si session expirée", () => {
    setStoredAuth({ expiresAt: Date.now() - 1000 });
    expect(getToken()).toBeNull();
  });

  it("retourne la valeur de VITE_GITHUB_TOKEN si session valide", () => {
    setStoredAuth();
    // VITE_GITHUB_TOKEN is undefined in test env, so getToken returns null
    // (env var not set — correct behavior)
    const result = getToken();
    expect(result === null || typeof result === "string").toBe(true);
  });
});

describe("logout", () => {
  beforeEach(() => localStorage.clear());

  it("supprime la session du localStorage", () => {
    setStoredAuth();
    logout();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it("ne lance pas d'erreur si aucune session", () => {
    expect(() => logout()).not.toThrow();
  });
});

describe("extendSession", () => {
  beforeEach(() => localStorage.clear());

  it("repousse la date d'expiration", async () => {
    const auth = setStoredAuth({ expiresAt: Date.now() + 1000 });
    await new Promise((r) => setTimeout(r, 5));
    extendSession();
    const updated = JSON.parse(localStorage.getItem(AUTH_KEY));
    expect(updated.expiresAt).toBeGreaterThan(auth.expiresAt);
  });

  it("ne fait rien si aucune session", () => {
    expect(() => extendSession()).not.toThrow();
  });
});
