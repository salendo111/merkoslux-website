/* Baut die Sprachseiten /fr/, /lb/, /en/ aus den deutschen Seiten und js/i18n.js.
   Läuft automatisch bei jedem Push (.github/workflows/sprachseiten.yml).
   Änderungen immer an den deutschen Seiten oder in js/i18n.js machen, nie in fr/, lb/, en/. */

export const SITE = "https://merkoslux.com";
export const LANGS = ["fr", "lb", "en"];
export const PAGES = [
  { file: "index.html", slug: "", page: "home" },
  { file: "leistungen.html", slug: "leistungen", page: "leistungen" },
  { file: "ueber-uns.html", slug: "ueber-uns", page: "ueber-uns" },
  { file: "kontakt.html", slug: "kontakt", page: "kontakt" }
];
const LEGAL = ["impressum", "datenschutz"]; // nur auf Deutsch
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const pageUrl = (lang, slug) => `${SITE}/${lang === "de" ? "" : lang + "/"}${slug}`;

function alternates(slug) {
  const list = ["de", ...LANGS].map((l) => [l, pageUrl(l, slug)]);
  list.push(["x-default", pageUrl("en", slug)]); // alle übrigen Sprachen: Englisch
  return list;
}

/* Fügt die hreflang-Links hinter dem Canonical ein. Ersetzt einen vorhandenen Block. */
export function addHreflang(html, slug) {
  const clean = html.replace(/<!-- hreflang:start -->[\s\S]*?<!-- hreflang:end -->\n?/, "");
  if (!/<link rel="canonical"[^>]*>/.test(clean)) throw new Error("Canonical fehlt: /" + slug);
  const links = alternates(slug).map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${u}">`);
  const block = ["<!-- hreflang:start -->", ...links, "<!-- hreflang:end -->"].join("\n");
  return clean.replace(/<link rel="canonical"[^>]*>\n?/, (m) => m.trimEnd() + "\n" + block + "\n");
}

function findClose(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].endsWith("/>")) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
  }
  throw new Error(`Schließendes </${tag}> fehlt`);
}

/* Entspricht el.textContent = dict[key] aus js/main.js. */
export function translateText(html, dict, missing = []) {
  const re = /<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
  let out = "";
  let pos = 0;
  let m;
  while ((m = re.exec(html))) {
    if (VOID.has(m[1].toLowerCase())) continue;
    const inner = m.index + m[0].length;
    const close = findClose(html, m[1], inner);
    const value = dict[m[2]];
    if (value == null) missing.push(m[2]);
    out += html.slice(pos, inner) + (value != null ? esc(value) : html.slice(inner, close));
    pos = close;
    re.lastIndex = close;
  }
  return out + html.slice(pos);
}

function translateAlt(html, dict) {
  return html.replace(/<[a-zA-Z][^>]*\sdata-i18n-alt="([^"]+)"[^>]*>/g, (tag, key) =>
    dict[key] != null ? tag.replace(/\salt="[^"]*"/, () => ` alt="${escAttr(dict[key])}"`) : tag
  );
}

/* Die Sprachseiten liegen einen Ordner tiefer: Pfade absolut machen, interne Links auf die Sprache legen. */
function fixPaths(html, lang) {
  return html
    .replace(/(\s(?:src|href|poster|data-full)=")(?!https?:|\/|#|mailto:|tel:|data:)([^"]+)"/g, '$1/$2"')
    .replace(/(\ssrcset=")([^"]+)"/g, (m, a, v) =>
      a + v.split(",").map((s) => s.trim().replace(/^(?!https?:|\/)/, "/")).join(", ") + '"'
    )
    .replace(/(\shref=")\/(?:index\.html)?(#[^"]*)?"/g, (m, a, h = "") => `${a}/${lang}/${h}"`)
    .replace(/(\shref=")\/(leistungen|ueber-uns|kontakt)(?:\.html)?([?#][^"]*)?"/g, (m, a, p, r = "") => `${a}/${lang}/${p}${r}"`);
}

export function buildPage(src, page, lang, dict, missing = []) {
  const title = dict[`meta.${page.page}.title`];
  const desc = dict[`meta.${page.page}.desc`];
  if (!title || !desc) throw new Error(`Meta-Texte fehlen: ${lang} ${page.page}`);
  const clean = src.replace(/<!-- hreflang:start -->[\s\S]*?<!-- hreflang:end -->\n?/, "");
  const setContent = (html, re, value) => html.replace(re, (m, a, b) => a + value + b);

  let html = fixPaths(translateAlt(translateText(clean, dict, missing), dict), lang);
  html = html.replace(/<html\b[^>]*>/, (t) => t.replace(/\slang="[^"]*"/, ` lang="${lang}"`));
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  html = setContent(html, /(<meta name="description" content=")[^"]*(")/, escAttr(desc));
  html = setContent(html, /(<meta property="og:title" content=")[^"]*(")/, escAttr(title));
  html = setContent(html, /(<meta property="og:description" content=")[^"]*(")/, escAttr(desc));
  html = setContent(html, /(<link rel="canonical" href=")[^"]*(")/, pageUrl(lang, page.slug));
  html = html.replace(/(<meta property="og:image" content=")\/?(?!https?:)/, (m, a) => `${a}${SITE}/`);
  html = html.replace(/<button type="button" data-lang="(\w+)" aria-pressed="(?:true|false)">/g, (m, l) =>
    `<button type="button" data-lang="${l}" aria-pressed="${l === lang}">`
  );
  html = html.replace(/^<!doctype html>\n?/i, (m) => m.trimEnd() + "\n<!-- Automatisch erzeugt aus der deutschen Seite und js/i18n.js. Nicht von Hand ändern. -->\n");
  return addHreflang(html, page.slug);
}

export function buildSitemap() {
  const entry = (loc, alts = []) =>
    ["<url>", `<loc>${loc}</loc>`, ...alts.map(([l, u]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${u}"/>`), "</url>"].join("\n");
  const urls = [];
  for (const p of PAGES) {
    for (const l of ["de", ...LANGS]) urls.push(entry(pageUrl(l, p.slug), alternates(p.slug)));
  }
  for (const s of LEGAL) urls.push(entry(pageUrl("de", s)));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    ""
  ].join("\n");
}

async function main() {
  const fs = await import("node:fs");
  const vm = await import("node:vm");
  const ctx = {};
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync("js/i18n.js", "utf8"), ctx);
  if (!ctx.I18N) throw new Error("window.I18N fehlt in js/i18n.js");

  for (const page of PAGES) {
    const src = fs.readFileSync(page.file, "utf8");
    fs.writeFileSync(page.file, addHreflang(src, page.slug));
    for (const lang of LANGS) {
      const missing = [];
      fs.mkdirSync(lang, { recursive: true });
      fs.writeFileSync(`${lang}/${page.file}`, buildPage(src, page, lang, ctx.I18N[lang], missing));
      if (missing.length) console.warn(`Fehlende Übersetzungen ${lang}/${page.file}: ${[...new Set(missing)].join(", ")}`);
    }
  }
  fs.writeFileSync("sitemap.xml", buildSitemap());
  console.log("Sprachseiten gebaut.");
}

if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("build-i18n.mjs")) {
  await main();
}
