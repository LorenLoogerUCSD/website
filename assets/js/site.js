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

  // Compact card for the People page; links to the member's profile page.
  function personCard(p) {
    var inner = [
      personPhoto(p, "photo"),
      el("h3", { text: p.name }),
      p.role ? el("div", { class: "role", text: p.role }) : null
    ];
    if (p.id) {
      return el("a", { class: "card person person-link", href: "person.html?id=" + encodeURIComponent(p.id) }, inner);
    }
    return el("div", { class: "card person" }, inner);
  }

  function alumniItem(p) {
    var details = [p.role, p.years].filter(Boolean).join(", ");
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
          person.role ? el("p", { class: "role", text: person.role }) : null,
          links.length ? el("p", { class: "links" }, joinWith(links, " · ")) : null
        ])
      ]);

      var body = el("div", { class: "profile-body" });
      paragraphs(person.bio).forEach(function (t) { body.appendChild(el("p", { text: t })); });

      if (person.publications && person.publications.length) {
        body.appendChild(el("h2", { text: "Selected publications" }));
        body.appendChild(el("ul", { class: "pub-list" }, person.publications.map(function (pub) {
          return el("li", null, [
            el("div", { class: "meta" }, [pub.text]),
            pub.url ? el("div", { class: "links" }, [el("a", { href: pub.url, text: "Link" })]) : null
          ]);
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

  function pubItem(pub) {
    var url = pub.url || (pub.doi ? "https://doi.org/" + pub.doi : null);
    var title = url ? el("a", { href: url, text: pub.title }) : document.createTextNode(pub.title);

    var meta = [pub.authors + ". ", el("em", { text: pub.journal }), " (" + pub.year + ")."];
    if (pub.doi) meta.push(" doi:" + pub.doi);

    var extras = (pub.links || []).map(function (l) {
      return el("a", { href: l.url, text: l.label });
    });

    return el("li", null, [
      el("div", { class: "title" }, [title]),
      el("div", { class: "meta" }, meta),
      extras.length ? el("div", { class: "links" }, joinWith(extras, " · ")) : null
    ]);
  }

  function renderPublications(target) {
    loadJSON("data/publications.json").then(function (pubs) {
      pubs = pubs.slice().sort(function (a, b) { return b.year - a.year; });

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
          return [p.title, p.authors, p.journal, String(p.year)].join(" ").toLowerCase().indexOf(q) !== -1;
        });

        results.textContent = "";
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
          list.appendChild(pubItem(p));
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
