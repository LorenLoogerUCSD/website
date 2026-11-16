#!/usr/bin/env python3
"""
Refresh data/publications.json from PubMed.

    python3 scripts/update_publications.py

What it does
  * Finds every PubMed record matching QUERY (below).
  * Gets the full author list, journal, volume/issue/pages, year, DOI, PMID
    and PMC ID for each one.
  * For papers with free full text in PubMed Central, reads the author
    footnotes and marks equal contributions: * for co-first (or other)
    authors, † for co-senior authors (a group that includes the last author),
    ‡ for a rare second non-senior group.
  * Leaves out errata and retraction notices, and preprints that PubMed links
    to a later published version.

Your manual edits are kept
  Entries already in data/publications.json are matched by PMID. These fields
  are never overwritten: "links", "notes", "hidden", and anything at all in an
  entry marked "locked": true. Entries without a PMID (added by hand) are kept
  as they are.
  To hide a paper from the website, add "hidden": true to it.
  To fix authors/equal contribution by hand, edit the entry and add "locked": true.

Only the Python standard library is needed. Takes a few minutes.
"""

import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

QUERY = "Looger L[au]"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "publications.json")

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
EUROPEPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/"
HEADERS = {"User-Agent": "lab-website-publication-updater/1.0"}
MARKERS = ["*", "†", "‡"]
SKIP_TYPES = {"Published Erratum", "Erratum", "Retraction of Publication", "Retracted Publication Notice"}
JOURNAL_FIXES = {"Elife": "eLife"}
EQUAL_RE = re.compile(
    r"contribut\w* equally|equal(ly)? contribut|equal contribution|co-first|joint first|"
    r"share[sd]? (first|senior|last|co-first)|are the first author|jointly supervised|co-senior|co-corresponding",
    re.I,
)
MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def fetch(url, tries=3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception:
            if attempt == tries - 1:
                return None
            time.sleep(2 * (attempt + 1))


def search_pmids(query):
    url = EUTILS + "esearch.fcgi?db=pubmed&retmode=json&retmax=5000&tool=labsite&term=" + urllib.parse.quote(query)
    data = fetch(url)
    if data is None:
        sys.exit("Could not reach PubMed.")
    return json.loads(data)["esearchresult"]["idlist"]


def text(node):
    return "".join(node.itertext()).strip() if node is not None else ""


def parse_article(a):
    art = a.find("MedlineCitation/Article")
    pmid = a.findtext("MedlineCitation/PMID")
    types = {text(t) for t in art.findall("PublicationTypeList/PublicationType")}

    authors = []
    for au in art.findall("AuthorList/Author"):
        last, initials, collective = au.findtext("LastName"), au.findtext("Initials"), au.findtext("CollectiveName")
        if last:
            authors.append((last + " " + (initials or "")).strip())
        elif collective:
            authors.append(collective.strip())

    journal = a.findtext("MedlineCitation/MedlineJournalInfo/MedlineTA") or art.findtext("Journal/ISOAbbreviation") or ""
    issue = art.find("Journal/JournalIssue")
    pubdate = issue.find("PubDate")
    year = pubdate.findtext("Year") or (pubdate.findtext("MedlineDate") or "")[:4]
    month = MONTHS.get((pubdate.findtext("Month") or "")[:3], 0)
    if not year:
        ad = art.find("ArticleDate")
        year = ad.findtext("Year") if ad is not None else ""

    ids = {e.get("IdType"): e.text for e in a.findall("PubmedData/ArticleIdList/ArticleId")}
    doi = ids.get("doi")
    if not doi:
        for e in art.findall("ELocationID"):
            if e.get("EIdType") == "doi":
                doi = e.text

    pages = art.findtext("Pagination/MedlinePgn")
    if not pages:
        for e in art.findall("ELocationID"):
            if e.get("EIdType") == "pii":
                pages = e.text

    updated_in = any(c.get("RefType") == "UpdateIn"
                     for c in a.findall("MedlineCitation/CommentsCorrectionsList/CommentsCorrections"))

    title = re.sub(r"\s+", " ", text(art.find("ArticleTitle"))).strip()
    if title.startswith("[") and title.endswith("].") :
        title = title[1:-2] + "."   # PubMed brackets translated titles

    pub = {
        "authors": authors,
        "title": title.rstrip("."),
        "journal": JOURNAL_FIXES.get(journal, journal),
        "year": int(year) if year.isdigit() else None,
    }
    if "Preprint" in types:
        pages = None   # preprint servers put an article ID here, not page numbers
    for key, value in (("volume", issue.findtext("Volume")), ("issue", issue.findtext("Issue")), ("pages", pages)):
        if value:
            pub[key] = value
    if doi:
        pub["doi"] = doi
    pub["pmid"] = pmid
    if ids.get("pmc"):
        pub["pmcid"] = ids["pmc"]
    if "Preprint" in types:
        pub["preprint"] = True
    if "Review" in types:
        pub["review"] = True
    pub["_month"] = month
    pub["_skip"] = bool(types & SKIP_TYPES) or ("Preprint" in types and updated_in)
    return pub


def fetch_records(pmids):
    records = []
    for i in range(0, len(pmids), 100):
        batch = pmids[i:i + 100]
        data = fetch(EUTILS + "efetch.fcgi?db=pubmed&retmode=xml&tool=labsite&id=" + ",".join(batch))
        if data is None:
            sys.exit("Could not download records from PubMed.")
        for a in ET.fromstring(data).findall("PubmedArticle"):
            records.append(parse_article(a))
        print("  fetched %d/%d" % (min(i + 100, len(pmids)), len(pmids)), file=sys.stderr)
        time.sleep(0.5)
    return records


def equal_contributions(pmcid):
    """Return a list of groups (lists of surnames) of equally contributing authors."""
    data = fetch(EUROPEPMC + pmcid + "/fullTextXML", tries=2)
    if data is None:
        data = fetch(EUTILS + "efetch.fcgi?db=pmc&tool=labsite&id=" + pmcid[3:], tries=2)
    if data is None:
        return None
    try:
        front = ET.fromstring(data).find(".//front")
    except ET.ParseError:
        return None
    if front is None:
        return None

    notes = {}
    for fn in front.iter("fn"):
        if fn.get("id") and EQUAL_RE.search(text(fn)):
            notes[fn.get("id")] = len(notes)

    groups = {}
    for c in front.iter("contrib"):
        if c.get("contrib-type") not in (None, "author"):
            continue
        surname = c.findtext(".//surname")
        if not surname:
            continue
        hits = [notes[x.get("rid")] for x in c.iter("xref") if x.get("rid") in notes]
        if c.get("equal-contrib") == "yes" and not hits:
            hits = [99]
        for h in hits:
            groups.setdefault(h, []).append(surname)
    # A "group" of one person is not an equal contribution.
    return [g for _, g in sorted(groups.items()) if len(g) > 1]


def normalize(name):
    name = unicodedata.normalize("NFKD", name)
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    return re.sub(r"[\s\-‐-―']+", " ", name).strip().lower()


def same_surname(pubmed_last, jats_surname):
    """PubMed and the full text sometimes split names differently
    (e.g. "Del Bene" vs "Bene"), so allow one to end with the other."""
    a, b = normalize(pubmed_last), normalize(jats_surname)
    return a == b or a.endswith(" " + b) or b.endswith(" " + a)


def assign_markers(authors, index_groups):
    """Mark equal-contribution groups by position.

    The group that includes the last author gets † (co-senior authors);
    other groups get *, then ‡. Groups of fewer than two people are dropped.
    """
    last = len(authors) - 1
    groups = []
    for g in index_groups:
        g = sorted(set(g))
        if len(g) < 2:
            continue
        if last in g:
            # Split off the run of authors that ends with the last author.
            k = len(g) - 1
            while k > 0 and g[k - 1] == g[k] - 1:
                k -= 1
            head, tail = g[:k], g[k:]
            if len(tail) >= 2 and (not head or len(head) >= 2):
                groups += [x for x in (head, tail) if x]   # e.g. co-first + co-senior in one footnote
                continue
            # e.g. first and last author "contributed equally": not a senior-only group
            groups.append(("mixed", g))
            continue
        groups.append(g)
    mixed = [g for t, g in (x for x in groups if isinstance(x, tuple))]
    groups = [g for g in groups if not isinstance(g, tuple)]
    senior = [g for g in groups if last in g]
    others = sorted((g for g in groups if last not in g) , key=lambda g: g[0]) + mixed
    plan = list(zip(["*", "‡"], others)) + [("†", g) for g in senior[:1]]
    for marker, group in plan:
        for i in group:
            if authors[i][-1] not in MARKERS:
                authors[i] = authors[i] + marker


def apply_markers(pub, groups):
    authors = pub["authors"]
    index_groups = []
    for surnames in groups:
        used, idx = set(), []
        for surname in surnames:
            for i, a in enumerate(authors):
                if i not in used and same_surname(a.rsplit(" ", 1)[0], surname):
                    used.add(i)
                    idx.append(i)
                    break
        index_groups.append(idx)
    assign_markers(authors, index_groups)


def main():
    existing = []
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            existing = json.load(f)
    by_pmid = {p["pmid"]: p for p in existing if p.get("pmid")}
    manual = [p for p in existing if not p.get("pmid") and not str(p.get("title", "")).startswith("[")]

    print("Searching PubMed for: " + QUERY, file=sys.stderr)
    pmids = search_pmids(QUERY)
    print("  %d records" % len(pmids), file=sys.stderr)
    records = fetch_records(pmids)

    out, skipped = [], 0
    with_pmc = [r for r in records if not r["_skip"] and r.get("pmcid") and not by_pmid.get(r["pmid"], {}).get("locked")]
    print("Checking %d full texts for equal contributions..." % len(with_pmc), file=sys.stderr)
    for n, r in enumerate(with_pmc, 1):
        groups = equal_contributions(r["pmcid"])
        if groups:
            apply_markers(r, groups)
        if n % 20 == 0:
            print("  %d/%d" % (n, len(with_pmc)), file=sys.stderr)
        time.sleep(0.3)

    for r in records:
        if r["_skip"]:
            skipped += 1
            continue
        old = by_pmid.get(r["pmid"])
        if old and old.get("locked"):
            out.append(old)
            continue
        if old:
            for key in ("links", "notes", "hidden"):
                if key in old:
                    r[key] = old[key]
        out.append(r)

    out += manual
    out.sort(key=lambda p: (-(p.get("year") or 0), -(p.get("_month") or 0), p.get("title", "")))
    for p in out:
        p.pop("_month", None)
        p.pop("_skip", None)

    text_out = json.dumps(out, indent=2, ensure_ascii=False)
    text_out = re.sub(r'"authors": \[\s*([^\]]*?)\s*\]',
                      lambda m: '"authors": [' + ", ".join(x.strip() for x in m.group(1).split(",\n")) + "]",
                      text_out)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text_out + "\n")

    print("Wrote %d publications to %s (left out %d errata/superseded preprints)."
          % (len(out), os.path.relpath(OUT, ROOT), skipped), file=sys.stderr)


if __name__ == "__main__":
    main()
