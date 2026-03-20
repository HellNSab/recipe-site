# 🍳 Mom's Recipe Book

A beautiful, family-friendly recipe website that uses GitHub as its backend. No database, no server — just a static React app that stores recipes as JSON files in your GitHub repository.

## ✨ Features

- **Browse Recipes** — Beautiful grid layout with images and tags
- **Search** — Fuzzy search by recipe name, ingredients, or tags (powered by Fuse.js)
- **Filter by Tags** — Click tags to filter recipes by category
- **Recipe Details** — Full recipe view with adjustable servings, ingredient lists, and step-by-step instructions
- **Print-Friendly** — Clean print styles for taking recipes to the kitchen
- **Admin Panel** — Password-protected recipe editor for family members
- **Image Uploads** — Drag-and-drop image uploads stored in your repo
- **Mobile Responsive** — Looks great on phones, tablets, and desktops
- **Auto-Deploy** — GitHub Actions deploys on every push

## 🛠 Tech Stack

- **React + Vite** — Fast development and optimized builds
- **React Router** — Client-side routing
- **Tailwind CSS** — Utility-first styling
- **Fuse.js** — Lightweight client-side fuzzy search
- **GitHub Contents API** — Read/write recipes directly to your repo
- **GitHub Pages** — Free static hosting

## 🚀 Getting Started

### 1. Fork or Clone This Repository

```bash
git clone https://github.com/YOUR_USERNAME/recipe-site.git
cd recipe-site
npm install
```

### 2. Configure Your Repository

Edit `src/lib/github.js` and update these values:

```javascript
const REPO_OWNER = "YOUR_GITHUB_USERNAME"; // Your GitHub username
const REPO_NAME = "recipe-site"; // Your repository name
```

### 3. Create Recipe Storage Folders

Create two folders in your repository root:

```
recipe-site/
├── recipes/      # JSON recipe files will be stored here
├── images/       # Uploaded images will be stored here
└── ...
```

### 4. Create a GitHub Personal Access Token

To add and edit recipes, you'll need a Personal Access Token:

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens/new?scopes=repo&description=Recipe%20Site)
2. Select the `repo` scope
3. Generate the token
4. Share this token with family members who should be able to add recipes

**⚠️ Keep this token secret!** Anyone with the token can modify your repository.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173/recipe-site](http://localhost:5173/recipe-site) in your browser.

### 6. Deploy to GitHub Pages

1. Go to your repository **Settings → Pages**
2. Under "Build and deployment", select **GitHub Actions**
3. Push to the `main` branch — GitHub Actions will build and deploy automatically

Your site will be available at: `https://YOUR_USERNAME.github.io/recipe-site/`

## 📝 Adding Recipes

1. Go to `/admin` on your site
2. Enter your GitHub Personal Access Token
3. Fill out the recipe form:
   - **Title** — Recipe name
   - **Description** — Brief description
   - **Image** — Drag & drop or click to upload
   - **Tags** — Comma-separated (e.g., "dessert, holiday, easy")
   - **Prep/Cook Time** — In minutes
   - **Servings** — Number of servings
   - **Ingredients** — One per line (e.g., "2 cups flour")
   - **Instructions** — Separate steps with blank lines
   - **Notes** — Optional tips or variations
4. Click **Save Recipe**

The recipe will be saved as a JSON file in your `recipes/` folder.

## 📁 Recipe JSON Format

Recipes are stored as JSON files in the `recipes/` folder:

```json
{
  "slug": "grandmas-apple-pie",
  "title": "Grandma's Apple Pie",
  "description": "A classic family recipe passed down through generations",
  "image": "https://cdn.jsdelivr.net/gh/USER/REPO@main/images/apple-pie.jpg",
  "tags": ["dessert", "holiday", "family favorite"],
  "prepTime": "30",
  "cookTime": "45",
  "servings": "8",
  "ingredients": [
    "2 cups all-purpose flour",
    "1 tsp salt",
    "2/3 cup cold butter",
    "6 cups sliced apples",
    "3/4 cup sugar",
    "1 tsp cinnamon"
  ],
  "instructions": [
    "Preheat oven to 375°F (190°C).",
    "Mix flour and salt in a large bowl. Cut in cold butter until mixture resembles coarse crumbs.",
    "Press half the mixture into a 9-inch pie pan.",
    "Combine apples, sugar, and cinnamon. Pour into crust.",
    "Top with remaining crumb mixture.",
    "Bake for 45 minutes until golden brown."
  ],
  "notes": "Best served warm with vanilla ice cream!",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

## 🎨 Customization

### Colors

The color scheme uses sage green and terracotta. Edit `tailwind.config.js` to customize:

```javascript
colors: {
  cream: '#FFF8F0',
  sage: { /* green shades */ },
  terracotta: { /* orange shades */ },
}
```

### Site Title

Update the site name in:
- `index.html` — Page title
- `src/pages/Home.jsx` — Header text

### Base Path

If deploying to a different path, update:
- `vite.config.js` — `base` option
- `src/main.jsx` — `basename` prop on `BrowserRouter`

## 🔒 Security Notes

- **GitHub Token** — The token is stored in the user's browser localStorage. It's never sent to any server other than GitHub's API.
- **Family Only** — Anyone with the token can add/edit/delete recipes. Only share it with trusted family members.
- **Public Recipes** — The recipes themselves are public (visible on GitHub and the website). Don't store sensitive information.

## 📱 Browser Support

- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome for Android)

## 🐛 Troubleshooting

### "Failed to fetch recipes"
- Check that `REPO_OWNER` and `REPO_NAME` are correct in `src/lib/github.js`
- Ensure the `recipes/` folder exists in your repository

### "Failed to save recipe"
- Verify your GitHub token has the `repo` scope
- Check that the token hasn't expired
- Ensure the `recipes/` and `images/` folders exist

### Images not loading
- Images are served via jsDelivr CDN which may have a short cache delay
- Check the image URL in the recipe JSON file

## 📄 License

MIT License — feel free to use this for your own family recipe site!

---

Made with ❤️ for families who love to cook together