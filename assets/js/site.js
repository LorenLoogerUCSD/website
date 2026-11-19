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
    name: "Looger Lab",
    footer: "© " + new Date().getFullYear() + " Looger Lab · UC San Diego",
    // Set to false (or delete the banner text) when the site launches.
    draftBanner: true,
    feedbackUrl: "https://github.com/LorenLoogerUCSD/website/issues",
    nav: [
      { href: "index.html", label: "Home" },
      { href: "research.html", label: "Research" },
      { href: "resources.html", label: "Resources" },
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
  var NAV_PARENT = { "person.html": "people.html", "research-area.html": "research.html" };

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
        el("a", { class: "brand", href: "index.html", text: SITE.name }),
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

  function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function lastName(name) {
    var parts = String(name).trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
  }

  // PI shown large at the top, like a feature block.
  // Email addresses are stored as "name [at] domain" in the data files and in
  // the HTML, so simple scrapers reading the source don't find them. The real
  // address is only put together here, in the visitor's browser.
  function decodeEmail(text) {
    return String(text || "").replace(/\s*\[at\]\s*/i, "@").replace(/\s*\[dot\]\s*/gi, ".").trim();
  }

  function emailLink(text) {
    var address = decodeEmail(text);
    return el("a", { href: "mailto:" + address, text: address });
  }

  // Links inside a clickable card can't be real <a> tags; open them on click.
  function renderInlineLinks() {
    Array.prototype.forEach.call(document.querySelectorAll(".inline-link[data-href]"), function (s) {
      s.setAttribute("role", "link");
      s.setAttribute("tabindex", "0");
      function go(e) { e.preventDefault(); e.stopPropagation(); window.location.href = s.getAttribute("data-href"); }
      s.addEventListener("click", go);
      s.addEventListener("keydown", function (e) { if (e.key === "Enter") go(e); });
    });
  }

  // Turn <a data-email="name [at] domain"></a> in a page into a working link.
  function renderEmails() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-email]"), function (a) {
      var address = decodeEmail(a.getAttribute("data-email"));
      a.setAttribute("href", "mailto:" + address);
      a.textContent = address;
    });
  }

  // Contact line: office (as written, e.g. "CNCB 102B") and email.
  function contactInfo(p) {
    var parts = [];
    if (p.office) parts.push(p.office);
    if (p.email) parts.push(emailLink(p.email));
    return parts.length ? el("p", { class: "contact-info" }, joinWith(parts, " \u00b7 ")) : null;
  }

  function featuredPerson(p) {
    var href = p.id ? "person.html?id=" + encodeURIComponent(p.id) : null;
    // Landscape card, styled like the other people cards; the whole card is the link.
    return el(href ? "a" : "div", { class: "card pi-feature" + (href ? " person-link" : ""), href: href }, [
      personPhoto(p, "pi-photo"),
      el("div", { class: "pi-text" }, [
        el("h2", { text: p.name }),
        roleNode("p", p.role)
      ])
    ]);
  }

  // People page: PI at the top; everyone else in one alphabetical grid with
  // tabs (All / Staff / Postdocs / ...) built from the groups in people.json.
  // A group marked "featured": true is shown as the PI block; "alumni": true
  // is listed at the bottom.
  function renderPeople(target) {
    loadJSON("data/people.json").then(function (data) {
      target.textContent = "";
      var groups = data.groups || [];

      groups.filter(function (g) { return g.featured; }).forEach(function (g) {
        (g.members || []).forEach(function (m) { target.appendChild(featuredPerson(m)); });
      });

      var categories = groups.filter(function (g) { return !g.featured && !g.alumni && (g.members || []).length; });
      var everyone = [];
      categories.forEach(function (g) {
        (g.members || []).forEach(function (m) { everyone.push({ person: m, category: slugify(g.title) }); });
      });
      everyone.sort(function (a, b) {
        return lastName(a.person.name).localeCompare(lastName(b.person.name)) ||
          a.person.name.localeCompare(b.person.name);
      });

      var cards = everyone.map(function (x) {
        var card = personCard(x.person);
        card.setAttribute("data-category", x.category);
        return card;
      });
      var grid = el("div", { class: "grid people-grid" }, cards);

      var tabs = [{ key: "all", label: "All" }].concat(categories.map(function (g) {
        return { key: slugify(g.title), label: g.title };
      }));
      var buttons = tabs.map(function (t) {
        var b = el("button", { type: "button", class: "people-tab", "data-key": t.key, text: t.label });
        b.addEventListener("click", function () { select(t.key, true); });
        return b;
      });
      var bar = el("div", { class: "people-tabs", role: "toolbar", "aria-label": "Filter people" }, buttons);

      function select(key, updateUrl) {
        if (!tabs.some(function (t) { return t.key === key; })) key = "all";
        buttons.forEach(function (b) {
          var on = b.getAttribute("data-key") === key;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        cards.forEach(function (c) {
          c.hidden = !(key === "all" || c.getAttribute("data-category") === key);
        });
        if (updateUrl && window.history && history.replaceState) {
          history.replaceState(null, "", key === "all" ? window.location.pathname : "#" + key);
        }
      }

      if (cards.length) {
        target.appendChild(bar);
        target.appendChild(grid);
        select(window.location.hash.replace("#", "") || "all", false);
      }

      groups.filter(function (g) { return g.alumni && (g.members || []).length; }).forEach(function (g) {
        target.appendChild(el("h2", { class: "alumni-heading", text: g.title }));
        var alumni = g.members.slice().sort(function (a, b) { return lastName(a.name).localeCompare(lastName(b.name)); });
        target.appendChild(el("ul", { class: "alumni-list" }, alumni.map(alumniItem)));
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

      var header = el("div", { class: "profile-header" }, [
        personPhoto(person, "profile-photo"),
        el("div", null, [
          el("h1", { text: person.name }),
          roleNode("p", person.role, " · "),
          contactInfo(person),
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
      el("em", { class: "journal", text: pub.journal }),
      source.join(""),
      " (" + pub.year + ").",
    ].concat(pubTags(pub).map(function (t) {
      return el("span", { class: "tag tag-" + t.key, text: t.label });
    })));

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

  // Publication tags, used as filter chips and shown on each entry.
  // Demo set: assigned automatically. A paper can also list them explicitly,
  // e.g. "tags": ["gcamp", "sensor"], which overrides the automatic rule.
  var PUB_TAGS = [
    { key: "preprint", label: "Preprint", test: function (p) { return !!p.preprint; } },
    { key: "review", label: "Review", test: function (p) { return !!p.review; } },
    { key: "gcamp", label: "GCaMP", test: function (p) { return /gcamp/i.test(p.title); } },
    { key: "sensor", label: "Sensor", test: function (p) {
      return /sensor|indicator|snfr|reporter/i.test(p.title);
    } }
  ];

  function pubTags(p) {
    return PUB_TAGS.filter(function (t) {
      if (Array.isArray(p.tags)) return p.tags.indexOf(t.key) !== -1 ||
        (t.key === "preprint" && p.preprint) || (t.key === "review" && p.review);
      return t.test(p);
    });
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
        placeholder: "Search title, author or journal\u2026",
        "aria-label": "Search publications"
      });

      var years = [];
      pubs.forEach(function (p) { if (years.indexOf(p.year) === -1) years.push(p.year); });
      var yearSelect = el("select", { class: "pub-select", "aria-label": "Filter by year" },
        [el("option", { value: "", text: "All years" })].concat(years.map(function (y) {
          return el("option", { value: String(y), text: String(y) });
        })));

      var active = [];
      var chips = PUB_TAGS.map(function (t) {
        var b = el("button", { type: "button", class: "pub-chip tag-" + t.key, "aria-pressed": "false", text: t.label });
        b.addEventListener("click", function () {
          var i = active.indexOf(t.key);
          if (i === -1) active.push(t.key); else active.splice(i, 1);
          b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
          draw();
        });
        return b;
      });

      var controls = el("div", { class: "pub-controls" }, [
        el("div", { class: "pub-controls-row" }, [search, yearSelect]),
        el("div", { class: "pub-chips", role: "group", "aria-label": "Filter by tag" }, chips)
      ]);
      var results = el("div");

      function draw() {
        var q = search.value.trim().toLowerCase();
        var y = yearSelect.value;
        var shown = pubs.filter(function (p) {
          if (y && String(p.year) !== y) return false;
          if (active.length) {
            var keys = pubTags(p).map(function (t) { return t.key; });
            if (!active.every(function (k) { return keys.indexOf(k) !== -1; })) return false;
          }
          if (!q) return true;
          return [p.title, authorList(p.authors).join(" "), p.journal, String(p.year)].join(" ").toLowerCase().indexOf(q) !== -1;
        });

        results.textContent = "";
        if (!shown.length) {
          results.appendChild(el("p", { class: "placeholder", text: "No publications match these filters." }));
          return;
        }

        var year = null;
        var list = null;
        shown.forEach(function (p) {
          if (p.year !== year) {
            year = p.year;
            results.appendChild(el("h2", { class: "pub-year", text: String(year) }));
            list = el("ul", { class: "pub-list" });
            results.appendChild(list);
          }
          list.appendChild(citation(p, labNames));
        });
      }

      search.addEventListener("input", draw);
      yearSelect.addEventListener("change", draw);
      target.textContent = "";
      target.appendChild(controls);
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

      // One card per area: image, title, short summary, link to the full page.
      var cards = (data.areas || []).map(function (a) {
        var href = a.id ? "research-area.html?id=" + encodeURIComponent(a.id) : null;
        var summary = a.summary || paragraphs(a.description)[0] || "";
        var image = a.image
          ? el("img", { class: "area-card-image", src: a.image, alt: a.imageAlt || "", loading: "lazy" })
          : el("div", { class: "area-card-image", role: "img", "aria-label": "No image" });
        var inner = [
          image,
          el("div", { class: "area-card-body" }, [
            el("h2", { text: a.title }),
            el("p", { text: summary }),
            href ? el("span", { class: "more", text: "Read more →" }) : null
          ])
        ];
        return href
          ? el("a", { class: "area-card", href: href }, inner)
          : el("div", { class: "area-card" }, inner);
      });
      if (cards.length) target.appendChild(el("div", { class: "area-grid" }, cards));

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

  // Detail page for one research area  (research-area.html?id=...)
  function renderResearchArea(target) {
    var id = new URLSearchParams(window.location.search).get("id");
    loadJSON("data/research.json").then(function (data) {
      var area = (data.areas || []).filter(function (a) { return a.id && a.id === id; })[0];
      target.textContent = "";
      target.appendChild(el("p", { class: "back" }, [el("a", { href: "research.html", text: "← All research" })]));

      if (!area) {
        target.appendChild(el("h1", { text: "Page not found" }));
        target.appendChild(el("p", { text: "This research page doesn’t exist. It may have moved." }));
        return;
      }

      document.title = area.title + " · Looger Lab";
      target.appendChild(el("h1", { text: area.title }));
      if (area.image) {
        var credit = area.credit
          ? (area.creditUrl ? el("a", { href: area.creditUrl, text: area.credit }) : document.createTextNode(area.credit))
          : null;
        target.appendChild(el("figure", { class: "area-figure" }, [
          el("img", { src: area.image, alt: area.imageAlt || "" }),
          credit ? el("figcaption", null, [credit]) : null
        ]));
      }
      var body = el("div", { class: "research-area" });
      paragraphs(area.description).forEach(function (t) { body.appendChild(el("p", { text: t })); });
      target.appendChild(body);
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Slideshow  (data/slides.json): rotating photos at the top of the home page
  // ---------------------------------------------------------------------------

  var SLIDE_SECONDS = 6;

  function renderSlideshow(target) {
    loadJSON("data/slides.json").then(function (slides) {
      slides = (slides || []).filter(function (s) { return s.src; });
      target.textContent = "";
      if (!slides.length) { target.hidden = true; return; }

      var index = 0;
      var timer = null;
      var paused = false;
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var slideEls = slides.map(function (s, i) {
        var credit = s.credit
          ? (s.creditUrl ? el("a", { class: "slide-credit", href: s.creditUrl, text: s.credit }) : el("span", { class: "slide-credit", text: s.credit }))
          : null;
        return el("figure", {
          class: "slide" + (i === 0 ? " active" : ""),
          role: "group",
          "aria-roledescription": "slide",
          "aria-label": (i + 1) + " of " + slides.length,
          "aria-hidden": i === 0 ? "false" : "true"
        }, [
          el("img", { src: s.src, alt: s.alt || s.caption || "", loading: i === 0 ? "eager" : "lazy" }),
          (s.caption || credit) ? el("figcaption", null, [
            s.caption ? el("span", { class: "slide-caption", text: s.caption }) : null,
            credit
          ]) : null
        ]);
      });

      var dots = slides.map(function (s, i) {
        var dot = el("button", {
          type: "button",
          class: "slide-dot" + (i === 0 ? " active" : ""),
          "aria-label": "Show slide " + (i + 1)
        });
        dot.addEventListener("click", function () { show(i); restart(); });
        return dot;
      });

      var prev = el("button", { type: "button", class: "slide-nav slide-prev", "aria-label": "Previous slide" }, ["‹"]);
      var next = el("button", { type: "button", class: "slide-nav slide-next", "aria-label": "Next slide" }, ["›"]);
      prev.addEventListener("click", function () { show(index - 1); restart(); });
      next.addEventListener("click", function () { show(index + 1); restart(); });

      var multi = slides.length > 1;
      var box = el("div", { class: "slideshow", role: "region", "aria-roledescription": "carousel", "aria-label": "Photos" },
        slideEls.concat(multi ? [prev, next, el("div", { class: "slide-dots" }, dots)] : []));
      target.appendChild(box);

      function show(i) {
        slideEls[index].classList.remove("active");
        slideEls[index].setAttribute("aria-hidden", "true");
        dots[index].classList.remove("active");
        index = (i + slides.length) % slides.length;
        slideEls[index].classList.add("active");
        slideEls[index].setAttribute("aria-hidden", "false");
        dots[index].classList.add("active");
      }

      function restart() {
        clearInterval(timer);
        if (multi && !paused && !reduceMotion) {
          timer = setInterval(function () { show(index + 1); }, SLIDE_SECONDS * 1000);
        }
      }

      // Pause while the pointer or keyboard focus is on the slideshow.
      box.addEventListener("mouseenter", function () { paused = true; restart(); });
      box.addEventListener("mouseleave", function () { paused = false; restart(); });
      box.addEventListener("focusin", function () { paused = true; restart(); });
      box.addEventListener("focusout", function () { paused = false; restart(); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { show(index - 1); }
        else if (e.key === "ArrowRight") { show(index + 1); }
      });
      document.addEventListener("visibilitychange", function () {
        paused = document.hidden;
        restart();
      });

      restart();
    }).catch(function (err) { showError(target, err); });
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  var renderers = {
    people: renderPeople,
    person: renderPerson,
    publications: renderPublications,
    research: renderResearch,
    "research-area": renderResearchArea,
    slideshow: renderSlideshow
  };

  function init() {
    renderHeader();
    renderFooter();
    renderEmails();
    renderInlineLinks();
    Object.keys(renderers).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) renderers[id](target);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
