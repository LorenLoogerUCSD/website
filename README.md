# Looger Lab website

Static HTML/CSS/JS site, published with GitHub Pages at
https://lorenloogerucsd.github.io/website/

## Structure

| Path | What it is |
|---|---|
| `index.html`, `research.html`, `people.html`, `publications.html`, `contact.html` | The pages |
| `assets/js/site.js` | Shared header, navigation and footer; renders the data files into pages |
| `assets/css/style.css` | Shared styles |
| `data/*.json` | Content for People, Publications, Research and the home-page gallery |
| `assets/img/` | Images (suggested: `people/`, `gallery/`, `research/`) |

## Editing content

Most updates only need a data file. JSON is strict: use double quotes, put commas
between items, and no comma after the last item. If a section shows
"Could not load this section", the JSON file usually has a typo.

**People** (`data/people.json`): members are grouped (PI, Staff, Postdocs, PhD
Students, Alumni). The People page shows a compact card (photo, name, role) for
each current member; clicking it opens their profile at `person.html?id=<id>`.
Each current member has `id` (lowercase-with-dashes, must be unique), `name`,
`role`, `photo`, `bio` (a list of paragraphs), and optionally `email`, `links`
(a list of `{ "label": ..., "url": ... }`) and `publications`
(a list of `{ "text": ..., "url": ... }`).
The Alumni group (`"alumni": true`) is a simple list: `name`, `role`, and
optionally `years` and `now` (current position). Empty groups are hidden.
To move someone to alumni, delete their entry from their group and add a short
one to Alumni.
Photos: put them in `assets/img/people/`, ideally about 800 px on the long side.
Faces should be near the centre/top, since photos are cropped to a circle.

**Publications** (`data/publications.json`): a list of papers with `title`,
`authors`, `journal`, `year`, and optionally `doi` (the title then links to the
paper), `url`, and `links` (PDF, preprint, code...). They are sorted and grouped
by year automatically, and the page has a filter box.

**Research** (`data/research.json`): `intro` text, a list of `areas`
(`title`, `description`, optional `image`), and optional `resources`.

**Gallery** (`data/gallery.json`): a list of images with `src`, `caption` and
`alt` (a short description for screen readers). Optional `thumb` is a smaller
version shown in the grid. Keep images under about 500 KB each (about 1600 px wide).

**Navigation, footer, draft banner**: edit the `SITE` settings at the top of
`assets/js/site.js`.

The home-page hero and news, and the Contact page, are plain HTML in their pages.

## Preview locally

The pages load their data with JavaScript, which browsers block when you open
the HTML file directly. Run a small local server instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Feedback

Lab members: please leave comments as [GitHub Issues](https://github.com/LorenLoogerUCSD/website/issues).

## Before launch

- Remove the `<meta name="robots" content="noindex, nofollow">` line from each page
- Set `draftBanner: false` in `assets/js/site.js`
