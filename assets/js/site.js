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

  function currentPage() {
    var file = window.location.pathname.split("/").pop();
    return file === "" ? "index.html" : file;
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

  function personCard(p) {
    var photo = p.photo
      ? el("img", { class: "photo", src: p.photo, alt: p.name, loading: "lazy" })
      : el("div", { class: "photo", role: "img", "aria-label": "No photo" });

    var links = (p.links || []).map(function (l) {
      return el("a", { href: l.url, text: l.label });
    });

    return el("div", { class: "card person" }, [
      photo,
      el("h3", { text: p.name }),
      p.role ? el("div", { class: "role", text: p.role }) : null,
      p.bio ? el("p", { text: p.bio }) : null,
      p.now ? el("p", { class: "now", text: p.now }) : null,
      p.email ? el("p", null, [el("a", { href: "mailto:" + p.email, text: p.email })]) : null,
      links.length ? el("p", { class: "links" }, joinWith(links, " · ")) : null
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
        target.appendChild(el("div", { class: "grid" }, group.members.map(personCard)));
      });
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

      if (data.intro) target.appendChild(el("p", { class: "lead", text: data.intro }));

      var areas = (data.areas || []).map(function (a) {
        return el("div", { class: "card area" }, [
          a.image ? el("img", { class: "area-image", src: a.image, alt: a.title, loading: "lazy" }) : null,
          el("h3", { text: a.title }),
          el("p", { text: a.description })
        ]);
      });
      if (areas.length) target.appendChild(el("div", { class: "grid" }, areas));

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
