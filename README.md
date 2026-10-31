# FerroUI website

The website of [FerroUI](https://github.com/wieslawsoltes/FerroUI), a cross-platform UI framework for
Rust: **https://ferroui.github.io/website/**

A static page: HTML, CSS and plain JavaScript, with no framework, no build step and no third-party
requests. GitHub Pages publishes it from `main` through `.github/workflows/pages.yml`.

## Layout

| Path | Content |
|---|---|
| `index.html` | the page |
| `assets/css/site.css` | the styles: colour tokens for the light and dark themes, Fluent surfaces, the layout |
| `assets/js/config.js` | the version the page shows and the release flag (below) |
| `assets/js/site.js` | versions in the snippets, code highlighting and copy buttons, the theme switch, tabs, the crate filter, Reveal |
| `assets/img/` | the logo and the screenshots (WebP, each with a 480 or 640 pixel variant) |
| `scripts/update-crates.py` | writes the crate table from the README of FerroUI |
| `scripts/check-site.py` | the checks of CI: local references, versions, names |

## Run it locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## At a release

The version appears in one place, `assets/js/config.js`; the snippets of `index.html` write
`{{version}}` and the labels `data-version`.

1. Set `version` to the new version.
2. While the release is being published, set `releasePending: true` and `previewVersion` to the
   newest version on crates.io. The page then says that the release is on its way, and the crates
   that are not on crates.io yet are marked "New in" the version instead of linked.
3. Once the release is on crates.io, set `releasePending: false`.

When crates join or leave the release, regenerate the crate table from FerroUI's README; with
`--crates-io` the script also looks every crate up on crates.io to mark the new ones:

```sh
python3 scripts/update-crates.py ../FerroUI/README.md --crates-io
```

## Checks

CI validates the page with [html-validate](https://html-validate.org/) and runs
`scripts/check-site.py`:

```sh
npx --yes html-validate@11.16.2 index.html
python3 scripts/check-site.py
```

## Screenshots

The screenshots come from the READMEs of FerroUI and of the applications in the
[FerroUI organization](https://github.com/FerroUI), and from the live Control Catalog. Each card links
to its source repository.

## License

[MIT](LICENSE).
