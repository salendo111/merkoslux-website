/* Merkoslux – Seitenlogik: Sprache, Menü, Galerie, Kontaktformular */
(function () {
  "use strict";

  /* ===== Einstellungen =====
     Kontaktformular: Adresse eines Formular-Dienstes eintragen (z. B. Formspree oder Web3Forms).
     Solange das Feld leer ist, zeigt das Formular einen Hinweis mit der Telefonnummer. */
  var CONFIG = {
    formEndpoint: "",          // z. B. "https://formspree.io/f/xxxxxxxx" oder "https://api.web3forms.com/submit"
    formAccessKey: ""          // nur für Web3Forms nötig
  };

  var DE_MSG = {
    "form.ok": "Danke, Ihre Anfrage wurde gesendet. Wir melden uns bald bei Ihnen.",
    "form.err": "Das Senden hat nicht geklappt. Bitte rufen Sie uns an: +352 621 270 220.",
    "form.invalid": "Bitte geben Sie Ihren Namen und Ihre Nachricht an und bestätigen Sie die Datenschutzerklärung.",
    "form.contact": "Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse an, damit wir antworten können."
  };

  var LANGS = ["de", "fr", "lb", "en"];
  var current = "de";
  var originals = new Map();
  var originalAlt = new Map();
  var metaDesc = document.querySelector('meta[name="description"]');
  var ogTitle = document.querySelector('meta[property="og:title"]');
  var ogDesc = document.querySelector('meta[property="og:description"]');
  var deMeta = {
    title: document.title,
    desc: metaDesc ? metaDesc.getAttribute("content") : "",
    ogTitle: ogTitle ? ogTitle.getAttribute("content") : "",
    ogDesc: ogDesc ? ogDesc.getAttribute("content") : ""
  };

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorieren */ } }

  function dict(lang) { return (window.I18N && window.I18N[lang]) || null; }
  function t(key) {
    var d = dict(current);
    if (d && d[key]) return d[key];
    return DE_MSG[key] || key;
  }

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    originals.set(el, el.textContent);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
    originalAlt.set(el, el.getAttribute("alt"));
  });

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = "de";
    current = lang;
    var d = dict(lang);
    document.documentElement.lang = lang === "lb" ? "lb" : lang;

    originals.forEach(function (orig, el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = (d && d[key]) ? d[key] : orig;
    });
    originalAlt.forEach(function (orig, el) {
      var key = el.getAttribute("data-i18n-alt");
      el.setAttribute("alt", (d && d[key]) ? d[key] : orig);
    });

    var pg = document.documentElement.getAttribute("data-page") || "home";
    var title = d && d["meta." + pg + ".title"] ? d["meta." + pg + ".title"] : deMeta.title;
    var desc = d && d["meta." + pg + ".desc"] ? d["meta." + pg + ".desc"] : deMeta.desc;
    document.title = title;
    if (metaDesc) metaDesc.setAttribute("content", desc);
    if (ogTitle) ogTitle.setAttribute("content", title);
    if (ogDesc) ogDesc.setAttribute("content", desc);

    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
    safeSet("merkoslux-lang", lang);
  }

  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.indexOf(q) !== -1) return q;
    var saved = safeGet("merkoslux-lang");
    if (saved && LANGS.indexOf(saved) !== -1) return saved;
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "de"];
    for (var i = 0; i < prefs.length; i++) {
      var p = String(prefs[i]).toLowerCase().slice(0, 2);
      if (LANGS.indexOf(p) !== -1) return p;
    }
    return "de";
  }

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });

  /* ===== Menü (mobil) ===== */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ===== Galerie, Lightbox, Filter ===== */
  var box = document.getElementById("lightbox");
  if (box && typeof box.showModal === "function") {
    var boxImg = box.querySelector("img");
    document.querySelectorAll(".gallery button").forEach(function (b) {
      b.addEventListener("click", function () {
        var thumb = b.querySelector("img");
        boxImg.src = b.getAttribute("data-full");
        boxImg.alt = thumb ? thumb.alt : "";
        box.showModal();
      });
    });
    box.querySelector(".lb-close").addEventListener("click", function () { box.close(); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
  }
  var filters = document.querySelectorAll(".filters button");
  filters.forEach(function (fb) {
    fb.addEventListener("click", function () {
      var f = fb.getAttribute("data-filter");
      filters.forEach(function (o) { o.setAttribute("aria-pressed", o === fb ? "true" : "false"); });
      document.querySelectorAll(".gallery li").forEach(function (li) {
        var show = f === "all" || li.getAttribute("data-cat") === f;
        li.hidden = !show;
        if (show) li.classList.add("in");
      });
    });
  });

  /* ===== Kontaktformular ===== */
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");

  function say(msg, kind) {
    status.textContent = msg;
    status.className = "form-status " + (kind || "");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements["name"];
      var msg = form.elements["nachricht"];
      var phone = form.elements["telefon"];
      var mail = form.elements["email"];
      var priv = document.getElementById("f-priv");
      var picked = [];
      form.querySelectorAll(".chips-in input:checked").forEach(function (c) { picked.push(c.getAttribute("data-v")); });

      [name, msg].forEach(function (f) { f.classList.remove("invalid"); });
      var bad = false;
      if (!name.value.trim()) { name.classList.add("invalid"); bad = true; }
      if (!msg.value.trim()) { msg.classList.add("invalid"); bad = true; }
      if (bad || !priv.checked) { say(t("form.invalid"), "err"); return; }
      if (!phone.value.trim() && !mail.value.trim()) { say(t("form.contact"), "err"); return; }

      if (form.elements["website"].value) { return; } // Spam-Falle (Honeypot)

      if (!CONFIG.formEndpoint) { say(t("form.err"), "err"); return; }

      var data = new FormData(form);
      data.append("leistungen", picked.join(", "));
      data.append("sprache", current);
      data.append("_subject", "Anfrage über die Merkoslux-Website");
      if (CONFIG.formAccessKey) {
        data.append("access_key", CONFIG.formAccessKey);
        data.append("subject", "Anfrage über die Merkoslux-Website");
      }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch(CONFIG.formEndpoint, { method: "POST", body: data, headers: { "Accept": "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          form.reset();
          say(t("form.ok"), "ok");
        })
        .catch(function () { say(t("form.err"), "err"); })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ===== Kopieren ===== */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var val = btn.getAttribute("data-copy");
      var done = function () {
        var old = btn.textContent; btn.textContent = t("ct.copied");
        setTimeout(function () { setLang(current); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(val).then(done, function () {});
    });
  });

  /* ===== Anfrage vorwählen: kontakt.html#anfrage-tiefbau ===== */
  var hm = /^#anfrage-([a-z]+)$/.exec(location.hash);
  if (hm) {
    var chip = document.querySelector('.chips-in input[data-service="' + hm[1] + '"]');
    if (chip) chip.checked = true;
  }

  /* ===== Seitenübergang ===== */
  var pt = document.querySelector(".pt");
  if (pt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== "_self") return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin || !/\.html?$|\/$/.test(u.pathname)) return;
      if (u.pathname === location.pathname) return;
      e.preventDefault();
      pt.classList.add("cover");
      requestAnimationFrame(function () { requestAnimationFrame(function () { pt.classList.add("go"); }); });
      setTimeout(function () { location.href = u.href; }, 360);
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) { pt.classList.remove("cover", "go"); }
    });
  }

  /* ===== Bewegung ===== */
  var header = document.querySelector(".site-header");
  var floatBox = document.querySelector(".float");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle("scrolled", y > 8);
      header.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      if (floatBox) floatBox.classList.toggle("show", y > 500);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var targets = document.querySelectorAll(
    ".framed, .lead, .stats-grid > div, .svc, .why-grid > div, .gallery li, .teaser li, .step, .value, .detail .wrap > *, .split > *, .c-info, .form, .band .wrap, .timeline li"
  );
  var stagger = ".stats-grid > div, .svc, .why-grid > div, .gallery li, .teaser li, .step, .value, .timeline li";
  document.querySelectorAll(stagger).forEach(function (el) {
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty("--d", (Math.min(idx, 5) * 0.08).toFixed(2) + "s");
  });
  targets.forEach(function (el) { if (!el.classList.contains("framed")) el.classList.add("reveal"); });

  /* Zahlen hochzählen */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || end < 2) { el.textContent = end; return; }
    var t0 = null, dur = 1300;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        en.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add("in"); });
    document.querySelectorAll("[data-count]").forEach(countUp);
  }

  setLang(detectLang());
})();
