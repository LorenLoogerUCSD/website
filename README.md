# Looger Lab website

Plain static HTML/CSS site, published with GitHub Pages at
https://lorenloogerucsd.github.io/website/

## Structure

- `index.html`, `research.html`, `people.html`, `publications.html`, `contact.html`: the pages
- `assets/css/style.css`: shared styles
- `assets/img/`: images (put member photos in `assets/img/people/`)

The header and footer are repeated in each page, so if you add a page or rename one, update the navigation in every file.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Feedback

Lab members: please leave comments as [GitHub Issues](https://github.com/LorenLoogerUCSD/website/issues).

## Before launch

- Remove the `<meta name="robots" content="noindex, nofollow">` line from each page
- Remove the draft banner (`<div class="draft-banner">`) from each page
