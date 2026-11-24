# StatML Lab

Interactive visual explainers for statistics and machine learning. Plain HTML, CSS and JavaScript with no build step.

## Run locally

Open `index.html` in a browser, or serve the folder: `python3 -m http.server` then visit http://localhost:8000.

## Publish on GitHub Pages

Push this folder to a repository, then in Settings > Pages choose "Deploy from a branch", branch `main`, folder `/ (root)`.

## Add an explainer

1. Copy one of the files in `js/explainers/` (for example `r-squared.js`) and change the `id`, `group`, `title`, `blurb`, `lede` and `glyph`.
2. In `mount(root)`, build the page with `Lab.page(this, { figure, panel, notes })`, draw with `Lab.Plot`, and return the cleanup function from `Lab.watch(...)`.
3. Add a `<script>` tag for it at the bottom of `index.html`.
4. Add any new terms to `js/glossary.js` with the explainer's `id` so the glossary links to it.

Groups on the home page are listed in `js/app.js`.
