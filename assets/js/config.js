// The settings of the site. This is the one place to change at a release.
//
// version         the FerroUI version every snippet on the page names ({{version}} in index.html).
// releasePending  while true, the page says that `version` is being released and points to
//                 `previewVersion` until it is on crates.io, and the crates that are not on
//                 crates.io yet are marked in the crate table instead of linked. Set it to false
//                 once `version` is published.
// previewVersion  the newest version on crates.io while the release is pending.
window.FERROUI_SITE = {
  version: "0.4.0",
  releasePending: false,
  previewVersion: "0.4.0-preview.1"
};

(function (site, root) {
  if (site.releasePending) root.setAttribute("data-release-pending", "");
  // The theme the visitor chose last time (the system theme otherwise), before the first paint.
  try {
    var theme = window.localStorage.getItem("ferroui-theme");
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  } catch (e) { /* storage unavailable: follow the system theme */ }
  root.classList.remove("no-js");
})(window.FERROUI_SITE, document.documentElement);
