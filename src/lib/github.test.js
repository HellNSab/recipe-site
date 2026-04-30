import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveImageUrl, uploadImage } from "./github.js";

describe("resolveImageUrl", () => {
  it("retourne null pour image vide ou null", () => {
    expect(resolveImageUrl(null, "/recipe-site/")).toBeNull();
    expect(resolveImageUrl("", "/recipe-site/")).toBeNull();
    expect(resolveImageUrl(undefined, "/recipe-site/")).toBeNull();
  });

  it("renvoie une URL https absolue telle quelle (raw.githubusercontent.com)", () => {
    const url = "https://raw.githubusercontent.com/HellNSab/recipe-site/main/images/123-photo.jpg";
    expect(resolveImageUrl(url, "/recipe-site/")).toBe(url);
  });

  it("renvoie une URL CDN (jsdelivr) absolue telle quelle pour rétro-compat", () => {
    const url = "https://cdn.jsdelivr.net/gh/HellNSab/recipe-site@main/images/123-photo.jpg";
    expect(resolveImageUrl(url, "/recipe-site/")).toBe(url);
  });

  it("résout un nom de fichier nu en chemin local sous baseUrl/images/", () => {
    expect(resolveImageUrl("kabsa.jpg", "/recipe-site/")).toBe("/recipe-site/images/kabsa.jpg");
  });

  it("encode les caractères spéciaux dans un nom de fichier nu", () => {
    expect(resolveImageUrl("photo de famille.jpg", "/recipe-site/")).toBe(
      "/recipe-site/images/photo%20de%20famille.jpg"
    );
  });
});

describe("uploadImage", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lance une erreur si le token est absent", async () => {
    await expect(uploadImage("photo.jpg", "data:image/jpeg;base64,abc", null)).rejects.toThrow(
      /token/i
    );
  });

  it("retourne le download_url renvoyé par l'API GitHub (raw.githubusercontent.com)", async () => {
    const expectedUrl =
      "https://raw.githubusercontent.com/HellNSab/recipe-site/main/images/1234-photo.jpg";
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { download_url: expectedUrl } }),
    });

    const result = await uploadImage("photo.jpg", "data:image/jpeg;base64,abc", "fake-token");
    expect(result).toBe(expectedUrl);
  });

  it("envoie un PUT avec le base64 nettoyé du préfixe data URL", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: { download_url: "https://raw.githubusercontent.com/x/y/main/images/p.jpg" },
      }),
    });

    await uploadImage("photo.jpg", "data:image/jpeg;base64,SGVsbG8=", "fake-token");

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/contents\/images\/\d+-photo\.jpg$/);
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer fake-token");
    const body = JSON.parse(options.body);
    expect(body.content).toBe("SGVsbG8=");
    expect(body.branch).toBe("main");
  });

  it("propage l'erreur si l'API GitHub renvoie un statut d'échec", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: "Validation failed" }),
    });

    await expect(uploadImage("photo.jpg", "data:image/jpeg;base64,abc", "fake-token")).rejects.toThrow(
      /422.*Validation failed/
    );
  });

  it("préfixe le nom de fichier avec un timestamp pour éviter les collisions", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: { download_url: "https://raw.githubusercontent.com/x/y/main/images/p.jpg" },
      }),
    });

    const before = Date.now();
    await uploadImage("photo.jpg", "data:image/jpeg;base64,abc", "fake-token");
    const after = Date.now();

    const [url] = globalThis.fetch.mock.calls[0];
    const match = url.match(/\/images\/(\d+)-photo\.jpg$/);
    expect(match).not.toBeNull();
    const timestamp = parseInt(match[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
