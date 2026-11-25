# core-port — reference sources for the web dashboard Star Journey

These files are the Star Journey page for the Hermes **web dashboard**, its TUI link helper, and their tests, as they were written against the `hermes-agent` source tree. They keep their original repository-relative paths (`web/src/...`, `ui-tui/src/...`, `tests/...`, `docs/...`) so the history stays readable.

They are **reference only**: this plugin does not build, copy or install anything from this folder. The plugin's desktop page, built from `src/` into `desktop/plugin.js`, is a separate port of the same feature.

Using these files would need a Hermes source build. Two pieces also need core changes that a plugin cannot make:

- the TUI `/journey` → dashboard link (`ui-tui/src/lib/starjourneyNav.ts`);
- the `HERMES_DASHBOARD_ORIGIN` injection covered by `tests/hermes_cli/test_journey_star_map_link.py`.

The images in `docs/images/` are fixture screenshots with no real data.
