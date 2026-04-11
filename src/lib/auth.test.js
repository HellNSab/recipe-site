import { describe, it, expect, beforeEach } from "vitest";
import {
  isAuthenticated,
  getToken,
  getUsername,
  logout,
  extendSession,
} from "./auth.js";

const AUTH_KEY = "recipe_site_auth";

function setStoredAuth(overrides = {}) {
  const auth = {
    token: "ghp_test123",
    username: "testuser",
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
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

describe("getToken", () => {
  beforeEach(() => localStorage.clear());

  it("retourne le token si session valide", () => {
    setStoredAuth({ token: "ghp_abc" });
    expect(getToken()).toBe("ghp_abc");
  });

  it("retourne null si aucune session", () => {
    expect(getToken()).toBeNull();
  });

  it("retourne null si session expirée", () => {
    setStoredAuth({ expiresAt: Date.now() - 1000 });
    expect(getToken()).toBeNull();
  });
});

describe("getUsername", () => {
  beforeEach(() => localStorage.clear());

  it("retourne le nom d'utilisateur si session valide", () => {
    setStoredAuth({ username: "maman" });
    expect(getUsername()).toBe("maman");
  });

  it("retourne null si aucune session", () => {
    expect(getUsername()).toBeNull();
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

  it("repousse la date d'expiration", () => {
    const auth = setStoredAuth({ expiresAt: Date.now() + 1000 });
    extendSession();
    const updated = JSON.parse(localStorage.getItem(AUTH_KEY));
    expect(updated.expiresAt).toBeGreaterThan(auth.expiresAt);
  });

  it("ne fait rien si aucune session", () => {
    expect(() => extendSession()).not.toThrow();
  });
});
