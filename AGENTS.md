# Repository Guidelines

## Project Structure & Module Organization
This repository is a static presentation site for the 2026 parent meeting materials. The root contains the runtime entry points: `index.html`, `styles.css`, `script.js`, and `page-data.js`. Generated page images live in `assets/pages/`, shared branding images live in `assets/images/`, and the source PDF stays in the repository root. Use `scripts/generate_site_assets.py` to rebuild `page-data.js` and page screenshots when the PDF changes.

## Build, Test, and Development Commands
Install the only script dependencies with `pip install pymupdf pillow`. Regenerate site data and page assets with `python scripts/generate_site_assets.py`. Serve the site locally with `python -m http.server 8000`, then open `http://localhost:8000/`. There is no bundler, package manager, or separate build step.

## Coding Style & Naming Conventions
Match the current file split: content/data in `page-data.js`, behavior in `script.js`, and presentation in `styles.css`. Use 2-space indentation in HTML, CSS, and JavaScript; use 4 spaces in Python. Prefer descriptive kebab-case identifiers such as `teacher-protection`, `page-card`, and `school-logo.png`. Save text files as UTF-8 because the project includes Korean copy and filenames. No formatter or linter is configured, so keep edits consistent with surrounding code.

## Testing Guidelines
There is no automated test suite yet. Validate changes by running the local server and checking the full page flow: hero section, chapter navigation, scroll progress, lightbox behavior, and external links. After running the generator, spot-check both `page-data.js` and the affected files under `assets/pages/`. If automated tests are added later, place them under `tests/` and use `test_*.py` naming.

## Commit & Pull Request Guidelines
The current history uses short, imperative commit subjects with a colon, for example `Initial commit: ...`. Continue with the same pattern: `<verb>: <summary>`. Pull requests should include a concise description, list any regenerated assets, mention PDF source updates, and attach screenshots for visual changes so reviewers can compare the rendered page quickly.
