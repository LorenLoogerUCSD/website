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

**Publications** (`data/publications.json`, and `publications` inside each
person in `data/people.json`): every reference uses the same fields and is shown
in the same style everywhere:

```json
{
  "authors": ["Morris J*", "Na YJ*", "Zhu H", "Kim J†", "Eberwine J†"],
  "title": "Paper title",
  "journal": "Cell Rep",
  "volume": "21", "issue": "10", "pages": "2706-2713",
  "year": 2017,
  "doi": "10.1016/j.celrep.2017.11.031",
  "pmid": "29212019",
  "pmcid": "PMC5771502"
}
```

- Authors are written PubMed-style (`Surname Initials`) with the full list.
- Equal contribution is marked by position: a trailing `*` for co-first (or
  other equally contributing) authors, and `†` for co-senior authors (a group
  that includes the last author). A rare second non-senior group gets `‡`.
  Footnotes are added automatically: "\* These authors contributed equally." and
  "† These authors jointly supervised this work." To change the wording for one
  paper, add `"notes": { "*": "Co-first authors." }`.
- On a profile page, that member's name is shown in bold. On the Publications
  page, all current lab members are bold. The name to match is
  `Surname FirstInitial`, e.g. `Varma A`. If someone publishes under a different
  name, add `"pubName": "Smith-Jones AB"` to their entry in `people.json`.
- `doi`, `pmid` and `pmcid` become "doi:…", "PubMed" and "Free full text" links.
  Optional `links` adds more, e.g. `[{ "label": "Preprint", "url": "…" }]`.
- Lists of more than 20 authors are shortened, with a "show all" button.
  The bold member and anyone with `*`/`†` stay visible.
- On the Publications page, papers are sorted and grouped by year automatically,
  and there is a filter box.

**Refreshing the full publication list from PubMed:**

```bash
python3 scripts/update_publications.py
```

This rebuilds `data/publications.json` from every PubMed record for
`Looger L[au]`, including full author lists and equal-contribution marks read
from PubMed Central full texts. Errata and preprints that have since been
published are left out. Your manual edits survive a refresh: `links`, `notes`
and `hidden` are kept, and an entry with `"locked": true` is not touched at all.
Hand-added entries without a PMID are kept too. To hide a paper, add
`"hidden": true` to it.

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

## Cache-busting (one-time setup per computer)

Pages link to `site.js?v=…` and `style.css?v=…`. A git hook updates the `v=` tag
automatically whenever one of those files is committed, so browsers load the
new version at once instead of a cached copy. After cloning, enable it once:

```bash
git config core.hooksPath .githooks
```

The data files in `data/` are always fetched fresh and don't need this.

## Feedback

Lab members: please leave comments as [GitHub Issues](https://github.com/LorenLoogerUCSD/website/issues).

## Before launch

- Remove the `<meta name="robots" content="noindex, nofollow">` line from each page
- Set `draftBanner: false` in `assets/js/site.js`
