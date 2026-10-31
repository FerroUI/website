// FerroUI website: versions, code highlighting and copy, theme, navigation, tabs, template
// commands, crate filter, Reveal lighting and entrance motion. Plain JavaScript, no dependencies.
(function () {
  "use strict";

  var site = window.FERROUI_SITE || { version: "", releasePending: false, previewVersion: "" };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Versions: one constant (assets/js/config.js) fills every snippet and label.
  function fillVersions() {
    document.querySelectorAll("pre code").forEach(function (code) {
      if (code.textContent.indexOf("{{version}}") !== -1) {
        code.textContent = code.textContent.split("{{version}}").join(site.version);
      }
    });
    document.querySelectorAll("[data-version]").forEach(function (el) { el.textContent = site.version; });
    document.querySelectorAll("[data-preview-version]").forEach(function (el) { el.textContent = site.previewVersion; });
    document.querySelectorAll("[data-release-notice]").forEach(function (el) { el.hidden = !site.releasePending; });
  }

  // A small highlighter for the languages on the page. Each rule is a named alternative of one
  // regular expression; the text between matches is escaped as it is.
  var RUST_KEYWORDS = "as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while";
  var GRAMMARS = {
    toml: [
      ["com", /#.*$/],
      ["sec", /^\s*\[\[?[^\]\n]+\]\]?/],
      ["str", /"(?:[^"\\\n]|\\.)*"/],
      ["attr", /^\s*[A-Za-z0-9_.-]+(?=\s*=)/],
      ["num", /\b(?:true|false|\d[\d_.]*)\b/]
    ],
    rust: [
      ["com", /\/\/.*$/],
      ["str", /"(?:[^"\\]|\\.)*"/],
      ["mac", /#!?\[[^\]\n]*\]|\b[a-z_][a-z0-9_]*!/],
      ["key", new RegExp("\\b(?:" + RUST_KEYWORDS + ")\\b")],
      ["type", /\b[A-Z][A-Za-z0-9_]*\b/],
      ["num", /\b\d[\d_]*(?:\.\d+)?\b/]
    ],
    xml: [
      ["com", /<!--[\s\S]*?-->/],
      ["tag", /<\/?[A-Za-z_][\w.:-]*|\/?>/],
      ["attr", /\b[A-Za-z_][\w.:-]*(?==)/],
      ["str", /"[^"]*"/]
    ],
    sh: [
      ["com", /(?:^|\s)#.*$/],
      ["str", /"(?:[^"\\]|\\.)*"|'[^']*'/],
      ["attr", /\b[A-Z][A-Z0-9_]*(?==)/],
      ["key", /^\s*(?:cargo|git|python3|gh|cd|cp|source|node)\b/]
    ],
    yaml: [
      ["com", /(?:^|\s)#.*$/],
      ["str", /"[^"\n]*"|'[^'\n]*'|\$\{\{[^}]*\}\}/],
      ["attr", /^\s*-?\s*[A-Za-z_][\w-]*(?=:)/],
      ["key", /\|/]
    ],
    text: []
  };

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(code) {
    var lang = code.getAttribute("data-lang");
    var rules = GRAMMARS[lang];
    if (!rules || !rules.length) return;
    var source = rules.map(function (r) { return "(" + r[1].source + ")"; }).join("|");
    var re = new RegExp(source, "gm");
    var text = code.textContent;
    var out = "";
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m[0] === "") { re.lastIndex++; continue; }
      var kind = null;
      for (var i = 0; i < rules.length; i++) { if (m[i + 1] !== undefined) { kind = rules[i][0]; break; } }
      out += escapeHtml(text.slice(last, m.index));
      var token = m[0];
      // Keep the leading whitespace of a comment or key outside the coloured span.
      var lead = token.match(/^\s*/)[0];
      out += escapeHtml(lead) + '<span class="t-' + kind + '">' + escapeHtml(token.slice(lead.length)) + "</span>";
      last = m.index + token.length;
    }
    out += escapeHtml(text.slice(last));
    code.innerHTML = out;
  }

  // Copy buttons on every code block.
  var COPY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 2.5A1.5 1.5 0 0 1 6.5 1h6A1.5 1.5 0 0 1 14 2.5v8a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 5 10.5v-8Zm1.5-.5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-6ZM3 5a1 1 0 0 0-1 1v7.5A1.5 1.5 0 0 0 3.5 15H10a1 1 0 0 0 1-1H3.5a.5.5 0 0 1-.5-.5V5Z"/></svg>';
  var CHECK_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M13.86 3.65a.5.5 0 0 1 0 .7l-7.5 7.5a.5.5 0 0 1-.71 0l-3.5-3.5a.5.5 0 1 1 .7-.7L6 10.79l7.15-7.14a.5.5 0 0 1 .71 0Z"/></svg>';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy") ? resolve() : reject(new Error("copy failed")); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(area); }
    });
  }

  function addCopyButtons() {
    var live = document.getElementById("copy-status");
    document.querySelectorAll(".code").forEach(function (block) {
      var head = block.querySelector(".code-head");
      var code = block.querySelector("pre code");
      if (!head || !code || head.querySelector(".copy")) return;
      var label = block.getAttribute("data-label") || "code";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "copy";
      button.setAttribute("aria-label", "Copy " + label);
      button.innerHTML = COPY_ICON + "<span>Copy</span>";
      button.addEventListener("click", function () {
        copyText(code.textContent.replace(/\n$/, "")).then(function () {
          button.setAttribute("data-copied", "true");
          button.innerHTML = CHECK_ICON + "<span>Copied</span>";
          if (live) live.textContent = "Copied " + label + " to the clipboard.";
          window.setTimeout(function () {
            button.removeAttribute("data-copied");
            button.innerHTML = COPY_ICON + "<span>Copy</span>";
          }, 1800);
        }, function () {
          if (live) live.textContent = "Copying is not available; select the text instead.";
        });
      });
      head.appendChild(button);
    });
  }

  // Theme: the system theme until the visitor picks one; the choice is remembered.
  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function setupTheme() {
    var button = document.querySelector(".theme-toggle");
    if (!button) return;
    function sync() {
      var dark = currentTheme() === "dark";
      button.setAttribute("aria-pressed", dark ? "true" : "false");
      button.setAttribute("title", dark ? "Use the light theme" : "Use the dark theme");
      var meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute("content", dark ? "#1c1c1c" : "#f3f3f3");
    }
    button.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { window.localStorage.setItem("ferroui-theme", next); } catch (e) { /* not remembered */ }
      sync();
    });
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () { if (!root.getAttribute("data-theme")) sync(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange);
    sync();
  }

  // The navigation menu on narrow screens.
  function setupMenu() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".menu-toggle");
    if (!nav || !toggle) return;
    function close() { nav.setAttribute("data-open", "false"); toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      nav.setAttribute("data-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { close(); toggle.focus(); }
    });
  }

  // The section in view is marked in the navigation.
  function setupScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
    if (!("IntersectionObserver" in window) || !links.length) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) observer.observe(s); });
    // At the top of the page no section is current.
    var top = document.getElementById("top");
    if (top) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) links.forEach(function (a) { a.removeAttribute("aria-current"); });
      }, { rootMargin: "-45% 0px -50% 0px" }).observe(top);
    }
  }

  // Tabs with the keyboard model of the ARIA tabs pattern.
  function setupTabs() {
    document.querySelectorAll("[role='tablist']").forEach(function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          var vertical = list.getAttribute("aria-orientation") === "vertical";
          if (e.key === "ArrowRight" || (vertical && e.key === "ArrowDown")) next = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft" || (vertical && e.key === "ArrowUp")) next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") next = tabs[0];
          else if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
    });
  }

  // The templates: each panel writes the cargo generate command of its template from its options.
  // data-before and data-next are the lines before and after it, separated by "|"; a line that
  // starts with "option?" (or "!option?") is written only when that checkbox is on (or off).
  var TEMPLATES_REPO = "https://github.com/FerroUI/templates";
  function setupTemplates() {
    document.querySelectorAll("[data-template]").forEach(function (panel) {
      var code = panel.querySelector("code[data-command]");
      if (!code) return;
      var template = panel.getAttribute("data-template");
      var nameInput = panel.querySelector("[data-name]");
      var controls = Array.prototype.slice.call(panel.querySelectorAll("[data-define]"));
      function clean(text) { return text.replace(/[^A-Za-z0-9_.-]/g, ""); }
      function valueOf(control) {
        return control.type === "checkbox" ? (control.checked ? "true" : "false") : clean(control.value.trim());
      }
      function lines(attribute, name) {
        return (panel.getAttribute(attribute) || "").split("|").filter(Boolean).map(function (line) {
          var condition = line.match(/^(!?)([a-z_]+)\?(.*)$/);
          if (condition) {
            var box = panel.querySelector("[data-define='" + condition[2] + "']");
            var on = box ? box.checked : false;
            if (on === (condition[1] === "!")) return null;
            line = condition[3];
          }
          return line.split("{name}").join(name);
        }).filter(function (line) { return line !== null; });
      }
      // cargo generate names the directory of the project in kebab case (MyApp is my-app).
      function kebab(text) {
        return text.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
      }
      function render() {
        var name = nameInput ? clean(nameInput.value.trim()) || nameInput.defaultValue : "my-app";
        var defines = controls.filter(function (control) {
          if (control.hasAttribute("data-always")) return valueOf(control) !== "";
          return valueOf(control) !== (control.getAttribute("data-default") || "");
        }).map(function (control) { return "--define " + control.getAttribute("data-define") + "=" + valueOf(control); });
        var command = "cargo generate --git " + TEMPLATES_REPO + " " + template + " --name " + name;
        var parts = [command];
        // Two defines per continuation line keep the command readable on a phone.
        for (var i = 0; i < defines.length; i += 2) parts.push(defines.slice(i, i + 2).join(" "));
        var text = lines("data-before", name).concat([parts.join(" \\\n    ")], lines("data-next", kebab(name))).join("\n");
        if (code.textContent !== text) {
          code.textContent = text;
          highlight(code);
        }
      }
      if (nameInput) nameInput.addEventListener("input", render);
      controls.forEach(function (control) {
        control.addEventListener("input", render);
        control.addEventListener("change", render);
      });
      render();
    });
  }

  // The crate table: a search field and one filter per group.
  function setupCrates() {
    var table = document.querySelector("table.crates");
    var input = document.getElementById("crate-search");
    var count = document.getElementById("crate-count");
    var empty = document.getElementById("crate-empty");
    if (!table || !input) return;
    var rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr"));
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chips .chip"));
    var group = "all";
    function apply() {
      var terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      var shown = 0;
      rows.forEach(function (row) {
        var hay = row.getAttribute("data-search");
        var ok = (group === "all" || row.getAttribute("data-group") === group) &&
          terms.every(function (t) { return hay.indexOf(t) !== -1; });
        row.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = shown === rows.length ? "All " + rows.length + " crates" : shown + " of " + rows.length + " crates";
      empty.hidden = shown !== 0;
    }
    rows.forEach(function (row) { row.setAttribute("data-search", row.textContent.toLowerCase().replace(/\s+/g, " ")); });
    input.addEventListener("input", apply);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        group = chip.getAttribute("data-group");
        chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        apply();
      });
    });
    apply();
  }

  // Reveal: a light follows the pointer over a card, and the border light reaches the neighbours.
  function setupReveal() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.querySelectorAll(".reveal-scope").forEach(function (scope) {
      var items = scope.querySelectorAll(".reveal");
      var frame = 0;
      var px = 0, py = 0;
      function paint() {
        frame = 0;
        items.forEach(function (el) {
          var r = el.getBoundingClientRect();
          el.style.setProperty("--mx", (px - r.left) + "px");
          el.style.setProperty("--my", (py - r.top) + "px");
        });
      }
      scope.addEventListener("pointermove", function (e) {
        px = e.clientX; py = e.clientY;
        if (!frame) frame = window.requestAnimationFrame(paint);
      });
    });
  }

  // Sections rise into place once, unless the visitor prefers less motion.
  function setupRise() {
    var items = document.querySelectorAll(".rise");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { observer.observe(el); });
  }

  fillVersions();
  document.querySelectorAll("pre code[data-lang]").forEach(highlight);
  addCopyButtons();
  setupTheme();
  setupMenu();
  setupScrollSpy();
  setupTabs();
  setupTemplates();
  setupCrates();
  setupReveal();
  setupRise();
})();
