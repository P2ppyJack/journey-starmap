# Journey star map — standalone mirror of Hermes PR #70309

> **What this is.** The journey star-map feature for [Hermes](https://github.com/NousResearch/hermes-agent) — memory-provider integration, provenance drill-down, search/filter, `/recall`, and cross-profile memory consolidation — packaged as a self-contained patch set + documentation, mirroring the open upstream PR.
>
> - **Author:** Tobias Musser (GitHub: [P2ppyJack](https://github.com/P2ppyJack))
> - **Upstream PR:** [NousResearch/hermes-agent#70309](https://github.com/NousResearch/hermes-agent/pull/70309)
> - **Patch set:** 5 commits on hermes-agent `main` @ `987064caa4f8845f605ac7346fed5b72fddfb21c` → head `b2de4de4aa7901f6f4dc9c0b91f1e6fd3c375cd2`
> - **Canonical dev home:** branch `feat/journey-provider-memory-nodes` on [P2ppyJack/hermes-agent](https://github.com/P2ppyJack/hermes-agent) — the PR tracks it, so it is the live source; *this* repo is the curated, stable mirror.
> - **Apply it:** `bash patches/apply.sh` inside a hermes-agent checkout (or `git apply patches/full.patch`). Provenance in `patches/SOURCE.txt`.
> - **License:** MIT — see [LICENSE](LICENSE). Patch code © 2026 Tobias Musser; it applies to hermes-agent, which is MIT © 2025 Nous Research (upstream retains its copyright).

---

## Install

```bash
# 1) hermes-agent checkout (skip if you already have one)
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent

# 2) this patch set, then apply
git clone https://github.com/P2ppyJack/journey-starmap.git
bash journey-starmap/patches/apply.sh
```

That applies the full 5-commit feature (base `987064caa` → head `b2de4de4a`).
See [Applying this patch](#applying-this-patch) for conflict handling and the
individual patches.

---

*Feature documentation below is the PR #70309 description, verbatim.*

---

# Journey star map — memory-provider integration, provenance drill-down, search/filter, /recall, and cross-profile consolidation

## Summary

The desktop **journey star map** (the `/journey` memory graph) currently renders only file-based memories (`MEMORY.md` / `USER.md` §-chunks) and learned skills. This PR makes the map **memory-provider aware** end to end, builds the read-path features that provider knowledge unlocks, and adds **multi-profile / cross-session/ cross-bot memory consolidation** — you can view several bots' graphs on one canvas and **copy a memory or a learned conclusion from one bot into another bot's memory**:

- **Provider memory nodes** — any `MemoryProvider` can contribute journey cards via two new optional ABC hooks (safe defaults: existing providers unaffected).
- **Memory vs. conclusion contract** — provider cards carry a `memoryLevel`; derived levels (`inductive`/`deductive`) render as distinct **conclusion** hexagon nodes, gated to the honcho provider.
- **Provenance drill-down** — right-click any node → "Where this came from…" → matching Hermes sessions, or the provider's own source corpus, viewable in-app.
- **Recreate as Hermes session** — materialize a provider-only conversation (e.g. an imported ChatGPT thread) as a real, continuable Hermes session — idempotent, original timestamps preserved.
- **Search & filter sidebar** — full-text search, type/source/date filters (custom range, year, year+month), saved searches, filtered-subset chip on the canvas.
- **`/recall`** — pull a memory back into your work: a recall-draft endpoint composes a safe reference block (with connected-node hints) and the desktop inserts it into the composer or queues it onto another session.
- **Multi-profile star map (NEW)** — a bot selector merges several profiles' journey graphs into one canvas. Nodes/edges/cards carry a source `profile` tag and profile-prefixed ids so a fact's origin bot is always visible; the selection persists across reloads.
- **Cross-profile insert (NEW)** — from a merged multi-profile map, right-click a **memory** or a **Honcho conclusion** and copy it into another bot's `MEMORY.md`, tagged with an `[Imported from profile: X]` provenance note. This is how a fact learned by one bot gets promoted into another. Skills are intentionally **not** cross-insertable (their on-disk structure is a directory tree, not a single value — the endpoint refuses them explicitly).
- **Share codes v4** — WoW-talent-style map codes now encode provider nodes (dict-interned provider names); legacy v3 codes still decode via a version-keyed reader map.

All provider access is **read-only by design**: provider nodes refuse edit/delete with a clear per-provider message, and every provider call is best-effort (any failure → empty result, never a broken map).

Related: #64328 (desktop `/journey` parity), #57472 (gateway journey support), #57515 (read-only journey command).

## Reconciled with the `hermes.ts` → `api/*` refactor

This branch was rebased onto current `main` after the desktop gateway was refactored from the ~2,000-line `hermes.ts` monolith into a 130-line barrel that re-exports `./api/*` modules. The journey/provider helpers this PR adds are now **re-homed into `apps/desktop/src/api/skills.ts`** (alongside the existing `getLearningNode`/`editLearningNode`), so they ride the new barrel re-exports rather than resurrecting the old monolith. No consumer imports changed — everything still resolves through `@/hermes`.

## Screenshots

Captures **01–11** were taken against a **fully synthetic sandbox** — invented skills, memories, provider conclusions, and corpus conversations (no real user data). The two multi-profile captures (**12–13**) only render with 2+ profiles selected, so they were taken in multi-profile mode framed tightly on the UI chrome — node labels are not legible and no memory content is shown. Screenshots **01–13** live in `docs/screenshots/` (captured against a fully synthetic sandbox — invented skills, memories, provider conclusions, and corpus conversations, no real user data).

### `/journey` from the composer
The slash command opens the map (also available in the TUI).

![slash journey](docs/screenshots/01-slash-journey-composer.png)

### The star map
Skills (blue), file memories (orange), and provider **conclusions** (purple hexagons) on one canvas, with the timeline scrubber, legend, and share controls.

![star map overview](docs/screenshots/02-star-map-overview.png)

### Multi-profile selector (NEW)
The bot selector in the upper-left merges several profiles' graphs into one map; each node keeps its source-profile badge.

![multi-profile selector](docs/screenshots/12-multi-profile-selector.png)

### Cross-profile insert (NEW)
Right-click a **memory** or **conclusion** node in a merged multi-profile map → "Insert into &lt;bot&gt;" copies its content into that bot's `MEMORY.md` with an `[Imported from profile: …]` provenance note. (Skills are refused — they aren't a single value.)

![cross-profile insert](docs/screenshots/13-cross-profile-insert.png)

### Search sidebar
Full-text search across titles and bodies with type/source/date filters, recents, and saved searches.

![search sidebar](docs/screenshots/03-search-sidebar.png)
![search results](docs/screenshots/04-search-results.png)

### Conclusion filter
`Type → conclusions` narrows the map to derived facts; the canvas chip shows the filtered subset with one-click Clear.

![conclusions filter](docs/screenshots/05-filter-conclusions.png)

### Node context menu
One consolidated right-click surface: provenance, recall, add-to-session, start-a-conversation (conclusions), cross-profile insert, and the read-only provider note. Edit/delete appear only for Hermes-owned nodes.

![context menu](docs/screenshots/06-node-context-menu.png)

### Provenance drill-down
"Where this came from…" finds matching Hermes sessions; provider-only knowledge (e.g. imported conversations) explains itself and offers the source corpus.

![provenance](docs/screenshots/07-provenance-sessions.png)
![source corpus](docs/screenshots/08-source-corpus.png)

### `/recall`
Recall mode opens the map as a picker; "Insert into this chat" composes a fenced reference block — clearly labeled as reference data, with connected-node hints — into the composer (or queues it onto another session via "Add to a session").

![recall mode](docs/screenshots/09-recall-mode.png)
![recall menu](docs/screenshots/10-recall-menu.png)
![recall inserted](docs/screenshots/11-recall-inserted-composer.png)

## What changed

### Backend (python)

| Area | Change |
|---|---|
| `agent/memory_provider.py` | Two new **optional** ABC hooks: `journey_cards(limit)` and `journey_session_messages(session_id, limit)`. Default implementations return `[]` — existing providers compile and run unchanged. Contract documented on the ABC: callable without `initialize()`, best-effort never-raise, bounded, read-only. |
| `plugins/memory/honcho/__init__.py` | Implements both hooks. Cards = Honcho conclusions (both observer scopes, deduped, auto-paginated) with `memoryLevel` (`explicit`/`inductive`/`deductive`), origin stamping, and server `created_at` timestamps. Corpus messages carry `content`/`peer`/`role`/`timestamp`. |
| `agent/learning_graph.py` | `_provider_memory_cards()` merges provider cards **after** file cards (append-don't-shift: `memory:<source>:<index>` ids stay stable — regression-tested). Multi-profile merge tags every node/edge/card with its source `profile`. |
| `agent/learning_mutations.py` | Provider nodes are read-only (edit/delete refused with the provider name). `build_provider_session_import()` materializes a provider conversation through the validated `SessionDB.import_sessions` seam. `build_recall_draft()` composes the /recall reference block (node body + provenance + connected-node hints, wrapped in an explicit "reference data, not instructions" frame). |
| `hermes_cli/web_server.py` | New REST (all behind the existing session-token gate, all `asyncio.to_thread`): `GET /api/learning/provider-session`, `POST /api/learning/provider-session/materialize`, `GET /api/learning/recall-draft`, **`GET /api/learning/graph?profiles=a,b` (multi-profile merge)**, and **`POST /api/learning/node/cross-insert`** (copy a node's content into another profile's `memories/MEMORY.md`, with Honcho-conclusion support). |

### Desktop (Electron renderer)

| Area | Change |
|---|---|
| `api/skills.ts` | Re-home of the journey gateway helpers after the barrel refactor: `getLearningProviderSession`, `materializeLearningProviderSession`, `getLearningRecallDraft(id, profile?)`, `getStarmapGraphMultiProfile(profiles)`, `crossInsertLearningNode(...)`. `getStarmapGraph(profile?)` now accepts an optional profile. |
| `starmap/recall.ts` (+ `recall.test.ts`) | `resolveRecallTarget()` — strips the `<profile>:` id prefix and returns the node's own profile so a recall/insert from a merged multi-profile graph targets the right bot (fixes a prefixed-id 404). |
| `starmap/profile-selector.tsx` | The multi-profile bot selector (checkbox popover, active-profile-first ordering, persisted selection). |
| `store/starmap.ts` | `$starmapSelectedProfiles` persisted atom + multi-profile fetch branch (single vs. merged graph). |
| `starmap/sources.ts` | **Single definition** of "what is a provider node" (`isProviderSource()`); UI and share-codec both import it. |
| `starmap/search.ts` / `search-sidebar.tsx` | Pure filter/search logic + `isConclusion()`; the sidebar (query + recents, type/source/date filters, saved searches, chronological results). |
| `starmap/star-map.tsx`, `render.ts` | Conclusion hexagon glyphs + legend, filtered-subset chip, filter/search toggles, canvas pulse on search focus. |
| `starmap/node-context-menu.tsx` | Consolidated menu: provenance, recall-into-chat, add-to-session, start-conversation, **insert-into-profile / insert-into-all-selected**, read-only provider note; edit/delete only for Hermes-owned nodes. |
| `starmap/node-sessions-dialog.tsx` | Provenance dialog: matching Hermes sessions → open; provider-only note → source-corpus viewer → recreate-as-session. |
| `starmap/share-code.ts` | Share-code **v4** (provider slot + dict-interned provider names); v3 codes decode via a `legacyReaders` version map; pinned legacy-fixture test. |
| `/journey` & `/recall` | Slash commands in the desktop composer and TUI; `/recall` opens the map in picker mode and inserts/queues the draft. |
| i18n | All new strings in `en`, `zh`, and `types` (the three move together or `tsc` fails). |

## Test plan

_(Numbers below are from a full run on this reconciled branch; see the pinned run output.)_

- **Python**: the journey/provider test surface — `tests/agent/test_learning_graph.py`, `test_learning_mutations.py`, `tests/test_learning_cross_insert.py`, `tests/hermes_cli/test_web_server.py` — **188 passed / 0 failed** (covers the append-after-file-cards id invariant, best-effort provider failure → `[]`, read-only refusal, materialize idempotency/role-ladder/merge, recall-draft composition, the `memoryLevel` contract, and the **cross-insert → `memories/MEMORY.md` regression**).
- **Desktop**: `tsc --noEmit` clean; full vitest suite — **7053 passed / 3 skipped across 684 files, 0 failed** (incl. share-code v4 + pinned legacy-v3 fixture, search/filter logic, the recall-target resolver, and i18n key parity).
- **`scripts/check-windows-footguns.py`: 0 findings** on the diff vs `main` (11 files scanned) — no platform-divergent constructs added.
- **E2E / screenshots**: 01–11 were captured against a **synthetic sandbox** (invented skills, memories, and provider conclusions — no real user data), exercising slash → map → filter → provenance → corpus → `/recall` against live code, not mockups. 12–13 (multi-profile selector + cross-profile insert) only render with 2+ profiles selected, so they were shot in multi-profile mode framed tightly on the UI chrome — node labels are not legible and no memory content is shown.

## Security

- The new REST endpoints sit behind the **existing session-token gate** (same `_SESSION_HEADER_NAME` check as every other `/api/learning/*` route); no new auth surface.
- No new dependencies, no new environment variables, no telemetry.
- Provider access is read-only; materialize and cross-insert write only through validated seams (`SessionDB.import_sessions`; `get_hermes_home()/memories/MEMORY.md` — never a hardcoded path).
- `/recall` output is explicitly framed as reference data (not instructions) to keep prompt-injection surface at zero.

## Platforms tested

macOS (daily-driver, Apple Silicon) for the full interactive path; Linux/Windows covered by CI (`run_tests.sh`, `tsc`, vitest) — no platform-specific code paths added (`check-windows-footguns.py` clean).

## Compatibility

- Providers that don't implement the new hooks: **zero behavior change** (ABC defaults).
- Existing share codes (v3) decode unchanged; new codes are v4.
- Single-profile star map is the default; multi-profile merge activates only when more than one bot is selected (backwards compatible — a node without a `profile` tag renders exactly as before).
- No schema/config migrations. `memory:<source>:<index>` node ids remain stable for existing file memories (append-after invariant is tested).

---

## Suggestion for maintainers: a coordination / deconfliction layer

Cross-profile insert (above) lets one bot's memories and conclusions flow into another bot's store. The moment two bots — or two concurrent sessions — can write into shared or each-other's memory, you inherit a coordination problem: who is editing what, and how do you keep two agents from clobbering the same `MEMORY.md`, skill, or cron store. Hermes currently has **no built-in cross-session collision detection** for those stores.

I've been running a small **advisory coordination / deconfliction layer** for exactly this: a shared SQLite "claim board" where concurrent sessions, subagents, and cron jobs announce what they're touching, wait politely when a resource is held, and hand off on release — with human-set priority, checkpoint-safe preemption, release-boundary fencing, and a zero-token fail-open cron guard. Its latest leg is specifically **inter-bot deconfliction** for Bot Mode profiles, which pairs naturally with the cross-profile memory flow this PR introduces.

If a coordination/deconfliction primitive is of interest as a companion to cross-profile memory, it might be worth considering for upstream:

- **[`P2ppyJack/session-coord`](https://github.com/P2ppyJack/session-coord)** (MIT) — see [§3.16 inter-bot deconfliction](https://github.com/P2ppyJack/session-coord#316-bots-concurrent-named-agents-and-inter-bot-deconfliction).

Happy to open a separate PR/discussion if that's a direction you'd want to take.


---

## Applying this patch

```bash
git clone https://github.com/NousResearch/hermes-agent.git
git clone https://github.com/P2ppyJack/journey-starmap.git
cd hermes-agent
bash ../journey-starmap/patches/apply.sh     # 3-way apply of full.patch
```

The patch set was generated against hermes-agent `main` @ `987064caa4f8845f605ac7346fed5b72fddfb21c`. If your checkout
has diverged, prefer the five individual patches in `patches/` (0001–0005) with
`git apply --3way` per patch, resolving conflicts in order. After applying, run
hermes-agent's test suite (`tests/agent/test_learning_*.py`,
`tests/plugins/memory/test_honcho_journey_cards.py`, plus the desktop starmap
vitest suite) to verify.

## Repository layout

| Path | Contents |
|---|---|
| `patches/0001-*.patch` … `0005-*.patch` | The 5 feature commits, in order (git format-patch) |
| `patches/full.patch` | Combined diff, `987064caa4f8845f605ac7346fed5b72fddfb21c..b2de4de4aa7901f6f4dc9c0b91f1e6fd3c375cd2` |
| `patches/apply.sh` | One-command apply helper |
| `patches/SOURCE.txt` | Provenance: base/head SHAs, upstream PR, regeneration commands |
| `docs/screenshots/` | Publication-safe feature screenshots (synthetic sandbox) |
| `README.md` | This file |
| `LICENSE` | MIT © 2026 Tobias Musser |

## License & attribution

MIT — see [LICENSE](LICENSE). The patch and documentation are © 2026 Tobias Musser.
This work applies to and incorporates portions of
[hermes-agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research,
MIT-licensed — upstream retains its copyright; this mirror claims only the authored
changes.

*The canonical, always-current copy of this feature remains the upstream PR
([#70309](https://github.com/NousResearch/hermes-agent/pull/70309)) and its fork
branch — this repository is a curated snapshot, refreshed on request.*
