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
  resolveImageUrl: (image, baseUrl) => {
    if (!image) return null;
    if (image.startsWith("http://") || image.startsWith("https://")) return image;
    return `${baseUrl}images/${encodeURIComponent(image)}`;
  },
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

  it("affiche l'image avec l'URL CDN directement lors du chargement d'une recette existante", async () => {
    const { fetchRecipe } = await import("../lib/github");
    const cdnUrl = "https://cdn.jsdelivr.net/gh/HellNSab/recipe-site@main/images/1234567890-arancinis.jpg";
    fetchRecipe.mockResolvedValue({
      title: "Arancinis",
      image: cdnUrl,
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
    expect(img.getAttribute("src")).toBe(cdnUrl);
  });

  it("résout un nom de fichier nu (recette ancienne) en chemin local pour l'aperçu", async () => {
    const { fetchRecipe } = await import("../lib/github");
    fetchRecipe.mockResolvedValue({
      title: "Vieille recette",
      image: "kabsa.jpg",
      tags: [],
      ingredients: [],
      instructions: "",
      slug: "vieille-recette",
    });

    render(
      <MemoryRouter initialEntries={["/admin?edit=vieille-recette"]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>
    );

    const img = await waitFor(() => screen.getByAltText("Recipe preview"));
    expect(img.getAttribute("src")).toMatch(/images\/kabsa\.jpg$/);
  });
});

describe("Admin — flux d'upload lors du submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upload le fichier sélectionné puis enregistre la recette avec l'URL retournée", async () => {
    const { uploadImage, fileToBase64, writeRecipe, generateSlug } = await import("../lib/github");
    const uploadedUrl =
      "https://raw.githubusercontent.com/HellNSab/recipe-site/main/images/9999-tarte.jpg";

    fileToBase64.mockResolvedValue("data:image/jpeg;base64,SGVsbG8=");
    uploadImage.mockResolvedValue(uploadedUrl);
    writeRecipe.mockResolvedValue({});
    generateSlug.mockReturnValue("tarte-pommes");

    renderAdmin();

    fireEvent.change(screen.getByPlaceholderText(/Tarte aux pommes/), {
      target: { value: "Tarte aux pommes" },
    });
    fireEvent.change(screen.getByPlaceholderText(/2 tasses de farine/), {
      target: { value: "200g farine\n3 pommes" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Supporte le Markdown/), {
      target: { value: "Mélanger puis cuire." },
    });

    const file = new File(["fake-bytes"], "tarte.jpg", { type: "image/jpeg" });
    const fileInput = document.getElementById("image-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(fileToBase64).toHaveBeenCalledWith(file));

    fireEvent.submit(screen.getByRole("button", { name: /Enregistrer/i }).closest("form"));

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledWith(
        "tarte.jpg",
        "data:image/jpeg;base64,SGVsbG8=",
        "fake-token"
      );
    });

    await waitFor(() => {
      expect(writeRecipe).toHaveBeenCalled();
    });
    const [, recipeData] = writeRecipe.mock.calls[0];
    expect(recipeData.image).toBe(uploadedUrl);
    expect(recipeData.title).toBe("Tarte aux pommes");
  });

  it("conserve l'URL existante si aucun nouveau fichier n'est sélectionné lors d'une édition", async () => {
    const { fetchRecipe, uploadImage, writeRecipe } = await import("../lib/github");
    const existingUrl =
      "https://raw.githubusercontent.com/HellNSab/recipe-site/main/images/1-old.jpg";

    fetchRecipe.mockResolvedValue({
      title: "Recette existante",
      image: existingUrl,
      tags: [],
      ingredients: ["sel"],
      instructions: "Cuire.",
      slug: "recette-existante",
      _sha: "abc123",
    });
    writeRecipe.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/admin?edit=recette-existante"]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByAltText("Recipe preview"));

    fireEvent.submit(screen.getByRole("button", { name: /Mettre à jour/i }).closest("form"));

    await waitFor(() => expect(writeRecipe).toHaveBeenCalled());

    expect(uploadImage).not.toHaveBeenCalled();
    const [, recipeData] = writeRecipe.mock.calls[0];
    expect(recipeData.image).toBe(existingUrl);
  });

  it("affiche une erreur et continue sans image si l'upload échoue", async () => {
    const { uploadImage, fileToBase64, writeRecipe, generateSlug } = await import("../lib/github");

    fileToBase64.mockResolvedValue("data:image/jpeg;base64,SGVsbG8=");
    uploadImage.mockRejectedValue(new Error("Upload failed: 422"));
    writeRecipe.mockResolvedValue({});
    generateSlug.mockReturnValue("nouvelle");

    renderAdmin();

    fireEvent.change(screen.getByPlaceholderText(/Tarte aux pommes/), {
      target: { value: "Nouvelle" },
    });
    fireEvent.change(screen.getByPlaceholderText(/2 tasses de farine/), {
      target: { value: "ingrédient" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Supporte le Markdown/), {
      target: { value: "Étape." },
    });

    const file = new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.getElementById("image-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(fileToBase64).toHaveBeenCalledWith(file));

    fireEvent.submit(screen.getByRole("button", { name: /Enregistrer/i }).closest("form"));

    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Échec de l'envoi de la photo/i)).toBeInTheDocument());
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
