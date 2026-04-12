import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaceholderImage from "./PlaceholderImage";
import RecipeCard from "./RecipeCard";

describe("PlaceholderImage", () => {
  it("rend un élément svg", () => {
    const { container } = render(<PlaceholderImage />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("transmet la className au svg", () => {
    const { container } = render(<PlaceholderImage className="w-full h-full" />);
    expect(container.querySelector("svg").classList.contains("w-full")).toBe(true);
  });
});

describe("RecipeCard — sans image", () => {
  const recipe = {
    slug: "sans-photo",
    title: "Recette sans photo",
    description: "Une bonne recette",
    image: "",
    tags: [],
  };

  it("affiche le placeholder SVG à la place d'une image quand image est vide", () => {
    const { container } = render(
      <MemoryRouter>
        <RecipeCard recipe={recipe} />
      </MemoryRouter>
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("n'utilise pas une URL Unsplash comme fallback", () => {
    const { container } = render(
      <MemoryRouter>
        <RecipeCard recipe={recipe} />
      </MemoryRouter>
    );
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      expect(img.src).not.toContain("unsplash");
    });
  });
});
