# Security policy

## Supported version

Version 1.0.x, the plugin, is the supported line. Releases 0.4.0 and earlier shipped as a source patch; they are historical and no longer receive fixes.

## Report a vulnerability

Use GitHub's private **Report a vulnerability** flow:

<https://github.com/P2ppyJack/journey-starmap/security/advisories/new>

Do not put credentials, private memory content, personal data or exploit details in a public issue. Please include:

- the plugin version and your Hermes version;
- the affected file;
- steps to reproduce;
- the expected impact.

## Security model

- The backend (`dashboard/plugin_api.py`) runs in Hermes's plugin host with your profile's permissions. It reads the learning graph, sessions and memory through Hermes's own functions, and it is served only behind the dashboard's own authentication.
- Honcho is read-only through this plugin. The plugin writes only when you act:
  - editing or deleting a skill or file-memory card;
  - inserting a memory into another profile, through the memory tool's locked, threat-scanned, size-capped add;
  - importing a provider conversation with "Recreate as Hermes session". An existing session is never overwritten.
- Provider messages and recalled content are untrusted reference data. Recall drafts are delimited and defanged, and they are never sent automatically. This reduces risk; it does not make the content safe.
- The desktop half imports only `@hermes/plugin-sdk`, `react` and `react/jsx-runtime`, and calls only its own backend namespace (`/api/plugins/journey-starmap/`).
- To install exactly the code you reviewed, pin a commit: `hermes plugins install https://github.com/P2ppyJack/journey-starmap --ref <40-character SHA>`.
