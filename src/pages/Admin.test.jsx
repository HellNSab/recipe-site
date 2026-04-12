import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Admin from "./Admin";

// Mock github module
vi.mock("../lib/github", () => ({
  fetchRecipe: vi.fn(),
  writeRecipe: vi.fn(),
  uploadImage: vi.fn(),
  fileToBase64: vi.fn(),
  generateSlug: vi.fn((title) => title.toLowerCase().replace(/\s+/g, "-")),
  deleteRecipe: vi.fn(),
}));

// Mock auth — authenticated by default
vi.mock("../lib/auth", () => ({
  isAuthenticated: vi.fn(() => true),
  logout: vi.fn(),
  getToken: vi.fn(() => "fake-token"),
}));

function renderAdmin(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin — aperçu image en mode édition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche l'image avec l'URL correcte (BASE_URL + images/) lors du chargement d'une recette existante", async () => {
    const { fetchRecipe } = await import("../lib/github");
    fetchRecipe.mockResolvedValue({
      title: "Arancinis",
      image: "arancinis.jpg",
      tags: [],
      ingredients: [],
      instructions: "",
      slug: "arancinis",
    });

    render(
      <MemoryRouter initialEntries={["/admin?edit=arancinis"]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>
    );

    const img = await waitFor(() => screen.getByAltText("Recipe preview"));
    expect(img.getAttribute("src")).toBe("/images/arancinis.jpg");
  });
});

describe("Admin — barre d'outils Markdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche la barre d'outils par défaut", () => {
    renderAdmin();
    expect(screen.getByTitle("Gras")).toBeInTheDocument();
    expect(screen.getByTitle("Italique")).toBeInTheDocument();
    expect(screen.getByTitle("Liste à puces")).toBeInTheDocument();
    expect(screen.getByTitle("Titre")).toBeInTheDocument();
  });

  it("affiche le bouton Aperçu", () => {
    renderAdmin();
    expect(screen.getByText(/Aperçu/)).toBeInTheDocument();
  });

  it("bascule vers l'aperçu au clic sur Aperçu", () => {
    renderAdmin();
    const previewBtn = screen.getByText(/Aperçu/);
    fireEvent.click(previewBtn);

    // textarea doit disparaître
    expect(screen.queryByRole("textbox", { name: /préparation/i })).toBeNull();
    // bouton doit afficher "Éditer"
    expect(screen.getByText(/Éditer/)).toBeInTheDocument();
  });

  it("revient en édition au clic sur Éditer", () => {
    renderAdmin();

    // Aller en aperçu
    fireEvent.click(screen.getByText(/Aperçu/));
    // Revenir en édition
    fireEvent.click(screen.getByText(/Éditer/));

    // La barre d'outils doit réapparaître
    expect(screen.getByTitle("Gras")).toBeInTheDocument();
  });

  it("affiche le message vide dans l'aperçu si le champ est vide", () => {
    renderAdmin();
    fireEvent.click(screen.getByText(/Aperçu/));
    expect(screen.getByText("Rien à afficher…")).toBeInTheDocument();
  });

  it("insère ** autour du texte via le bouton Gras", () => {
    renderAdmin();

    const textarea = screen.getByPlaceholderText(/Supporte le Markdown/);
    // Saisir du texte
    fireEvent.change(textarea, { target: { value: "Mélangez doucement la farine." } });

    // Simuler une sélection (selectionStart/End)
    Object.defineProperty(textarea, "selectionStart", { value: 9, writable: true });
    Object.defineProperty(textarea, "selectionEnd", { value: 18, writable: true });

    fireEvent.click(screen.getByTitle("Gras"));

    // Le champ doit contenir les ** autour de la sélection
    expect(textarea.value).toContain("**");
  });

  it("insère * autour du texte via le bouton Italique", () => {
    renderAdmin();

    const textarea = screen.getByPlaceholderText(/Supporte le Markdown/);
    fireEvent.change(textarea, { target: { value: "Cuire lentement." } });

    Object.defineProperty(textarea, "selectionStart", { value: 6, writable: true });
    Object.defineProperty(textarea, "selectionEnd", { value: 15, writable: true });

    fireEvent.click(screen.getByTitle("Italique"));

    expect(textarea.value).toContain("*");
  });

  it("rend le Markdown correctement dans l'aperçu", () => {
    renderAdmin();

    const textarea = screen.getByPlaceholderText(/Supporte le Markdown/);
    fireEvent.change(textarea, { target: { value: "Cuire **doucement** à feu doux." } });

    fireEvent.click(screen.getByText(/Aperçu/));

    // ReactMarkdown doit avoir rendu <strong>
    const strong = document.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe("doucement");
  });

  it("rend une liste à puces dans l'aperçu", () => {
    renderAdmin();

    const textarea = screen.getByPlaceholderText(/Supporte le Markdown/);
    fireEvent.change(textarea, { target: { value: "- Étape 1\n- Étape 2" } });

    fireEvent.click(screen.getByText(/Aperçu/));

    expect(document.querySelector("ul")).not.toBeNull();
    expect(document.querySelectorAll("li")).toHaveLength(2);
  });
});
