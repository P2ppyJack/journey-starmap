# Journey star map

Version **0.3.0** packages the Journey feature from [Hermes Agent PR #70309](https://github.com/NousResearch/hermes-agent/pull/70309) as one source patch. It is not a standalone application or an upstream Hermes release.

| Item | Pinned value |
|---|---|
| Upstream repository | `NousResearch/hermes-agent` |
| Upstream base | `7b761da2de4979e424510ca7022bf9527aa65b68` |
| Feature commit | `807a67b78f8aaa575e8ef5bfa241f1ee5b90e886` |
| Resulting tree | `8f656cbd8abd015f27268bab5c3f61eb0f742e41` |
| Patch | [`patches/0001-feat-journey-provider-memory-nodes-star-map-provenan.patch`](patches/0001-feat-journey-provider-memory-nodes-star-map-provenan.patch) |

## What the feature adds

- **Provider memory nodes:** optional memory-provider hooks append read-only cards to the existing skill and file-memory graph. Providers without the hooks continue to return no additional cards.
- **Where this came from:** provider cards expose origin and source-session metadata. The desktop can show matching Hermes sessions, inspect the provider corpus, and recreate a provider conversation through the validated session-import path.
- **Search and filters:** search covers titles and full card bodies. Filters narrow the map by node type, source, and date.
- **Recall into a composer:** `/recall` opens the map in recall mode. A selected node can be inserted into the visible chat or saved as a reviewed draft for another session; it is never sent automatically.
- **Read-only provider boundary:** edit and delete remain available for local memory files, while provider-backed nodes identify their provider and refuse mutation.
- **Share codes:** version 4 preserves provider source names, and existing version 3 codes remain readable.

The patch contains only the Journey backend and desktop feature. It does **not** include multi-profile selection or cross-profile insertion, a web star-map page, native-turn gateway changes, session-coordination changes, or desktop-backend attachment changes.

## Where this came from

The feature extends the existing `MemoryProvider`, learning graph, status router, and desktop star-map components rather than adding a second graph system:

1. `journey_cards()` provides bounded, best-effort provider cards.
2. `journey_session_messages()` provides source messages for provenance inspection.
3. `agent.learning_graph` appends provider cards after local memory cards so existing local positions remain stable.
4. `agent.learning_mutations` builds recall drafts and imports provider sessions while keeping provider storage read-only.
5. The status router exposes profile-scoped graph, provenance, recall, and materialization endpoints.
6. The desktop star map renders, searches, filters, shares, and recalls those nodes.

## Requirements

- Git with three-way apply support.
- Python 3.11 or newer for the apply helper and package tests.
- The exact upstream base shown above. The helper rejects any other commit or a dirty target.
- For the desktop build, the Node.js and npm versions declared by the pinned Hermes checkout, plus any platform toolchain required by `apps/desktop/BUILDING.md`.

## Installation

Use a disposable checkout rather than a running Hermes installation:

```bash
git clone https://github.com/P2ppyJack/journey-starmap.git
git clone https://github.com/NousResearch/hermes-agent.git hermes-agent-journey
git -C hermes-agent-journey switch --detach 7b761da2de4979e424510ca7022bf9527aa65b68
python3 journey-starmap/patches/apply.py hermes-agent-journey
```

The helper verifies the patch checksum, exact base, clean target, and expected result in a temporary index before invoking `git apply --3way --unidiff-zero --index`. It leaves the feature staged and does not move `HEAD`, install dependencies, build an application, modify user data, or restart a process.

Confirm the staged source tree:

```bash
git -C hermes-agent-journey diff --cached --check
git -C hermes-agent-journey write-tree
# 8f656cbd8abd015f27268bab5c3f61eb0f742e41
```

Install dependencies and build the desktop from the patched checkout:

```bash
cd hermes-agent-journey
npm ci
npm run build --workspace apps/desktop
```

For an unpacked desktop application, use the pinned checkout's packaging requirements and run:

```bash
npm run pack --workspace apps/desktop
```

Review the upstream build and installation documentation before replacing an installed application. Applying this source patch alone does not activate the feature.

## Usage

1. Open Journey from the desktop or run `/journey`.
2. Use the sidebar to search text or filter by type, source, and date.
3. Open a provider node and choose **Where this came from** to inspect source sessions or messages.
4. Run `/recall`, select a node, and insert its reference text into the visible composer for review.
5. Use the node menu to add the same reviewed draft to another existing session.
6. Export and import map share codes as needed; version 3 and version 4 codes are supported.

## Rollback and uninstall

Before activation, discard the disposable patched checkout and continue using an unmodified Hermes checkout. Do not stack this patch on another base.

If a desktop build made from the patch was installed, stop the affected application, replace it through the normal Hermes installation path, and verify that the replacement uses unmodified upstream source. This package does not automate deployment rollback or user-data restoration.

## Compatibility and limits

- The package supports only upstream commit `7b761da2de4979e424510ca7022bf9527aa65b68`.
- Provider hooks are optional and best-effort; provider failures produce no provider cards rather than preventing the map from loading.
- Provider-backed nodes are read-only through Journey.
- Recall text is framed as untrusted reference data, but that framing is not a complete prompt-injection defense. Review drafts before sending.
- The package has no configuration or data-schema migration.
- Multi-profile and cross-profile features are not included. Screenshots 12 and 13 illustrate those excluded features and are retained only as existing repository assets.

## Screenshots

The included-feature views are illustrated by screenshots 01 through 11 under [`docs/screenshots/`](docs/screenshots/), including the map overview, search, provenance, source corpus, and recall flow.

## Verification

Run the package tests from this repository:

```bash
python3 -m unittest discover -s tests -v
python3 tests/verify_source.py /path/to/hermes-agent
```

The second command verifies that the patch reconstructs the declared tree from the pinned base without modifying the source worktree or index.

## License

MIT. See [LICENSE](LICENSE). The source patch retains the upstream project's license terms.

## Credits

Prepared by Hermes (agentic AI assistant) under the direction of Tobias Musser.
