# Changelog

## 1.0.0

First release as a Hermes plugin. The feature from 0.4.0, packaged so that nothing in Hermes is patched.

- Installs with `hermes plugins install https://github.com/P2ppyJack/journey-starmap --enable`. It ships two halves: an agent half (backend router) and a prebuilt desktop half (`desktop/plugin.js`).
- Runs on stock Hermes v0.23.3 and v0.23.4 (`requires_hermes: ">=0.23.3"`, manifest v2).
- The Honcho scopes come from the user's own Honcho config: the peer, the AI peer and the runtime ids aliased to the user by `userPeerAliases`. New settings `card_scopes`, `extra_scopes` and `exclude_peers` can replace or extend them, editable in the Desktop app's **Settings → Plugins**, with `hermes plugins config` (v0.23.4 and later) or with `hermes config set`.
- The provider report now carries `scope_source` and `settings_warnings`, and a settings change bypasses the five-minute card cache.
- The injection-hardened recall helpers are part of the plugin, so no core recall helpers are needed.
- No runtime dependencies. The build tooling's `package.json` lives in `tools/`, so Hermes's installer does not offer to install build tools into the plugin.
- CI validates the plugin and runs its tests against stock Hermes v0.23.3 and v0.23.4. It also checks that `desktop/plugin.js` rebuilds byte-for-byte from `src/` and runs the desktop register, smoke and bundle checks.

## 0.4.0

- Restores multi-profile mode: a profile selector merges several profiles' graphs on one map, with a profile badge per node.
- Restores cross-profile insert: a memory node can be copied into another profile's `MEMORY.md` through the memory tool's locked, threat-scanned, size-capped add.
- In the merged view, recall drafts are scoped to the node's own profile.
- Screenshots 12 and 13 now document included features.

## 0.3.0

- Adds read-only provider memory nodes to the desktop Journey map.
- Adds **Where this came from** provenance, source-session inspection, and provider-session recreation.
- Adds full-text search and filters for node type, source, and date.
- Adds `/recall` and reviewed composer drafts for the current chat or another existing session.
- Adds provider-aware map share codes while preserving version 3 decoding.
- Keeps local memory mutation behavior and provider read-only boundaries explicit.
