/*
 * Looger Lab website — shared script.
 *
 * - Inserts the shared header (with navigation) and footer on every page.
 * - Renders page content from the JSON files in data/.
 *
 * Each page marks where content goes with an element id, e.g.
 * <div id="people"></div>, and this script fills it in.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Site-wide settings: edit these to change the header/footer everywhere.
  // ---------------------------------------------------------------------------

  var SITE = {
    name: "Looger",
    nameAccent: "Lab",
    footer: "© " + new Date().getFullYear() + " Looger Lab · UC San Diego",
    // Set to false (or delete the banner text) when the site launches.
    draftBanner: true,
    feedbackUrl: "https://github.com/LorenLoogerUCSD/website/issues",
    nav: [
      { href: "index.html", label: "Home" },
      { href: "research.html", label: "Research" },
      { href: "people.html", label: "People" },
      { href: "publications.html", label: "Publications" },
      { href: "contact.html", label: "Contact" }
    ]
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  // Create an element: el("div", {class: "card"}, [child, "text", ...])
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "text") node.textContent = value;
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === "") return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function loadJSON(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + ": HTTP " + res.status);
      return res.json();
    });
  }

  function showError(target, err) {
    console.error(err);
    target.textContent = "";
    target.appendChild(el("p", { class: "placeholder", text: "Could not load this section. (" + err.message + ")" }));
  }

  // Pages that should highlight another page's menu item.
  var NAV_PARENT = { "person.html": "people.html" };

  function currentPage() {
    var file = window.location.pathname.split("/").pop();
    if (file === "") file = "index.html";
    return NAV_PARENT[file] || file;
  }

  // Bio text may be one string or a list of paragraphs.
  function paragraphs(text) {
    if (!text) return [];
    return Array.isArray(text) ? text : [text];
  }

  // ---------------------------------------------------------------------------
  // Header & footer
  // ---------------------------------------------------------------------------

  function renderHeader() {
    var page = currentPage();
    var items = SITE.nav.map(function (item) {
      return el("li", null, [
        el("a", { href: item.href, "aria-current": item.href === page ? "page" : null, text: item.label })
      ]);
    });

    var toggle = el("button", {
      class: "nav-toggle",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "site-nav-list",
      "aria-label": "Menu"
    }, [el("span", { class: "nav-toggle-bar" })]);

    var list = el("ul", { id: "site-nav-list" }, items);

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      list.classList.toggle("open", !open);
    });

    var header = el("header", { class: "site-header" }, [
      el("div", { class: "container" }, [
        el("a", { class: "brand", href: "index.html" }, [SITE.name + " ", el("span", { text: SITE.nameAccent })]),
        el("nav", { class: "site-nav", "aria-label": "Main" }, [toggle, list])
      ])
    ]);

    document.body.insertBefore(header, document.body.firstChild);

    if (SITE.draftBanner) {
      var banner = el("div", { class: "draft-banner" }, [
        "Draft site under development. Feedback welcome via ",
        el("a", { href: SITE.feedbackUrl, text: "GitHub Issues" }),
        "."
      ]);
      document.body.insertBefore(banner, header);
    }
  }

  function renderFooter() {
    document.body.appendChild(
      el("footer", { class: "site-footer" }, [el("div", { class: "container", text: SITE.footer })])
    );
  }

  // ---------------------------------------------------------------------------
  // People  (data/people.json)
  // ---------------------------------------------------------------------------

  function personPhoto(p, cls) {
    return p.photo
      ? el("img", { class: cls, src: p.photo, alt: p.name, loading: "lazy" })
      : el("div", { class: cls, role: "img", "aria-label": "No photo" });
  }

  // A role is text like "PhD Student · Neurosciences Graduate Program" (a list
  // also works). On cards each part goes on its own line; pass a separator
  // (e.g. " · ") to keep them on one line instead.
  function roleNode(tag, role, separator) {
    if (!role || (Array.isArray(role) && !role.length)) return null;
    var lines = Array.isArray(role) ? role : String(role).split(/\s+·\s+/);
    if (separator) return el(tag, { class: "role", text: lines.join(separator) });
    var children = [];
    lines.forEach(function (line, i) {
      if (i > 0) children.push(el("br"));
      children.push(line);
    });
    return el(tag, { class: "role" }, children);
  }

  // Compact card for the People page; links to the member's profile page.
  function personCard(p) {
    var inner = [
      personPhoto(p, "photo"),
      el("h3", { text: p.name }),
      roleNode("div", p.role)
    ];
    if (p.id) {
      return el("a", { class: "card person person-link", href: "person.html?id=" + encodeURIComponent(p.id) }, inner);
    }
    return el("div", { class: "card person" }, inner);
  }

  function alumniItem(p) {
    var details = [].concat(p.role || [], p.years || []).join(", ");
    return el("li", null, [
      el("strong", { text: p.name }),
      details ? " — " + details : null,
      p.now ? el("span", { class: "now", text: " · Now: " + p.now }) : null
    ]);
  }

  function joinWith(nodes, sep) {
    var out = [];
    nodes.forEach(function (n, i) {
      if (i > 0) out.push(sep);
      out.push(n);
    });
    return out;
  }

  function renderPeople(target) {
    loadJSON("data/people.json").then(function (data) {
      target.textContent = "";
      (data.groups || []).forEach(function (group) {
        if (!group.members || !group.members.length) return;
        target.appendChild(el("h2", { text: group.title }));
        if (group.alumni) {
          target.appendChild(el("ul", { class: "alumni-list" }, group.members.map(alumniItem)));
        } else {
          target.appendChild(el("div", { class: "grid people-grid" }, group.members.map(personCard)));
        }
      });
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Individual profile page  (person.html?id=...)
  // ---------------------------------------------------------------------------

  function renderPerson(target) {
    var id = new URLSearchParams(window.location.search).get("id");

    loadJSON("data/people.json").then(function (data) {
      var person = null;
      (data.groups || []).forEach(function (g) {
        (g.members || []).forEach(function (m) { if (m.id && m.id === id) person = m; });
      });

      target.textContent = "";
      var back = el("p", { class: "back" }, [el("a", { href: "people.html", text: "← All people" })]);

      if (!person) {
        target.appendChild(back);
        target.appendChild(el("h1", { text: "Person not found" }));
        target.appendChild(el("p", { text: "This profile doesn’t exist. It may have moved." }));
        return;
      }

      document.title = person.name + " · Looger Lab";

      var links = (person.links || []).map(function (l) { return el("a", { href: l.url, text: l.label }); });
      if (person.email) links.unshift(el("a", { href: "mailto:" + person.email, text: person.email }));

      var header = el("div", { class: "profile-header" }, [
        personPhoto(person, "profile-photo"),
        el("div", null, [
          el("h1", { text: person.name }),
          roleNode("p", person.role, " · "),
          links.length ? el("p", { class: "links" }, joinWith(links, " · ")) : null
        ])
      ]);

      var body = el("div", { class: "profile-body" });
      paragraphs(person.bio).forEach(function (t) { body.appendChild(el("p", { text: t })); });

      if (person.publications && person.publications.length) {
        var names = pubNames(person);
        body.appendChild(el("h2", { text: "Selected publications" }));
        body.appendChild(el("ul", { class: "pub-list" }, person.publications.map(function (pub) {
          return citation(pub, names);
        })));
      }

      target.appendChild(back);
      target.appendChild(header);
      target.appendChild(body);
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Publications  (data/publications.json)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Citations: one shared style for every reference on the site.
  //
  //   Authors (lab member in bold, * / † = equal contribution). Title.
  //   Journal Volume(Issue):Pages (Year).
  //   doi:10.xxxx/yyyy · PubMed · Free full text (PMC)
  //   * These authors contributed equally.
  //
  // In the data, authors are a list like ["Morris J*", "Na YJ*", "Looger LL"].
  // A trailing * marks co-first (equally contributing) authors and † marks
  // co-senior authors; see DEFAULT_NOTES for the footnote texts, which can be
  // changed per paper with "notes": { "*": "Co-first authors." }.
  // ---------------------------------------------------------------------------

  var MARKERS = ["*", "†", "‡"];
  // * co-first (or other equal) authors, † co-senior authors, ‡ a second non-senior group.
  var DEFAULT_NOTES = {
    "*": "These authors contributed equally.",
    "†": "These authors jointly supervised this work.",
    "‡": "These authors contributed equally."
  };
  var MAX_AUTHORS = 20;   // longer author lists are shortened, with a "show all" button

  // The name(s) to bold for a person, e.g. "Varma A". Can be set explicitly
  // with "pubName": "Varma AK" (or a list) in people.json.
  function pubNames(person) {
    if (person.pubName) return Array.isArray(person.pubName) ? person.pubName : [person.pubName];
    var parts = person.name.replace(/^(Dr\.?|Prof\.?)\s+/i, "").trim().split(/\s+/);
    return [parts[parts.length - 1] + " " + parts[0].charAt(0)];
  }

  function splitMarker(author) {
    var last = author.charAt(author.length - 1);
    return MARKERS.indexOf(last) !== -1
      ? { name: author.slice(0, -1).trim(), marker: last }
      : { name: author.trim(), marker: "" };
  }

  // "Rowe R" matches "Rowe RS" but not "Rowell R".
  function isHighlighted(name, names) {
    return (names || []).some(function (n) {
      return name === n || (name.indexOf(n) === 0 && /^[A-Z]/.test(name.charAt(n.length)));
    });
  }

  function authorList(authors) {
    if (Array.isArray(authors)) return authors;
    return String(authors || "").split(/\s*,\s*/).filter(Boolean);
  }

  function authorNodes(authors, names, showAll) {
    var list = authorList(authors).map(splitMarker);
    var keep = list.map(function (a, i) {
      return showAll || list.length <= MAX_AUTHORS || i < 10 || i === list.length - 1 ||
        a.marker || isHighlighted(a.name, names);
    });

    var nodes = [];
    var gap = false;
    list.forEach(function (a, i) {
      if (!keep[i]) { gap = true; return; }
      if (nodes.length) nodes.push(", ");
      if (gap) { nodes.push("…, "); gap = false; }
      var label = a.name + (a.marker ? a.marker : "");
      nodes.push(isHighlighted(a.name, names) ? el("strong", { text: label }) : label);
    });
    return { nodes: nodes, total: list.length, shortened: keep.indexOf(false) !== -1, list: list };
  }

  function citation(pub, names) {
    var authorsSpan = el("span", { class: "authors" });
    var info = authorNodes(pub.authors, names, false);
    info.nodes.forEach(function (n) { authorsSpan.appendChild(typeof n === "string" ? document.createTextNode(n) : n); });

    var toggle = null;
    if (info.shortened) {
      toggle = el("button", { type: "button", class: "show-authors", text: "show all " + info.total + " authors" });
      toggle.addEventListener("click", function () {
        authorsSpan.textContent = "";
        authorNodes(pub.authors, names, true).nodes.forEach(function (n) {
          authorsSpan.appendChild(typeof n === "string" ? document.createTextNode(n) : n);
        });
        toggle.remove();
      });
    }

    var source = [];
    if (pub.volume) source.push(" " + pub.volume + (pub.issue ? "(" + pub.issue + ")" : ""));
    if (pub.pages) source.push((pub.volume ? ":" : " ") + pub.pages);
    var ref = el("div", { class: "ref" }, [
      authorsSpan,
      toggle ? " " : null,
      toggle,
      ". ",
      el("span", { class: "pub-title", text: pub.title.replace(/\.$/, "") + "." }),
      " ",
      el("em", { text: pub.journal }),
      source.join(""),
      " (" + pub.year + ").",
      pub.preprint ? el("span", { class: "tag", text: "Preprint" }) : null,
      pub.review ? el("span", { class: "tag", text: "Review" }) : null
    ]);

    var links = [];
    if (pub.doi) links.push(el("a", { href: "https://doi.org/" + pub.doi, text: "doi:" + pub.doi }));
    else if (pub.url) links.push(el("a", { href: pub.url, text: "Link" }));
    if (pub.pmid) links.push(el("a", { href: "https://pubmed.ncbi.nlm.nih.gov/" + pub.pmid + "/", text: "PubMed" }));
    if (pub.pmcid) links.push(el("a", { href: "https://www.ncbi.nlm.nih.gov/pmc/articles/" + pub.pmcid + "/", text: "Free full text" }));
    (pub.links || []).forEach(function (l) { links.push(el("a", { href: l.url, text: l.label })); });

    var used = [];
    info.list.forEach(function (a) { if (a.marker && used.indexOf(a.marker) === -1) used.push(a.marker); });
    used.sort(function (x, y) { return MARKERS.indexOf(x) - MARKERS.indexOf(y); });
    var notes = used.map(function (m) {
      var text = (pub.notes && pub.notes[m]) || DEFAULT_NOTES[m];
      return el("div", { class: "footnote", text: m + " " + text });
    });

    return el("li", null, [
      ref,
      links.length ? el("div", { class: "links" }, joinWith(links, " · ")) : null
    ].concat(notes));
  }

  function renderPublications(target) {
    Promise.all([
      loadJSON("data/publications.json"),
      loadJSON("data/people.json").catch(function () { return { groups: [] }; })
    ]).then(function (results) {
      // Keep the file's order within a year (newest first); hide entries marked "hidden".
      var pubs = results[0]
        .map(function (p, i) { return { p: p, i: i }; })
        .filter(function (x) { return !x.p.hidden; })
        .sort(function (a, b) { return (b.p.year - a.p.year) || (a.i - b.i); })
        .map(function (x) { return x.p; });

      // Bold every current lab member on the main Publications page.
      var labNames = [];
      (results[1].groups || []).forEach(function (g) {
        if (g.alumni) return;
        (g.members || []).forEach(function (m) { labNames = labNames.concat(pubNames(m)); });
      });

      var search = el("input", {
        type: "search",
        class: "pub-search",
        placeholder: "Filter by title, author, journal or year…",
        "aria-label": "Filter publications"
      });
      var results = el("div");

      function draw() {
        var q = search.value.trim().toLowerCase();
        var shown = pubs.filter(function (p) {
          if (!q) return true;
          return [p.title, authorList(p.authors).join(" "), p.journal, String(p.year)].join(" ").toLowerCase().indexOf(q) !== -1;
        });

        results.textContent = "";
        results.appendChild(el("p", { class: "pub-count", text: q
          ? shown.length + " of " + pubs.length + " publications"
          : pubs.length + " publications" }));
        if (!shown.length) {
          results.appendChild(el("p", { class: "placeholder", text: "No publications match “" + search.value + "”." }));
          return;
        }

        var year = null;
        var list = null;
        shown.forEach(function (p) {
          if (p.year !== year) {
            year = p.year;
            results.appendChild(el("h2", { text: String(year) }));
            list = el("ul", { class: "pub-list" });
            results.appendChild(list);
          }
          list.appendChild(citation(p, labNames));
        });
      }

      search.addEventListener("input", draw);
      target.textContent = "";
      target.appendChild(search);
      target.appendChild(results);
      draw();
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Research  (data/research.json)
  // ---------------------------------------------------------------------------

  function renderResearch(target) {
    loadJSON("data/research.json").then(function (data) {
      target.textContent = "";

      paragraphs(data.intro).forEach(function (t) { target.appendChild(el("p", { class: "lead", text: t })); });

      if (data.image) {
        target.appendChild(el("figure", { class: "research-figure" }, [
          el("img", { src: data.image, alt: data.imageAlt || "" }),
          data.imageCaption ? el("figcaption", { text: data.imageCaption }) : null
        ]));
      }

      (data.areas || []).forEach(function (a) {
        var section = el("section", { class: "research-area" }, [el("h2", { text: a.title })]);
        if (a.image) section.appendChild(el("img", { class: "area-image", src: a.image, alt: a.imageAlt || a.title, loading: "lazy" }));
        paragraphs(a.description).forEach(function (t) { section.appendChild(el("p", { text: t })); });
        target.appendChild(section);
      });

      if (data.resources && data.resources.length) {
        target.appendChild(el("h2", { text: "Tools & resources" }));
        target.appendChild(el("ul", { class: "resource-list" }, data.resources.map(function (r) {
          return el("li", null, [
            r.url ? el("a", { href: r.url, text: r.title }) : el("strong", { text: r.title }),
            r.description ? " — " + r.description : null
          ]);
        })));
      }
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Gallery  (data/gallery.json) with a simple lightbox
  // ---------------------------------------------------------------------------

  function renderGallery(target) {
    loadJSON("data/gallery.json").then(function (images) {
      target.textContent = "";
      if (!images.length) return;

      var lightbox = buildLightbox(images);

      var tiles = images.map(function (img, i) {
        var inner = img.src
          ? el("img", { src: img.thumb || img.src, alt: img.alt || img.caption || "", loading: "lazy" })
          : el("div", { class: "gallery-empty", text: "Image " + (i + 1) });

        var button = el("button", {
          type: "button",
          class: "gallery-item",
          "aria-label": "Open image: " + (img.caption || img.alt || "image " + (i + 1))
        }, [inner, img.caption ? el("span", { class: "gallery-caption", text: img.caption }) : null]);

        button.addEventListener("click", function () { lightbox.open(i); });
        return button;
      });

      target.appendChild(el("div", { class: "gallery" }, tiles));
    }).catch(function (err) { showError(target, err); });
  }

  function buildLightbox(images) {
    var index = 0;
    var lastFocus = null;

    var imgEl = el("img", { class: "lightbox-image", alt: "" });
    var emptyEl = el("div", { class: "lightbox-empty" });
    var caption = el("p", { class: "lightbox-caption" });
    var closeBtn = el("button", { type: "button", class: "lightbox-close", "aria-label": "Close" }, ["×"]);
    var prevBtn = el("button", { type: "button", class: "lightbox-prev", "aria-label": "Previous image" }, ["‹"]);
    var nextBtn = el("button", { type: "button", class: "lightbox-next", "aria-label": "Next image" }, ["›"]);

    var box = el("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer", hidden: "" }, [
      closeBtn, prevBtn,
      el("figure", null, [imgEl, emptyEl, caption]),
      nextBtn
    ]);
    document.body.appendChild(box);

    function show(i) {
      index = (i + images.length) % images.length;
      var img = images[index];
      if (img.src) {
        imgEl.src = img.src;
        imgEl.alt = img.alt || img.caption || "";
        imgEl.hidden = false;
        emptyEl.hidden = true;
      } else {
        imgEl.removeAttribute("src");
        imgEl.hidden = true;
        emptyEl.hidden = false;
        emptyEl.textContent = "Image " + (index + 1);
      }
      caption.textContent = img.caption || "";
      var multi = images.length > 1;
      prevBtn.hidden = !multi;
      nextBtn.hidden = !multi;
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.classList.add("no-scroll");
      closeBtn.focus();
    }

    function close() {
      box.hidden = true;
      document.body.classList.remove("no-scroll");
      if (lastFocus) lastFocus.focus();
    }

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    });

    return { open: open };
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  var renderers = {
    people: renderPeople,
    person: renderPerson,
    publications: renderPublications,
    research: renderResearch,
    gallery: renderGallery
  };

  function init() {
    renderHeader();
    renderFooter();
    Object.keys(renderers).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) renderers[id](target);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
