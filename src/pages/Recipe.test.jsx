import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Recipe from "./Recipe";

// Mock github module
vi.mock("../lib/github", () => ({
  fetchRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

// Mock auth module
vi.mock("../lib/auth", () => ({
  isAuthenticated: vi.fn(() => false),
  logout: vi.fn(),
  getToken: vi.fn(() => null),
}));

import { fetchRecipe } from "../lib/github";

function renderRecipe(slug = "test-recipe") {
  return render(
    <MemoryRouter initialEntries={[`/?recipe=${slug}`]}>
      <Routes>
        <Route path="/" element={<Recipe slug={slug} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Recipe page — rendu Markdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rend le texte gras (**bold**) en <strong>", async () => {
    fetchRecipe.mockResolvedValue({
      slug: "test",
      title: "Tarte test",
      image: "",
      tags: [],
      ingredients: ["200g farine"],
      instructions: "Mélangez **doucement** la farine.",
    });

    renderRecipe();

    await waitFor(() => {
      expect(screen.getByText("Tarte test")).toBeInTheDocument();
    });

    const strong = document.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe("doucement");
  });

  it("rend l'italique (*italic*) en <em>", async () => {
    fetchRecipe.mockResolvedValue({
      slug: "test",
      title: "Tarte test",
      image: "",
      tags: [],
      ingredients: [],
      instructions: "Cuire *lentement* à feu doux.",
    });

    renderRecipe();

    await waitFor(() => {
      expect(screen.getByText("Tarte test")).toBeInTheDocument();
    });

    const em = document.querySelector("em");
    expect(em).not.toBeNull();
    expect(em.textContent).toBe("lentement");
  });

  it("rend une liste à puces (- item) en <ul><li>", async () => {
    fetchRecipe.mockResolvedValue({
      slug: "test",
      title: "Tarte test",
      image: "",
      tags: [],
      ingredients: [],
      instructions: "- Étape 1\n- Étape 2\n- Étape 3",
    });

    renderRecipe();

    await waitFor(() => {
      expect(screen.getByText("Tarte test")).toBeInTheDocument();
    });

    expect(document.querySelector("ul")).not.toBeNull();
    expect(document.querySelectorAll("li")).toHaveLength(3);
  });

  it("affiche une erreur si la recette n'est pas trouvée", async () => {
    fetchRecipe.mockResolvedValue(null);

    renderRecipe("inexistante");

    await waitFor(() => {
      expect(screen.getByText("Recette introuvable")).toBeInTheDocument();
    });
  });

  it("affiche le titre et les tags", async () => {
    fetchRecipe.mockResolvedValue({
      slug: "test",
      title: "Quiche lorraine",
      image: "",
      tags: ["salé", "fromage"],
      ingredients: ["3 œufs"],
      instructions: "Mélangez.",
    });

    renderRecipe();

    await waitFor(() => {
      expect(screen.getByText("Quiche lorraine")).toBeInTheDocument();
      expect(screen.getByText("salé")).toBeInTheDocument();
      expect(screen.getByText("fromage")).toBeInTheDocument();
    });
  });
});
