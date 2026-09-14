# Journey star map — source patch mirror

Prepared by Hermes (agentic AI assistant) under the direction of Tobias Musser

This repository packages [Hermes PR #70309](https://github.com/NousResearch/hermes-agent/pull/70309): provider-aware memory nodes, provenance, search/filter, desktop `/recall`, and cross-profile memory consolidation. It is a **source patch package**, not a standalone application or an upstream release. The separate web `/starjourney` port is not included.

- **Canonical development branch:** [P2ppyJack/hermes-agent — feat/journey-provider-memory-nodes](https://github.com/P2ppyJack/hermes-agent/tree/feat/journey-provider-memory-nodes)
- **Pinned base:** `62e5f466565ee56351e4483ead8e62f9e782f8b3`
- **Source head:** `6c3780a4befcedebac5ba92ba9f5c0a8c2cb3d4c`
- **Expected tree:** `1c05206f34511ba6885872da4d044f56eddc1314`
- **Package:** one refreshed source commit, 43 changed source files; either `patches/full.patch` or the numbered format-patch. Use one format, not both.
- **Provenance and checksums:** [SOURCE.txt](patches/SOURCE.txt), [manifest.json](patches/manifest.json).
- **License:** [MIT](LICENSE); upstream retains its copyright.

## Why this refresh exists

The earlier package targeted an older Hermes layout. The refreshed source keeps the modern status-router modules and Radix context menu instead of restoring the old web-server monolith or menu implementation. This reduces conflicts without discarding the existing provider, provenance and recall features.

The old apply helper attempted three-way application and retried plain application after failure. The replacement validates the payload, exact base and target cleanliness first, then rehearses the patch in a temporary Git index. Only a rehearsal producing the expected source tree can reach the real index/worktree. It never falls back after a failed mutation.

## Prepare an isolated checkout

**Do not apply this to your running Hermes installation.** Use a new checkout, with the patch repository beside it—not nested inside it. The helper refuses untracked files and unrelated changes. Requirements: Git, Python 3, and a POSIX shell for the wrapper. Native Windows users can call `python patches/apply.py` with the appropriate relative path; the new packaging helper itself has not been exercised in a Windows VM.

```bash
# Run in a new working directory; do not reuse your active Hermes source tree.
git clone https://github.com/P2ppyJack/journey-starmap.git
git clone https://github.com/NousResearch/hermes-agent.git hermes-agent-journey
cd hermes-agent-journey
git fetch origin 62e5f466565ee56351e4483ead8e62f9e782f8b3
git switch --detach 62e5f466565ee56351e4483ead8e62f9e782f8b3
bash ../journey-starmap/patches/apply.sh
```

The helper takes **no arguments**. It leaves the feature staged without creating a commit or moving HEAD. Review with `git diff --cached --stat` and `git diff --cached`. `git write-tree` must print the expected tree above. Repeating the helper on that exact staged tree is a no-op; a clean checkout of the exact published source head is also recognized. Dirty, partially staged, wrong-base and corrupt-package cases are refused.

A Git linked worktree (`.git` is a file) is supported. Checksums protect against accidental corruption, not a maliciously replaced package and manifest. Use a reviewed repository revision. An unexpected operating-system/I/O failure during the final Git operation remains an error: inspect the isolated target rather than retrying or assuming rollback. This helper does not lock out other processes—do not edit the target concurrently.

### Build, test and activate separately

Follow the pinned checkout's own `CONTRIBUTING.md`, dependency lockfiles and platform build instructions. The patch helper does **not** install dependencies, build Electron, copy an app, migrate user data, change configuration, or restart any process.

The focused source check previously exercised on this head is:

```bash
HERMES_TEST_WORKERS=2 HERMES_TEST_FILE_RETRIES=0 bash scripts/run_tests.sh \
  tests/agent/test_learning_graph.py tests/agent/test_learning_mutations.py \
  tests/agent/test_provider_session_materialize.py \
  tests/plugins/memory/test_honcho_journey_cards.py \
  tests/test_learning_cross_insert.py -q
```

Before any actual activation, back up your installation and data, stop every runtime importing that installation, build/test the candidate, and use Hermes' platform-specific installation procedure. The desktop app, its backend, dashboards, gateway and interactive TUI sessions can retain old loaded code. Verify the restarted consumer, not merely a fresh file on disk. Never copy Python source underneath a running process.

### Upgrade and rollback

This is an exact-base snapshot, not an update manager. To adopt a newer package, create a **new** isolated checkout at its declared base and repeat its tests; do not stack packages or force an old patch onto current `main`. The previous mirror package remains available in Git history.

For a prepared but unused checkout, rollback is simply to keep using the original untouched installation and discard only the disposable checkout when no longer needed. For a deployed application, restore the separately preserved installation during a stopped-runtime boundary. The helper provides no automatic rollback of an already-deployed application or user state.

## How the feature works

1. **Provider read hooks:** the memory-provider interface offers optional `journey_cards` and `journey_session_messages` hooks. Default empty responses leave providers without these hooks unaffected. Cards append after file memories; provider failures degrade to an empty contribution rather than a broken map.
2. **Graph and source context:** the graph includes source, origin and session provenance. Search/filter narrows cards by text, type, source and time. Provider nodes are read-only; provider edit/delete is refused.
3. **Provenance and session recovery:** users can inspect matching local sessions or a provider corpus. Recreating a provider conversation uses the validated session-import seam, preserving its identifier/timestamps without overwriting an existing session.
4. **Recall:** a selected card becomes editable reference context in the desktop composer or a draft for another session. The reference framing helps distinguish data from instructions; it does not guarantee protection from prompt injection.
5. **Multiple profiles:** selected profile graphs merge with source-profile tags and prefixed identifiers. Recall resolves the originating profile. Explicit cross-profile insertion copies a memory or supported conclusion into another profile's memory file with a provenance note; skills are refused.
6. **Sharing and compatibility:** share-code v4 carries provider sources while v3 decoding remains supported. Single-profile behavior remains the default. No schema/config migration is included. Positional memory identifiers remain sensitive to later edits/deletions of existing file memories.

### Component responsibilities

| Component | Responsibility |
|---|---|
| `agent/memory_provider.py`, provider plugin | Optional read hooks and provider-specific corpus access |
| `agent/learning_graph.py`, `agent/learning_mutations.py` | Graph construction, read-only boundaries, reference drafts, validated imports |
| `hermes_cli/web_routers/status.py`, `web_models.py` | Profile-scoped routes through existing authentication and execution helpers |
| `apps/desktop/src/api/skills.ts` | Desktop API client, kept behind the modern export barrel |
| Desktop `starmap/` components | Canvas, search, provenance, profile selector and actions |
| `patches/apply.py` | Exact-package preflight and application; not runtime deployment |

## Verification and limits

**Source head evidence:** focused macOS Python checks: **42 passed**. Selected Windows 11 VM Python checks: **237 passed, 5 skipped**, using x64 Python 3.11.14 and locked dependencies. The original Windows runner did not retain the five skip reasons; those are unverified coverage, not passes. Earlier expanded source/renderer results are documented on the PR, not rerun or restamped by this mirror rebuild.

**Package verification:** the repository's tests exercise dirty/partial/wrong-base refusal, checksum/tree mismatches, exact apply/repeat, published-head no-op, linked-worktree support, and invalid-argument refusal. `verify_source.py` independently reconstructs the source tree from both package formats and checks the preserved screenshot/license hashes. These tests are separate from Hermes feature tests.

```bash
# From this mirror repository:
python3 -m unittest discover -s tests -v
python3 tests/verify_source.py /path/to/source-hermes-agent
```

The second command needs an existing source clone containing both pinned commits; it creates disposable local clones, uses no network, and does not change the source clone.

Hosted CI for the submitted source was awaiting upstream maintainer approval at preparation time; it is **not certified passing** here. The packaged Windows GUI, installer/upgrade lifecycle, Linux runtime and native ARM64 Windows behavior are not established by the selected Windows Python suites. The new packaging helper's recorded execution is on macOS. Historical screenshots are illustrations, not current acceptance results.

## Historical screenshots

These existing images are preserved byte-for-byte. Captures 01–11 were made with synthetic data; 12–13 were earlier tightly framed multi-profile UI captures. They have not been recaptured or newly privacy-certified in this package refresh.

| View | Image |
|---|---|
| Journey command | ![Journey command](docs/screenshots/01-slash-journey-composer.png) |
| Overview | ![Overview](docs/screenshots/02-star-map-overview.png) |
| Search | ![Search](docs/screenshots/03-search-sidebar.png) |
| Results | ![Results](docs/screenshots/04-search-results.png) |
| Conclusions | ![Conclusion filter](docs/screenshots/05-filter-conclusions.png) |
| Actions | ![Context menu](docs/screenshots/06-node-context-menu.png) |
| Provenance | ![Provenance](docs/screenshots/07-provenance-sessions.png) |
| Corpus | ![Corpus](docs/screenshots/08-source-corpus.png) |
| Recall picker | ![Recall mode](docs/screenshots/09-recall-mode.png) |
| Recall actions | ![Recall menu](docs/screenshots/10-recall-menu.png) |
| Composer draft | ![Recall draft](docs/screenshots/11-recall-inserted-composer.png) |
| Profiles | ![Profile selector](docs/screenshots/12-multi-profile-selector.png) |
| Cross-profile copy | ![Cross-profile insert](docs/screenshots/13-cross-profile-insert.png) |

---

Hermes analyzed and drafted; Tobias Musser supplied business context, adjudicated judgment calls, and corrected conclusions.
