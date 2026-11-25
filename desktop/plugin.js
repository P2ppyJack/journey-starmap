// src/entry.tsx
import {
  atom as atom2,
  host as host4,
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  usePluginI18n as usePluginI18n2,
  useValue as useValue2
} from "@hermes/plugin-sdk";

// src/shims/nanostores.ts
import { atom, computed } from "@hermes/plugin-sdk";

// src/api/client.ts
var $apiRequestScope = atom({ profile: void 0 });
function setRequestScope(scope) {
  $apiRequestScope.set(scope);
}

// src/shims/nanostores-react.ts
import { useValue } from "@hermes/plugin-sdk";
function useStore(store) {
  return useValue(store);
}

// src/app/starmap/index.tsx
import { host as host3 } from "@hermes/plugin-sdk";
import { useEffect as useEffect9, useState as useState9 } from "react";

// src/hermes.ts
var rest = null;
function configureApi(next) {
  rest = next;
}
function call(path, options) {
  if (!rest) {
    return Promise.reject(new Error("journey-starmap: backend door not configured"));
  }
  return rest(path, options);
}
function profileOf(scope) {
  if (!scope) {
    return void 0;
  }
  const name = typeof scope === "string" ? scope : scope.profile;
  const trimmed = String(name ?? "").trim();
  return trimmed || void 0;
}
function qs(params) {
  const parts = Object.entries(params).filter(([, value]) => value !== void 0 && value !== "").map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}
function failure(payload, fallback) {
  return new Error(String(payload?.message || payload?.detail || payload?.error || fallback));
}
async function getStarmapGraph(scope) {
  const profile = profileOf(scope);
  const payload = await call(`/graph${qs({ profile })}`);
  if (!payload || payload.graph == null) {
    throw failure(payload, "the graph route failed");
  }
  return payload.graph;
}
async function getStarmapGraphMultiProfile(profiles, scope) {
  const payload = await call(`/graph${qs({ profiles: profiles.join(",") })}`);
  if (!payload || payload.graph == null) {
    throw failure(payload, "the multi-profile graph route failed");
  }
  return payload.graph;
}
async function getLearningNode(id, scope) {
  const payload = await call(`/node/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`);
  if (payload?.ok === false) {
    throw failure(payload, "could not load that node");
  }
  return { ...payload?.node ?? {}, ...payload };
}
async function editLearningNode(id, content, scope) {
  const payload = await call(`/node/${encodeURIComponent(id)}`, {
    body: { content, profile: profileOf(scope) },
    method: "PUT"
  });
  return payload?.ok === false ? { message: String(payload.message || payload.error || "edit failed"), ok: false } : { ok: true };
}
async function deleteLearningNode(id, scope) {
  const payload = await call(`/node/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`, { method: "DELETE" });
  return payload?.ok === false ? { message: String(payload.message || payload.error || "delete failed"), ok: false } : { ok: true };
}
async function getLearningRecallDraft(id, scope) {
  return call(`/recall-draft${qs({ id, profile: profileOf(scope) })}`);
}
async function crossInsertLearningNode(id, sourceProfile, targetProfile, _scope) {
  const payload = await call("/node/cross-insert", {
    body: { id, source_profile: sourceProfile, target_profile: targetProfile },
    method: "POST"
  });
  return payload?.ok === false ? { message: String(payload.message || payload.error || "cross-profile insert failed"), ok: false } : { ok: true };
}
async function getLearningProviderSession(sessionId, scope) {
  const payload = await call(`/provider-session${qs({ session_id: sessionId, profile: profileOf(scope) })}`);
  if (payload?.ok === false) {
    throw failure(payload, "could not load the source data");
  }
  return { messages: Array.isArray(payload?.messages) ? payload.messages : [] };
}
async function materializeLearningProviderSession(sessionId, scope) {
  const payload = await call("/materialize", {
    body: { profile: profileOf(scope), session_id: sessionId },
    method: "POST"
  });
  if (payload?.ok === false) {
    throw failure(payload, "could not recreate the conversation");
  }
  return { session_id: String(payload.session_id) };
}
async function getSession(id, scope) {
  const payload = await call(`/session/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`);
  if (payload?.ok === false) {
    throw failure(payload, "session not found");
  }
  return payload;
}
async function searchSessions(q, scope) {
  const payload = await call(`/sessions/search${qs({ limit: 12, profile: profileOf(scope), q })}`);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return { results };
}
async function listRecentSessions(limit, scope) {
  const payload = await call(`/sessions/recent${qs({ limit, profile: profileOf(scope) })}`);
  const rows = Array.isArray(payload?.sessions) ? payload.sessions : [];
  return rows.map((row) => ({
    _lineage_root_id: row._lineage_root_id ?? row.lineage_root_id ?? void 0,
    id: String(row.id ?? ""),
    title: row.title ?? ""
  }));
}

// src/store/session.ts
var $sessions = atom([]);
async function refreshRecentSessions(profile) {
  try {
    const rows = await listRecentSessions(5, profile ? { profile } : void 0);
    $sessions.set(rows);
    return rows;
  } catch {
    $sessions.set([]);
    return [];
  }
}
function sessionTitle(row) {
  const title = String(row.title ?? "").trim();
  return title || row.id;
}

// src/store/notifications.ts
import { host } from "@hermes/plugin-sdk";
function notify(input) {
  try {
    host.notify(input);
  } catch {
  }
}
function notifyError(error, fallbackMessage) {
  try {
    ;
    host.notifyError?.(error, fallbackMessage);
  } catch {
    notify({ kind: "error", message: fallbackMessage || String(error) });
  }
}

// src/store/profile.ts
import { host as host2 } from "@hermes/plugin-sdk";
var $profiles = atom([]);
var $activeProfile = atom("default");
var $activeGatewayProfile = atom("default");
function normalizeProfileKey(name) {
  return (name ?? "").trim() || "default";
}
function profileLabel(profile) {
  return String(profile.label ?? profile.name ?? profile.key ?? "default");
}
async function refreshProfiles() {
  try {
    const result = await host2.profiles?.list?.();
    const list = Array.isArray(result?.profiles) ? result.profiles : [];
    $profiles.set(list);
  } catch {
    $profiles.set([]);
  }
}
function requestFreshSession() {
  try {
    ;
    host2.newChat?.();
  } catch {
  }
}
function syncProfileState(profile) {
  const key = normalizeProfileKey(profile);
  $activeProfile.set(key);
  $activeGatewayProfile.set(key);
}

// src/store/composer.ts
var drafts = /* @__PURE__ */ new Map();
function stashSessionDraft(key, text, attachments = []) {
  drafts.set(key, { attachments, text });
}
function takeSessionDraft(key) {
  const draft = drafts.get(key) ?? { attachments: [], text: "" };
  drafts.delete(key);
  return draft;
}

// src/store/starmap.ts
var $starmapGraph = atom(null);
var $starmapLoading = atom(false);
var $starmapError = atom(null);
var $starmapRecallMode = atom(false);
var SELECTED_PROFILES_KEY = "hermes.plugin.journey-starmap.selectedProfiles";
function readSelection() {
  try {
    const raw = window.localStorage.getItem(SELECTED_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}
var $starmapSelectedProfiles = atom(readSelection());
$starmapSelectedProfiles.listen((value) => {
  try {
    window.localStorage.setItem(SELECTED_PROFILES_KEY, JSON.stringify(value));
  } catch {
  }
  resetStarmapGraph();
});
var inflight = null;
var epoch = 0;
function resetStarmapGraph() {
  epoch += 1;
  inflight = null;
  $starmapGraph.set(null);
  $starmapLoading.set(false);
  $starmapError.set(null);
}
function toggleStarmapProfile(profile, enabled) {
  const key = normalizeProfileKey(profile);
  const current = $starmapSelectedProfiles.get();
  const next = enabled ? [.../* @__PURE__ */ new Set([...current, key])] : current.filter((item) => item !== key);
  $starmapSelectedProfiles.set(next);
}
async function loadStarmapGraph(force = false) {
  if (inflight) {
    return inflight;
  }
  if ($starmapGraph.get() && !force) {
    return;
  }
  $starmapLoading.set(true);
  $starmapError.set(null);
  const started = epoch;
  inflight = (async () => {
    try {
      const selected = $starmapSelectedProfiles.get();
      const scope = $apiRequestScope.get();
      const owner = { ...scope, profile: selected[0] ?? scope.profile };
      const graph = selected.length > 1 ? await getStarmapGraphMultiProfile(selected, owner) : await getStarmapGraph(owner);
      if (started === epoch) {
        $starmapGraph.set(graph);
      }
    } catch (error) {
      if (started === epoch) {
        $starmapError.set(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (started === epoch) {
        $starmapLoading.set(false);
        inflight = null;
      }
    }
  })();
  return inflight;
}
function watchStarmapGraph() {
  void loadStarmapGraph();
  const offScope = $apiRequestScope.listen(() => {
    resetStarmapGraph();
    void loadStarmapGraph();
  });
  return offScope;
}
function clearStarmapRecall() {
  $starmapRecallMode.set(false);
}
function evictStarmapNode(id) {
  const graph = $starmapGraph.get();
  if (!graph) {
    return () => {
    };
  }
  const previous = graph;
  const nodes = (graph.nodes ?? []).filter((node) => node.id !== id);
  const edges = (graph.edges ?? []).filter((edge) => edge.source !== id && edge.target !== id);
  $starmapGraph.set({ ...graph, edges, nodes });
  return () => $starmapGraph.set(previous);
}

// src/app/starmap/collapse.ts
var COLLAPSE_KEY = "hermes.plugin.journey-starmap.collapse";
function isConclusion(node) {
  return node.kind === "memory" && String(node.memorySource ?? "").toLowerCase() === "honcho";
}
function fingerprintOf(node) {
  const parts = String(node.id).split(":");
  return parts.length > 1 ? parts[parts.length - 1] : String(node.id);
}
function collapseIdentical(graph) {
  const totals = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) {
    if (!isConclusion(node)) {
      continue;
    }
    const fingerprint = fingerprintOf(node);
    totals.set(fingerprint, (totals.get(fingerprint) ?? 0) + 1);
  }
  const kept = /* @__PURE__ */ new Set();
  const nodes = [];
  const repeated = /* @__PURE__ */ new Set();
  let hidden = 0;
  for (const node of graph.nodes) {
    if (!isConclusion(node)) {
      nodes.push(node);
      continue;
    }
    const fingerprint = fingerprintOf(node);
    const count = totals.get(fingerprint) ?? 1;
    if (count > 1 && kept.has(fingerprint)) {
      hidden += 1;
      continue;
    }
    kept.add(fingerprint);
    if (count > 1) {
      repeated.add(fingerprint);
      nodes.push({ ...node, label: `${node.label} \xB7\xD7${count}` });
    } else {
      nodes.push(node);
    }
  }
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  return { graph: { ...graph, edges, nodes }, hidden, texts: repeated.size };
}

// src/app/starmap/recall.ts
function learningNodeScope(node) {
  return node.connectionId ? { connectionId: node.connectionId, profile: node.profile } : node.profile;
}
function resolveRecallTarget(node) {
  const id = node._originalId ?? (node.profile && node.id.startsWith(`${node.profile}:`) ? node.id.slice(node.profile.length + 1) : node.id);
  return node.profile ? { id, profile: node.profile } : { id };
}

// src/app/starmap/star-map.tsx
import { useCallback as useCallback2, useEffect as useEffect8, useMemo as useMemo5, useRef as useRef5, useState as useState8 } from "react";

// src/hooks/use-theme-epoch.ts
import { useEffect, useState } from "react";
var ATTRS = ["class", "style", "data-hermes-mode", "data-hermes-theme"];
var listeners = /* @__PURE__ */ new Set();
var observer = null;
function themeStyle(style) {
  let snapshot = "";
  for (let i = 0; i < style.length; i += 1) {
    const name = style.item(i);
    if (name === "--workspace-left" || name === "--workspace-right" || name === "--glass-rail-edge") {
      continue;
    }
    snapshot += `${name}:${style.getPropertyValue(name)}${style.getPropertyPriority(name) ? " !important" : ""};`;
  }
  return snapshot;
}
function onThemeRepaint(fn) {
  if (!observer && typeof document !== "undefined") {
    const root = document.documentElement;
    let previousStyle = themeStyle(root.style);
    observer = new MutationObserver((records) => {
      const nextStyle = themeStyle(root.style);
      const customCSS = document.getElementById("hermes-desktop-custom-css")?.textContent;
      const repaint = Boolean(customCSS) || nextStyle !== previousStyle || records.some((record) => record.attributeName !== "style");
      previousStyle = nextStyle;
      if (repaint) {
        listeners.forEach((listener) => listener());
      }
    });
    observer.observe(root, { attributeFilter: ATTRS, attributes: true });
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}
function useThemeEpoch() {
  const [epoch2, setEpoch] = useState(0);
  useEffect(() => onThemeRepaint(() => setEpoch((e) => e + 1)), []);
  return epoch2;
}

// src/shims/i18n.ts
import { usePluginI18n } from "@hermes/plugin-sdk";
var EN = {
  starmap: {
    title: "Memory Graph",
    subtitle: (nodes, clusters) => `${nodes} skills across ${clusters} categories`,
    close: "Close memory graph",
    refresh: "Refresh",
    memory: "Memory",
    filterAll: "All",
    filterUsed: "Used",
    filterLearned: "Learned",
    viewGraph: "Graph",
    loadFailed: "Could not load memory graph",
    loading: "Loading\u2026",
    emptyTitle: "Nothing learned yet",
    emptyDesc: "As Hermes builds skills and memories for your work, they appear here.",
    share: "Share map",
    shareHint: "Copy the code to share this map, or paste one to load. It only includes the layout, not your memory or skill text.",
    shareTitle: "Import / export map",
    sharePlaceholder: "Paste a map code\u2026",
    copy: "Copy map code",
    copied: "Copied!",
    importMap: "Import a map",
    importBtn: "Load",
    importEmpty: "Paste a map code to load it.",
    importSuccess: (nodes) => `Loaded a map with ${nodes} ${nodes === 1 ? "node" : "nodes"}.`,
    importedBadge: "imported map",
    resetToMine: "Back to my map",
    sessionsTitle: "Where this came from",
    sessionsLoading: "Finding sessions\u2026",
    sessionsEmpty: "No matching sessions found in this profile\u2019s history.",
    sessionsProviderOnly: "This entry came from the memory provider\u2019s own history (e.g. imported conversations) \u2014 no Hermes session matches it. Use \u201CView source data\u201D to read the original.",
    sessionsSearchNote: "No recorded origin for this node \u2014 showing sessions matched by content search.",
    openSession: "Open session",
    viewSource: "View source data",
    sourceTitle: "Source data",
    sourceLoading: "Loading source data\u2026",
    sourceEmpty: "Source data unavailable \u2014 the memory backend is unreachable or no longer holds this session.",
    backToSessions: "Back",
    provenanceMenu: "Where this came from\u2026",
    providerReadOnly: (provider) => `Read-only \u2014 managed by the ${provider} memory provider`,
    recreate: "Recreate as Hermes session",
    recreating: "Recreating\u2026",
    recreateFailed: "Couldn\u2019t recreate the conversation",
    searchTitle: "Search memories & skills",
    searchPlaceholder: "Search\u2026",
    searchRecent: "Recent",
    searchSaved: "Saved",
    searchSave: "Save this search",
    searchDeleteSaved: "Delete saved search",
    searchFiltersOnly: "(filters only)",
    searchKind: "Type",
    searchKindAll: "All types",
    searchKindSkills: "skills",
    searchSource: "Source",
    searchSourceAll: "All sources",
    searchSourceHermes: "Hermes",
    searchSourceImported: (source) => `imported: ${source}`,
    searchFrom: "From date",
    searchTo: "To date",
    searchCount: (n) => `${n} ${n === 1 ? "result" : "results"}`,
    searchEmpty: "Nothing matches this search.",
    // Filter enhancement (dedicated filter icon, date modes, conclusions).
    filterTitle: "Filter",
    filterShowing: (shown, total) => `Showing ${shown} of ${total}`,
    filterClear: "Clear",
    dateModeLabel: "Date filter",
    dateModeRange: "Custom range",
    dateModeYear: "Year",
    dateModeYearMonth: "Year / month",
    dateYearAny: "Any year",
    dateMonthLabel: "Month",
    dateMonthAny: "Any month",
    conclusion: "conclusion",
    conclusions: "conclusions",
    conclusionStartConversation: "Start a conversation about this\u2026",
    conclusionSeedPrompt: (text) => `I want to talk about something you've concluded about me:

> ${text}

`,
    recallIntoChat: "Insert into this chat",
    addToSession: "Add to a session",
    addToSessionDone: (title) => `Added to "${title}" \u2014 open it to review and send.`,
    recallFailed: "Could not load that memory to insert.",
    // Multi-profile mode (bot memory consolidation)
    profileSelector: "Select bots",
    profileSelectorHint: "Check bots to include their memories and skills on this map.",
    profileAll: "All bots",
    profileNone: "No bots selected",
    profileCount: (n) => `${n} ${n === 1 ? "bot" : "bots"} selected`,
    profileBadge: (name) => name,
    insertIntoProfile: (name) => `Insert into ${name}`,
    insertIntoAllSelected: "Insert into all selected bots",
    insertIntoProfileDone: (name) => `Inserted into ${name}'s memory.`,
    insertIntoAllDone: (n) => `Inserted into ${n} ${n === 1 ? "bot" : "bots"}.`,
    crossProfileInsertFailed: "Could not insert into that bot's memory."
  }
};
function useI18n() {
  return { locale: "en", t: EN };
}

// src/shims/icons.ts
import { icons } from "@hermes/plugin-sdk";
var Bookmark = icons.Bookmark;
var BookmarkFilled = icons.BookmarkFilled;
var Check = icons.Check;
var ChevronDown = icons.ChevronDown;
var Search = icons.Search;
var SlidersHorizontal = icons.SlidersHorizontal;
var Trash2 = icons.Trash2;
var Upload = icons.Upload;
var Users = icons.Users;
var X = icons.X;

// src/lib/renderer-loop-pause.ts
function createRendererLoopPauseController(onChange, { pauseWhenUnfocused = false } = {}) {
  let windowPaused = false;
  let windowFocused = document.hasFocus();
  const onVisibilityChange = () => onChange();
  const onBlur = () => {
    if (windowFocused) {
      windowFocused = false;
      onChange();
    }
  };
  const onFocus = () => {
    if (!windowFocused) {
      windowFocused = true;
      onChange();
    }
  };
  const offWindowState = window.hermesDesktop?.onWindowStateChanged?.((payload) => {
    const next = payload?.isMinimized === true || payload?.isVisible === false;
    if (windowPaused === next) {
      return;
    }
    windowPaused = next;
    onChange();
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (pauseWhenUnfocused) {
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
  }
  return {
    dispose: () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      offWindowState?.();
    },
    isPaused: () => document.visibilityState === "hidden" || pauseWhenUnfocused && !windowFocused || windowPaused
  };
}

// src/lib/trackpad-gestures.ts
function isSmartZoomWheel(e) {
  return e.ctrlKey && e.deltaX === 0 && e.deltaY === 0;
}
var DOUBLE_TAP_MS = 300;
function createDoubleTapDetector(thresholdMs = DOUBLE_TAP_MS) {
  let last = 0;
  return (now2 = Date.now()) => {
    if (now2 - last < thresholdMs) {
      last = 0;
      return true;
    }
    last = now2;
    return false;
  };
}

// src/app/starmap/constants.ts
var RING_INNER = 58;
var RING_OUTER = 340;
var ZOOM_MIN = 0.3;
var ZOOM_MAX = 5;
var FIT_PADDING = 80;
var TILT = 1;
var RING_STEPS = 4;
var WHITE = { b: 255, g: 255, r: 255 };
var BLACK = { b: 0, g: 0, r: 0 };
var AGE_GRADIENT = { mid: 0.52, midInk: 0.74, newInk: 0.95, oldInk: 0.42, reach: 1 };
var NODE_SHAPE = { memory: "diamond", skill: "circle" };
var ORB_DARKEN = 0.3;
var WHITEISH_SHEEN = 0.95;
var LIT_BAND_ALPHA = 0.04;
var MODE_DEFAULTS = {
  dark: {
    lineAlpha: 0.24,
    lineDash: 1.5,
    lineDashed: true,
    lineWidth: 0.5,
    ringAlpha: 0.1,
    ringDash: 4,
    ringDashed: false,
    ringWidth: 1.5
  },
  light: {
    lineAlpha: 0.18,
    lineDash: 1.5,
    lineDashed: true,
    lineWidth: 0.5,
    ringAlpha: 0.06,
    ringDash: 4,
    ringDashed: false,
    ringWidth: 2
  }
};
var RING_PARAMS = {
  dark: { bandAlpha: 0.01, lightSize: 0.64, ringAlpha: 0.06, sheen: 0.12 },
  light: { bandAlpha: 0.03, lightSize: 0.27, ringAlpha: 0.028, sheen: 0.1 }
};

// src/app/starmap/geometry.ts
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function hash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function nodeRadius(n) {
  if (n.kind === "memory") {
    return 4.4;
  }
  const base = n.state === "archived" || n.state === "stale" ? 2.4 : 3;
  return base + Math.sqrt(Math.max(0, n.useCount)) * 0.55 + (n.pinned ? 0.8 : 0);
}
function recencyInk(rec) {
  const reach = Math.max(0.01, AGE_GRADIENT.reach);
  const mid = clamp(AGE_GRADIENT.mid, 0.01, 0.99);
  const t = clamp(rec / reach, 0, 1);
  if (t <= mid) {
    const p2 = t / mid;
    return AGE_GRADIENT.oldInk + (AGE_GRADIENT.midInk - AGE_GRADIENT.oldInk) * (p2 * p2 * (3 - 2 * p2));
  }
  const p = (t - mid) / (1 - mid);
  return AGE_GRADIENT.midInk + (AGE_GRADIENT.newInk - AGE_GRADIENT.midInk) * (p * p * (3 - 2 * p));
}
function shapePath(ctx, shape, x3, y3, r) {
  ctx.beginPath();
  if (shape === "square") {
    ctx.rect(x3 - r, y3 - r, r * 2, r * 2);
    return;
  }
  if (shape === "circle") {
    ctx.arc(x3, y3, r, 0, Math.PI * 2);
    return;
  }
  const pts = shape === "diamond" ? 4 : shape === "triangle" ? 3 : 6;
  const rot = shape === "hexagon" ? Math.PI / 6 : -Math.PI / 2;
  for (let i = 0; i < pts; i += 1) {
    const a2 = rot + i / pts * Math.PI * 2;
    const px = x3 + Math.cos(a2) * r;
    const py = y3 + Math.sin(a2) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}
function fitViewport(w, h, outer = RING_OUTER) {
  if (w <= 0 || h <= 0) {
    return { k: 1, x: w / 2, y: h / 2 };
  }
  const kFor = (r) => {
    const spanX = (r + 30) * 2;
    return Math.min((w - FIT_PADDING * 2) / spanX, (h - FIT_PADDING * 2) / (spanX * TILT), 2.2);
  };
  const k = clamp(Math.max(kFor(outer), kFor(RING_OUTER)), ZOOM_MIN, ZOOM_MAX);
  return { k, x: w / 2, y: h / 2 + h * 0.05 };
}
function radiusForRecency(rec, outer = RING_OUTER) {
  return RING_INNER + rec * (outer - RING_INNER);
}
var fitScale = (w, h, rings) => fitViewport(w, h, rings.at(-1)?.r ?? RING_OUTER).k;
function distToSegmentSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1) : 0;
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return (px - cx) ** 2 + (py - cy) ** 2;
}

// src/app/starmap/color.ts
var _probe = null;
function resolveRgb(color) {
  if (!_probe) {
    const c2 = document.createElement("canvas");
    c2.width = 1;
    c2.height = 1;
    _probe = c2.getContext("2d", { willReadFrequently: true });
  }
  if (!_probe) {
    return { b: 184, g: 163, r: 148 };
  }
  _probe.clearRect(0, 0, 1, 1);
  _probe.fillStyle = "#888888";
  _probe.fillStyle = color;
  _probe.fillRect(0, 0, 1, 1);
  const d = _probe.getImageData(0, 0, 1, 1).data;
  return { b: d[2], g: d[1], r: d[0] };
}
function rgba(c2, a2) {
  return `rgba(${c2.r},${c2.g},${c2.b},${a2})`;
}
function mixRgb(a2, b, t) {
  const p = clamp(t, 0, 1);
  return {
    b: Math.round(a2.b + (b.b - a2.b) * p),
    g: Math.round(a2.g + (b.g - a2.g) * p),
    r: Math.round(a2.r + (b.r - a2.r) * p)
  };
}
function darken(c2, amount) {
  return mixRgb(c2, BLACK, amount);
}
function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.114 * b) / 255;
}
function rgbToHsl(c2) {
  const r = c2.r / 255;
  const g = c2.g / 255;
  const b = c2.b / 255;
  const max2 = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max2 + min) / 2;
  const d = max2 - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max2 - min) : d / (max2 + min);
    h = (max2 === r ? (g - b) / d + (g < b ? 6 : 0) : max2 === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const hue = (h % 360 + 360) % 360;
  const c2 = (1 - Math.abs(2 * l - 1)) * s;
  const x3 = c2 * (1 - Math.abs(hue / 60 % 2 - 1));
  const m2 = l - c2 / 2;
  const [r, g, b] = hue < 60 ? [c2, x3, 0] : hue < 120 ? [x3, c2, 0] : hue < 180 ? [0, c2, x3] : hue < 240 ? [0, x3, c2] : hue < 300 ? [x3, 0, c2] : [c2, 0, x3];
  return { b: Math.round((b + m2) * 255), g: Math.round((g + m2) * 255), r: Math.round((r + m2) * 255) };
}
function complementaryInk(c2) {
  const [h, s, l] = rgbToHsl(c2);
  return hslToRgb(h + 165, Math.max(s, 0.5), clamp(l, 0.5, 0.7));
}
function memoryInkFor(primary, bg) {
  return mixRgb(complementaryInk(primary), bg, 0.45);
}
function conclusionInkFor(primary) {
  const [h, s, l] = rgbToHsl(primary);
  return hslToRgb(h + 55, Math.max(s, 0.7), clamp(l, 0.55, 0.72));
}
function computePalette(canvas) {
  const style = getComputedStyle(canvas);
  const fg = resolveRgb(style.color);
  const darkTheme = luminance(fg.r, fg.g, fg.b) > 0.55;
  const base = darkTheme ? { b: 255, g: 255, r: 255 } : { b: 0, g: 0, r: 0 };
  const primary = resolveRgb(style.getPropertyValue("--theme-primary").trim() || style.color);
  const bg = resolveRgb(
    style.getPropertyValue("--background").trim() || style.getPropertyValue("--dt-background").trim() || (darkTheme ? "#000" : "#fff")
  );
  return {
    // Band tint derives from the theme primary so rings read consistently in
    // both modes (foreground ink would go white on dark / black on light).
    bandInk: mixRgb(primary, base, darkTheme ? 0.3 : 0),
    base,
    bg,
    c: MODE_DEFAULTS[darkTheme ? "dark" : "light"],
    chipBg: darkTheme ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)",
    darkTheme,
    inkInv: darkTheme ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)",
    conclusionInk: conclusionInkFor(primary),
    memoryInk: memoryInkFor(primary, bg),
    primary,
    skillInk: mixRgb(primary, base, darkTheme ? 0.12 : 0.18)
  };
}

// src/app/starmap/context-menu-handle.ts
var handles = /* @__PURE__ */ new WeakMap();
function registerStarMapContextMenu(canvas, handle) {
  handles.set(canvas, handle);
  return () => {
    if (handles.get(canvas) === handle) {
      handles.delete(canvas);
    }
  };
}

// src/app/starmap/memory-cards.ts
function memoryCardsByNodeId(graph) {
  const cards = /* @__PURE__ */ new Map();
  const indices = /* @__PURE__ */ new Map();
  for (const card of graph.memory) {
    const profile = card.profile ?? "";
    const index2 = indices.get(profile) ?? 0;
    indices.set(profile, index2 + 1);
    const id = `${profile ? `${profile}:` : ""}memory:${card.source}:${index2}`;
    cards.set(id, card);
    if (card.fingerprint) {
      cards.set(`${id}:${card.fingerprint}`, card);
    }
  }
  return cards;
}

// src/app/starmap/node-context-menu.tsx
import { useRef as useRef2, useState as useState3 } from "react";

// src/app/learning/archive-skill-confirm-dialog.tsx
import { ConfirmDialog } from "@hermes/plugin-sdk";
import { jsx } from "react/jsx-runtime";
var ARCHIVE_SKILL_DESCRIPTION = "The skill is archived and can be restored with `hermes curator restore`.";
async function archiveLearningSkill(id, profile) {
  const res = await deleteLearningNode(id, profile);
  if (!res.ok) {
    throw new Error(res.message || "Archive failed");
  }
}
function fireOptimistic(action, rollback, onFailure) {
  void action.catch((err2) => {
    rollback();
    onFailure(err2);
  });
}
function notifySkillArchived() {
  notify({ kind: "success", message: "Skill archived.", title: "Skill archived" });
}
function ArchiveSkillConfirmDialog({
  onApply,
  onClose,
  onFailure,
  onSuccess,
  open,
  profile,
  skillId,
  skillName
}) {
  return /* @__PURE__ */ jsx(
    ConfirmDialog,
    {
      confirmLabel: "Archive",
      description: ARCHIVE_SKILL_DESCRIPTION,
      destructive: true,
      dismissOnConfirm: true,
      onClose,
      onConfirm: () => {
        const rollback = onApply();
        fireOptimistic(
          archiveLearningSkill(skillId, profile).then(() => {
            notifySkillArchived();
            onSuccess?.();
          }),
          rollback,
          (err2) => onFailure?.(err2, skillName)
        );
      },
      open,
      title: `Archive ${skillName}?`
    }
  );
}

// src/components/chat/code-editor.tsx
import { Textarea } from "@hermes/plugin-sdk";
import { useEffect as useEffect2, useState as useState2 } from "react";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function CodeEditor({
  filePath,
  initialValue,
  onChange
}) {
  const [value, setValue] = useState2(initialValue);
  useEffect2(() => {
    setValue(initialValue);
  }, [initialValue]);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 flex-col gap-1", children: [
    filePath ? /* @__PURE__ */ jsx2("div", { className: "text-[0.68rem] text-(--ui-text-tertiary)", children: filePath }) : null,
    /* @__PURE__ */ jsx2(
      Textarea,
      {
        className: "min-h-0 flex-1 font-mono text-xs",
        onChange: (event) => {
          setValue(event.target.value);
          onChange?.(event.target.value);
        },
        value
      }
    )
  ] });
}

// src/shims/ui.tsx
import {
  Button,
  Codicon,
  ConfirmDialog as ConfirmDialog2,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Textarea as Textarea2
} from "@hermes/plugin-sdk";
import { cn } from "@hermes/plugin-sdk";
import { jsx as jsx3 } from "react/jsx-runtime";
function DropdownMenuLabel({
  className,
  children,
  ...rest2
}) {
  return /* @__PURE__ */ jsx3("div", { className: cn("px-2 py-1.5 text-xs font-medium text-(--ui-text-tertiary)", className), ...rest2, children });
}

// src/hooks/use-on-profile-switch.ts
import { useEffect as useEffect3, useRef } from "react";
function useOnProfileSwitch(onSwitch) {
  const profile = useStore($activeGatewayProfile);
  const previous = useRef(profile);
  useEffect3(() => {
    if (previous.current === profile) {
      return;
    }
    previous.current = profile;
    onSwitch();
  }, [profile]);
}

// src/app/starmap/sources.ts
var isProviderSource = (source) => Boolean(source && source !== "memory" && source !== "profile");

// src/app/starmap/node-context-menu.tsx
import { Fragment, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function CrossProfileTargets({
  onInsertIntoProfile,
  target
}) {
  const { t } = useI18n();
  const profiles = useStore($profiles);
  const selectedProfiles = useStore($starmapSelectedProfiles);
  const targets = Array.isArray(profiles) && Array.isArray(selectedProfiles) ? profiles.filter((profile) => {
    const key = normalizeProfileKey(profile.name);
    return selectedProfiles.includes(key) && key !== target.profile;
  }) : [];
  if (targets.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    targets.length > 1 ? /* @__PURE__ */ jsx4(
      DropdownMenuItem,
      {
        className: "font-medium",
        onSelect: () => {
          targets.forEach((profile) => onInsertIntoProfile(target, normalizeProfileKey(profile.name)));
        },
        children: t.starmap.insertIntoAllSelected
      }
    ) : null,
    targets.map((profile) => /* @__PURE__ */ jsx4(
      DropdownMenuItem,
      {
        className: "max-w-64",
        onSelect: () => onInsertIntoProfile(target, normalizeProfileKey(profile.name)),
        title: profileLabel(profile),
        children: /* @__PURE__ */ jsx4("span", { className: "truncate", children: t.starmap.insertIntoProfile(profileLabel(profile)) })
      },
      normalizeProfileKey(profile.name)
    ))
  ] });
}
function NodeContextMenu({
  onAddToSession,
  onClose,
  onInsertIntoProfile,
  onNodeRemoved,
  onRecallIntoChat,
  onShowProvenance,
  onStartConversation,
  recentSessions,
  target
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState3(null);
  const [deleting, setDeleting] = useState3(null);
  const [loading, setLoading] = useState3(false);
  const [saving, setSaving] = useState3(false);
  const [error, setError] = useState3(null);
  const editEpoch = useRef2(0);
  useOnProfileSwitch(() => {
    editEpoch.current += 1;
    setEditing(null);
    setDeleting(null);
    setError(null);
  });
  const noun = target?.kind === "memory" ? "memory" : "skill";
  const openEdit = async () => {
    if (!target) {
      return;
    }
    const epoch2 = editEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const { id } = resolveRecallTarget(target);
      const scope = learningNodeScope(target);
      const detail = await getLearningNode(id, scope);
      if (editEpoch.current !== epoch2) {
        return;
      }
      setEditing({ content: detail.content, id, label: target.label, scope });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    if (!editing) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await editLearningNode(editing.id, editing.content, editing.scope);
      if (!res.ok) {
        throw new Error(res.message);
      }
      setEditing(null);
      void loadStarmapGraph(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  const menuOpen = target && !editing && !deleting;
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    menuOpen ? /* @__PURE__ */ jsxs2(DropdownMenu, { onOpenChange: (open) => !open && onClose(), open: true, children: [
      /* @__PURE__ */ jsx4(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx4("span", { "aria-hidden": true, style: { left: target.x, position: "fixed", top: target.y } }) }),
      /* @__PURE__ */ jsxs2(DropdownMenuContent, { align: "start", onCloseAutoFocus: (e) => e.preventDefault(), side: "bottom", children: [
        /* @__PURE__ */ jsx4(DropdownMenuLabel, { className: "max-w-56 truncate text-[0.68rem] font-normal text-muted-foreground", children: target.label }),
        onShowProvenance ? /* @__PURE__ */ jsx4(DropdownMenuItem, { onSelect: () => onShowProvenance(target.id), children: t.starmap.provenanceMenu }) : null,
        onRecallIntoChat ? /* @__PURE__ */ jsx4(DropdownMenuItem, { onSelect: () => onRecallIntoChat(target), children: t.starmap.recallIntoChat }) : null,
        onAddToSession && recentSessions && recentSessions.length > 0 ? /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsx4(DropdownMenuLabel, { className: "text-[0.66rem] uppercase tracking-wide text-muted-foreground/70", children: t.starmap.addToSession }),
          recentSessions.map((session) => /* @__PURE__ */ jsx4(
            DropdownMenuItem,
            {
              className: "max-w-64",
              onSelect: () => onAddToSession(target, session.key),
              title: session.title,
              children: /* @__PURE__ */ jsx4("span", { className: "truncate", children: session.title })
            },
            session.key
          ))
        ] }) : null,
        onInsertIntoProfile && target.profile && target.kind === "memory" ? /* @__PURE__ */ jsx4(CrossProfileTargets, { onInsertIntoProfile, target }) : null,
        isProviderSource(target.memorySource) ? /* @__PURE__ */ jsxs2(Fragment, { children: [
          target.isConclusion && onStartConversation ? /* @__PURE__ */ jsx4(DropdownMenuItem, { onSelect: () => onStartConversation(target), children: t.starmap.conclusionStartConversation }) : null,
          /* @__PURE__ */ jsx4(DropdownMenuLabel, { className: "max-w-56 whitespace-normal text-[0.68rem] font-normal text-muted-foreground", children: t.starmap.providerReadOnly(target.memorySource) })
        ] }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsxs2(
            DropdownMenuItem,
            {
              disabled: loading,
              onSelect: (e) => {
                e.preventDefault();
                void openEdit();
              },
              children: [
                "Edit ",
                noun,
                "\u2026"
              ]
            }
          ),
          /* @__PURE__ */ jsx4(
            DropdownMenuItem,
            {
              onSelect: () => setDeleting({ ...target }),
              variant: "destructive",
              children: target.kind === "skill" ? "Archive skill" : "Delete memory"
            }
          )
        ] })
      ] })
    ] }) : null,
    /* @__PURE__ */ jsx4(Dialog, { onOpenChange: (value) => !value && !saving && setEditing(null), open: Boolean(editing), children: /* @__PURE__ */ jsxs2(DialogContent, { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsx4(DialogHeader, { children: /* @__PURE__ */ jsxs2(DialogTitle, { children: [
        "Edit ",
        editing?.label
      ] }) }),
      /* @__PURE__ */ jsx4("div", { className: "h-80", children: editing && /* @__PURE__ */ jsx4(
        CodeEditor,
        {
          filePath: noun === "skill" ? "SKILL.md" : "memory.md",
          framed: true,
          initialValue: editing.content,
          onCancel: () => !saving && setEditing(null),
          onChange: (content) => setEditing((prev) => prev ? { ...prev, content } : prev),
          onSave: () => void save()
        },
        editing.id
      ) }),
      error ? /* @__PURE__ */ jsx4("p", { className: "text-xs text-destructive", children: error }) : null,
      /* @__PURE__ */ jsxs2(DialogFooter, { children: [
        /* @__PURE__ */ jsx4(Button, { disabled: saving, onClick: () => setEditing(null), type: "button", variant: "ghost", children: "Cancel" }),
        /* @__PURE__ */ jsx4(Button, { disabled: saving, onClick: () => void save(), children: saving ? "Saving\u2026" : "Save" })
      ] })
    ] }) }),
    deleting?.kind === "skill" ? /* @__PURE__ */ jsx4(
      ArchiveSkillConfirmDialog,
      {
        onApply: () => {
          onNodeRemoved();
          return evictStarmapNode(deleting.id);
        },
        onClose: () => setDeleting(null),
        onFailure: (err2, name) => notifyError(err2, name),
        open: true,
        profile: learningNodeScope(deleting),
        skillId: resolveRecallTarget(deleting).id,
        skillName: deleting.label
      }
    ) : /* @__PURE__ */ jsx4(
      ConfirmDialog2,
      {
        confirmLabel: "Delete",
        description: "This memory is removed permanently.",
        destructive: true,
        dismissOnConfirm: true,
        onClose: () => setDeleting(null),
        onConfirm: () => {
          if (!deleting) {
            return;
          }
          const { id, label } = deleting;
          const rollback = evictStarmapNode(id);
          onNodeRemoved();
          fireOptimistic(
            deleteLearningNode(resolveRecallTarget(deleting).id, learningNodeScope(deleting)).then((res) => {
              if (!res.ok) {
                throw new Error(res.message);
              }
            }),
            rollback,
            (err2) => notifyError(err2, label)
          );
        },
        open: Boolean(deleting),
        title: `Delete ${deleting?.label ?? ""}?`
      }
    )
  ] });
}

// src/app/starmap/node-sessions-dialog.tsx
import { useEffect as useEffect4, useMemo, useState as useState4 } from "react";

// src/lib/time.ts
var fmtClock = new Intl.DateTimeFormat(void 0, { hour: "numeric", minute: "2-digit" });
var fmtDayTime = new Intl.DateTimeFormat(void 0, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short"
});
var fmtDateTime = new Intl.DateTimeFormat(void 0, { dateStyle: "medium", timeStyle: "short" });
var fmtFullDateTime = new Intl.DateTimeFormat(void 0, { dateStyle: "full", timeStyle: "short" });
var fmtDate = new Intl.DateTimeFormat(void 0, { day: "numeric", month: "short", year: "numeric" });
var fmtMonth = new Intl.DateTimeFormat(void 0, { month: "long" });
var fmtMonthYear = new Intl.DateTimeFormat(void 0, { month: "long", year: "numeric" });
var rtf = new Intl.RelativeTimeFormat(void 0, { numeric: "auto", style: "short" });

// src/app/starmap/node-sessions-dialog.tsx
import { Fragment as Fragment2, jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function fmtTs(ts) {
  if (!ts) {
    return "";
  }
  try {
    return fmtDateTime.format(new Date(ts * 1e3));
  } catch {
    return "";
  }
}
function searchQuery(label) {
  const clean = label.replace(/…$/, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length > 8 ? words.slice(0, 8).join(" ") : clean;
}
function NodeSessionsDialog({
  onClose,
  onOpenSession,
  target
}) {
  const { t } = useI18n();
  const [hits, setHits] = useState4([]);
  const [loading, setLoading] = useState4(false);
  const [corpus, setCorpus] = useState4(null);
  const [corpusLoading, setCorpusLoading] = useState4(false);
  const [showCorpus, setShowCorpus] = useState4(false);
  const [recreating, setRecreating] = useState4(false);
  const ambient = useStore($apiRequestScope);
  const lifetime = useMemo(() => ({
    active: true,
    owner: {
      connectionId: target?.connectionId ?? ambient.connectionId ?? void 0,
      profile: target?.profile ?? ambient.profile ?? void 0
    }
  }), [target, ambient.connectionId, ambient.profile]);
  useEffect4(() => {
    lifetime.active = true;
    const off = $apiRequestScope.listen(() => {
      lifetime.active = false;
    });
    return () => {
      lifetime.active = false;
      off();
    };
  }, [lifetime]);
  const handleClose = () => {
    lifetime.active = false;
    onClose();
  };
  useOnProfileSwitch(handleClose);
  const isProviderNode = Boolean(target?.sessionId) && isProviderSource(target?.memorySource);
  useEffect4(() => {
    setHits([]);
    setCorpus(null);
    setShowCorpus(false);
    setCorpusLoading(false);
    setRecreating(false);
    if (!target) {
      return;
    }
    let stale = false;
    setLoading(true);
    const resolve = async () => {
      const out = [];
      if (target.sessionId) {
        try {
          const s = await getSession(target.sessionId, lifetime.owner);
          out.push({
            direct: true,
            id: s.id,
            started: s.started_at ?? null,
            title: s.title || s.preview || s.id
          });
        } catch {
        }
      }
      if (!stale && lifetime.active && out.length === 0) {
        try {
          const res = await searchSessions(searchQuery(target.label), lifetime.owner);
          for (const r of res.results.slice(0, 12)) {
            out.push({
              direct: false,
              id: r.session_id,
              started: r.session_started,
              title: r.snippet ? r.snippet.replace(/<\/?b>/g, "") : r.session_id
            });
          }
        } catch {
        }
      }
      if (!stale && lifetime.active) {
        setHits(out);
        setLoading(false);
      }
    };
    void resolve();
    return () => {
      stale = true;
    };
  }, [target, lifetime]);
  const openCorpus = async () => {
    if (!target?.sessionId || !lifetime.active) {
      return;
    }
    setShowCorpus(true);
    if (corpus !== null) {
      return;
    }
    setCorpusLoading(true);
    try {
      const res = await getLearningProviderSession(target.sessionId, lifetime.owner);
      if (lifetime.active) {
        setCorpus(res.messages);
      }
    } catch {
      if (lifetime.active) {
        setCorpus([]);
      }
    } finally {
      if (lifetime.active) {
        setCorpusLoading(false);
      }
    }
  };
  const recreate = async () => {
    if (!target?.sessionId || recreating || !lifetime.active) {
      return;
    }
    setRecreating(true);
    try {
      const res = await materializeLearningProviderSession(target.sessionId, lifetime.owner);
      if (!lifetime.active) {
        return;
      }
      onOpenSession(res.session_id, lifetime.owner);
    } catch (e) {
      if (lifetime.active) {
        notifyError(e instanceof Error ? e : new Error(String(e)), t.starmap.recreateFailed);
      }
    } finally {
      if (lifetime.active) {
        setRecreating(false);
      }
    }
  };
  const canRecreate = isProviderNode && !hits.some((h) => h.direct);
  return /* @__PURE__ */ jsx5(Dialog, { onOpenChange: (value) => !value && handleClose(), open: Boolean(target), children: /* @__PURE__ */ jsxs3(DialogContent, { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsx5(DialogHeader, { children: /* @__PURE__ */ jsx5(DialogTitle, { className: "truncate pr-6", children: showCorpus ? t.starmap.sourceTitle : t.starmap.sessionsTitle }) }),
    /* @__PURE__ */ jsx5("div", { className: "truncate text-xs text-muted-foreground", children: target?.label }),
    showCorpus ? /* @__PURE__ */ jsx5("div", { className: "max-h-[55vh] min-h-24 space-y-3 overflow-y-auto pr-1", children: corpusLoading ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-muted-foreground", children: t.starmap.sourceLoading }) : !corpus || corpus.length === 0 ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-muted-foreground", children: t.starmap.sourceEmpty }) : corpus.map((m2, i) => /* @__PURE__ */ jsxs3("div", { className: "rounded-md border border-(--ui-stroke-secondary) p-2", children: [
      /* @__PURE__ */ jsxs3("div", { className: "mb-1 flex items-baseline justify-between gap-2 text-[0.68rem] text-muted-foreground", children: [
        /* @__PURE__ */ jsx5("span", { className: "font-medium", children: m2.peer || "\u2014" }),
        m2.timestamp ? /* @__PURE__ */ jsx5("span", { className: "tabular-nums", children: fmtTs(m2.timestamp) }) : null
      ] }),
      /* @__PURE__ */ jsx5("div", { className: "whitespace-pre-wrap text-xs", children: m2.content })
    ] }, i)) }) : /* @__PURE__ */ jsx5("div", { className: "max-h-[55vh] min-h-24 space-y-1 overflow-y-auto pr-1", children: loading ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-muted-foreground", children: t.starmap.sessionsLoading }) : hits.length === 0 ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-muted-foreground", children: isProviderNode ? t.starmap.sessionsProviderOnly : t.starmap.sessionsEmpty }) : /* @__PURE__ */ jsxs3(Fragment2, { children: [
      !hits[0]?.direct && /* @__PURE__ */ jsx5("p", { className: "pb-1 text-[0.68rem] text-muted-foreground", children: t.starmap.sessionsSearchNote }),
      hits.map((h) => /* @__PURE__ */ jsxs3(
        "button",
        {
          className: "block w-full cursor-pointer rounded-md border border-transparent px-2 py-1.5 text-left hover:border-(--ui-stroke-secondary) hover:bg-(--ui-control-active-background)",
          onClick: () => {
            if (lifetime.active) {
              onOpenSession(h.id, lifetime.owner);
            }
          },
          type: "button",
          children: [
            /* @__PURE__ */ jsx5("div", { className: "truncate text-xs", children: h.title }),
            /* @__PURE__ */ jsxs3("div", { className: "flex items-baseline justify-between text-[0.65rem] text-muted-foreground", children: [
              /* @__PURE__ */ jsx5("span", { className: "truncate", children: h.id }),
              h.started ? /* @__PURE__ */ jsx5("span", { className: "shrink-0 pl-2 tabular-nums", children: fmtTs(h.started) }) : null
            ] })
          ]
        },
        h.id
      ))
    ] }) }),
    /* @__PURE__ */ jsxs3(DialogFooter, { className: "items-center gap-2", children: [
      showCorpus ? /* @__PURE__ */ jsx5(Button, { onClick: () => setShowCorpus(false), type: "button", variant: "ghost", children: t.starmap.backToSessions }) : isProviderNode ? /* @__PURE__ */ jsx5(Button, { onClick: () => void openCorpus(), type: "button", variant: "outline", children: t.starmap.viewSource }) : null,
      canRecreate ? /* @__PURE__ */ jsx5(Button, { disabled: recreating || loading, onClick: () => void recreate(), type: "button", variant: "outline", children: recreating ? t.starmap.recreating : t.starmap.recreate }) : null,
      /* @__PURE__ */ jsx5(Button, { onClick: handleClose, type: "button", variant: "ghost", children: t.starmap.close })
    ] })
  ] }) });
}

// src/app/starmap/playback-hotkey.ts
function shouldIgnorePlaybackHotkey(e, activeElement) {
  if (e.code !== "Space" && e.key !== " ") {
    return true;
  }
  if (e.defaultPrevented) {
    return true;
  }
  const el = activeElement;
  const tag = el?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || el?.isContentEditable) {
    return true;
  }
  const target = e.target;
  if (target?.closest?.("[role=menu]") || el?.closest?.("[role=menu]")) {
    return true;
  }
  return false;
}

// src/app/starmap/profile-selector.tsx
import { useEffect as useEffect5, useMemo as useMemo2, useState as useState5 } from "react";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
function ProfileSelector({ activeProfile }) {
  const { t } = useI18n();
  const profiles = useStore($profiles);
  const selectedProfiles = useStore($starmapSelectedProfiles);
  const [open, setOpen] = useState5(false);
  useEffect5(() => {
    if (profiles.length === 0) {
      void refreshProfiles();
    }
  }, [profiles.length]);
  const sortedProfiles = useMemo2(() => {
    const activeKey = normalizeProfileKey(activeProfile);
    return [...profiles].sort((a2, b) => {
      const aActive = normalizeProfileKey(a2.name) === activeKey;
      const bActive = normalizeProfileKey(b.name) === activeKey;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return profileLabel(a2).localeCompare(profileLabel(b));
    });
  }, [profiles, activeProfile]);
  useEffect5(() => {
    if (selectedProfiles.length === 0 && activeProfile) {
      toggleStarmapProfile(normalizeProfileKey(activeProfile), true);
    }
  }, [activeProfile, selectedProfiles.length]);
  useEffect5(() => {
    if (selectedProfiles.length > 0) {
      void loadStarmapGraph(true);
    }
  }, [selectedProfiles]);
  const handleToggle = (profile, enabled) => {
    toggleStarmapProfile(normalizeProfileKey(profile.name), enabled);
  };
  const handleSelectAll = () => {
    profiles.forEach((p) => toggleStarmapProfile(normalizeProfileKey(p.name), true));
  };
  const handleSelectNone = () => {
    profiles.forEach((p) => {
      const key = normalizeProfileKey(p.name);
      if (key !== normalizeProfileKey(activeProfile)) {
        toggleStarmapProfile(key, false);
      }
    });
  };
  if (profiles.length <= 1) {
    return null;
  }
  const selectedCount = selectedProfiles.length;
  const label = selectedCount === 0 ? t.starmap.profileNone : selectedCount === profiles.length ? t.starmap.profileAll : t.starmap.profileCount(selectedCount);
  return /* @__PURE__ */ jsxs4(Popover, { onOpenChange: setOpen, open, children: [
    /* @__PURE__ */ jsx6(Tip, { label: t.starmap.profileSelectorHint, children: /* @__PURE__ */ jsx6(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs4(
      Button,
      {
        className: "gap-1.5 text-xs",
        size: "sm",
        variant: "ghost",
        children: [
          /* @__PURE__ */ jsx6(Users, { className: "size-3.5" }),
          /* @__PURE__ */ jsx6("span", { className: "hidden sm:inline", children: label }),
          /* @__PURE__ */ jsx6(ChevronDown, { className: "size-3" })
        ]
      }
    ) }) }),
    /* @__PURE__ */ jsxs4(
      PopoverContent,
      {
        align: "start",
        className: "w-56 p-1",
        side: "bottom",
        sideOffset: 4,
        children: [
          /* @__PURE__ */ jsxs4("div", { className: "mb-1 flex items-center justify-between px-2 py-1", children: [
            /* @__PURE__ */ jsx6("span", { className: "text-xs font-medium text-muted-foreground", children: t.starmap.profileSelector }),
            /* @__PURE__ */ jsxs4("div", { className: "flex gap-1", children: [
              /* @__PURE__ */ jsx6(
                "button",
                {
                  className: "cursor-pointer text-[0.65rem] text-muted-foreground/70 hover:text-foreground",
                  onClick: handleSelectAll,
                  type: "button",
                  children: "All"
                }
              ),
              /* @__PURE__ */ jsx6("span", { className: "text-muted-foreground/40", children: "|" }),
              /* @__PURE__ */ jsx6(
                "button",
                {
                  className: "cursor-pointer text-[0.65rem] text-muted-foreground/70 hover:text-foreground",
                  onClick: handleSelectNone,
                  type: "button",
                  children: "None"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx6("div", { className: "max-h-64 overflow-y-auto", children: sortedProfiles.map((profile) => {
            const key = normalizeProfileKey(profile.name);
            const isSelected = selectedProfiles.includes(key);
            const isActive = key === normalizeProfileKey(activeProfile);
            return /* @__PURE__ */ jsxs4(
              "button",
              {
                className: "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-(--ui-control-active-background)",
                onClick: () => handleToggle(profile, !isSelected),
                type: "button",
                children: [
                  /* @__PURE__ */ jsx6(
                    "div",
                    {
                      className: `flex size-4 shrink-0 items-center justify-center rounded border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}`,
                      children: isSelected && /* @__PURE__ */ jsx6(Check, { className: "size-3" })
                    }
                  ),
                  /* @__PURE__ */ jsxs4("span", { className: "min-w-0 flex-1 truncate", children: [
                    profileLabel(profile),
                    isActive && /* @__PURE__ */ jsx6("span", { className: "ml-1 text-[0.6rem] text-muted-foreground/70", children: "(current)" })
                  ] }),
                  profile.display_name && profile.display_name !== profile.name && /* @__PURE__ */ jsx6("span", { className: "shrink-0 text-[0.6rem] text-muted-foreground/50", children: profile.name })
                ]
              },
              key
            );
          }) })
        ]
      }
    )
  ] });
}

// src/app/starmap/text.ts
function formatDate(ts) {
  if (!ts) {
    return "unknown";
  }
  try {
    return fmtDate.format(new Date(ts * 1e3));
  } catch {
    return "unknown";
  }
}
function metaBadges(n) {
  const out = [formatDate(n.timestamp)];
  if (n.kind === "memory") {
    out.push(n.memorySource === "profile" ? "profile memory" : "memory");
  } else {
    out.push(n.category);
    if (n.createdBy === "agent" || n.createdBy === "learn") {
      out.push("learned");
    }
    if (n.pinned) {
      out.push("pinned");
    }
  }
  return out.filter(Boolean);
}
function countLabel(n) {
  return n.kind === "skill" && n.useCount > 0 ? `x${n.useCount}` : null;
}
function nodeFooter(node) {
  void node;
  return null;
}
function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= maxW) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}
function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) {
    return text;
  }
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}\u2026`).width > maxW) {
    s = s.slice(0, -1);
  }
  return `${s.trimEnd()}\u2026`;
}

// src/app/starmap/render.ts
var ease = (t) => {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u * u * (3 - 2 * u);
};
var WARP_FROM = 0.32;
var warpIn = (t) => {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u >= 1 ? 1 : 1 - 2 ** (-9 * u);
};
var RING_BIRTH = { down: 0.055, up: 0.032 };
var NODE_BIRTH = { down: 0.11, up: 0.075 };
var SCRAMBLE_CHARS = "\uFF8A\uFF8B\uFF8C\uFF8D\uFF8E\uFF8F\uFF90\uFF91\uFF92\uFF93\uFF94\uFF95\uFF96\uFF97\uFF98\uFF99\uFF9A\uFF9C\uFF9D\uFF66\uFF71\uFF73\uFF74\uFF75\uFF76\uFF77\uFF79\uFF7A\uFF7B\uFF7C\uFF7D\uFF7E\uFF80\uFF81\uFF82\uFF83\uFF85\uFF86\uFF87\uFF880123456789:.=*+<>\u039E\u2573";
var SPRITE_R = 96;
var spriteCache = /* @__PURE__ */ new Map();
function sphereSprite(ink, strength, bodyDarken) {
  const key = `${ink.r},${ink.g},${ink.b}|${strength}|${bodyDarken}`;
  const cached = spriteCache.get(key);
  if (cached) {
    return cached;
  }
  const R = SPRITE_R;
  const pad = Math.ceil(R * 0.15) + 1;
  const size = (R + pad) * 2;
  const c2 = R + pad;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g2 = cv.getContext("2d");
  if (!g2) {
    return cv;
  }
  const mx = Math.max(ink.r, ink.g, ink.b);
  const mn = Math.min(ink.r, ink.g, ink.b);
  const sat = mx ? (mx - mn) / mx : 0;
  const whiteness = clamp((luminance(ink.r, ink.g, ink.b) - 0.7) / 0.3, 0, 1) * (1 - sat);
  const eff = strength + (WHITEISH_SHEEN - strength) * whiteness;
  const hi = mixRgb(ink, WHITE, 0.7 * eff);
  const body = darken(ink, bodyDarken * (1 - whiteness));
  const grad = g2.createRadialGradient(c2 - R * 0.35, c2 - R * 0.4, R * 0.05, c2, c2, R * 1.15);
  grad.addColorStop(0, rgba(hi, 1));
  grad.addColorStop(0.5, rgba(body, 1));
  grad.addColorStop(1, rgba(body, 0.85));
  g2.fillStyle = grad;
  g2.beginPath();
  g2.arc(c2, c2, R, 0, Math.PI * 2);
  g2.fill();
  spriteCache.set(key, cv);
  return cv;
}
function sphereFill(ctx, x3, y3, r, ink, strength, bodyDarken) {
  const sprite = sphereSprite(ink, strength, bodyDarken);
  const scale = r / SPRITE_R;
  const drawSize = sprite.width * scale;
  ctx.drawImage(sprite, x3 - drawSize / 2, y3 - drawSize / 2, drawSize, drawSize);
}
var rectsOverlap = (a2, b) => a2.x < b.x + b.w && a2.x + a2.w > b.x && a2.y < b.y + b.h && a2.y + a2.h > b.y;
function drawScene(scene) {
  const {
    adjacency,
    byId,
    conclusionIds = null,
    ctx,
    dpr,
    fades,
    filterMatches = null,
    focusId,
    hoverId,
    hoverLink,
    hoverRing,
    links,
    memById,
    nodes,
    palette,
    reveal,
    rings,
    selectedRing,
    size,
    snapMotion = false,
    vp
  } = scene;
  const seen = (rec) => rec <= reveal + 1e-3;
  let frontier = 0;
  for (const fn of nodes) {
    if (fn.rec <= reveal + 1e-3 && fn.rec > frontier) {
      frontier = fn.rec;
    }
  }
  const erec = (rec) => frontier > 0 ? clamp(rec / frontier, 0, 1) : 1;
  const { h, w } = size;
  const { bandInk, base, bg, c: c2, chipBg, conclusionInk, darkTheme, inkInv, memoryInk, skillInk } = palette;
  const { bandAlpha, lightSize, ringAlpha, sheen } = RING_PARAMS[darkTheme ? "dark" : "light"];
  let animating = false;
  const ringLabelRects = [];
  const fadeAlpha = (bucket, key, target, snapUp = false, rates) => {
    const targetAlpha = clamp(target, 0, 1);
    const prev = bucket.get(key);
    if (snapMotion) {
      bucket.set(key, targetAlpha);
      return targetAlpha;
    }
    if (prev == null || snapUp && targetAlpha > prev) {
      bucket.set(key, targetAlpha);
      return targetAlpha;
    }
    const up = rates?.up ?? 0.22;
    const down = rates?.down ?? 0.32;
    const rate = targetAlpha > prev ? up : down;
    const next = prev + (targetAlpha - prev) * rate;
    if (Math.abs(next - targetAlpha) < 0.01) {
      bucket.set(key, targetAlpha);
      return targetAlpha;
    }
    animating = true;
    bucket.set(key, next);
    return next;
  };
  const shade = (a2) => `rgba(${base.r},${base.g},${base.b},${a2})`;
  const projX = (wx) => wx * vp.k + vp.x;
  const projY = (wy) => wy * vp.k * TILT + vp.y;
  const nodeK = fitScale(w, h, rings);
  const focusSet = focusId ? adjacency.get(focusId) ?? /* @__PURE__ */ new Set() : null;
  const ringIdx = selectedRing;
  const ring = ringIdx != null ? rings[ringIdx] ?? null : null;
  const ringLo = ring && ringIdx != null ? (rings[ringIdx - 1]?.ratio ?? 0) - 1e-3 : 0;
  const ringHi = ring ? ring.ratio + 1e-3 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.setTransform(vp.k * dpr, 0, 0, vp.k * TILT * dpr, vp.x * dpr, vp.y * dpr);
  const litRingIdx = hoverRing ?? ringIdx;
  const ringSeen = (i) => {
    const threshold = rings[i - 1]?.ratio ?? 0;
    return i === 0 || (threshold <= 0 ? reveal > 1e-3 : reveal + 1e-3 >= threshold);
  };
  const ringAppear = rings.map(
    (rg, i) => ease(fadeAlpha(fades.appear, `ring:${i}`, ringSeen(i) ? 1 : 0, false, RING_BIRTH))
  );
  const ringDrawR = rings.map((rg, i) => {
    const startR = ringSeen(i) ? rings[i - 1]?.r ?? rg.r : RING_INNER;
    return startR + (rg.r - startR) * (ringAppear[i] ?? 1);
  });
  const ringVis = ringAppear.map((a2) => clamp(a2 / 0.55, 0, 1));
  if (bandAlpha > 0 || litRingIdx != null) {
    for (let i = 0; i < rings.length - 1; i += 1) {
      const lit = litRingIdx != null && i + 1 === litRingIdx;
      if (!lit && bandAlpha <= 0) {
        continue;
      }
      if ((ringAppear[i + 1] ?? 1) <= 0.01) {
        continue;
      }
      const inner = ringDrawR[i] ?? 0;
      const outer = ringDrawR[i + 1] ?? 0;
      if (lit) {
        ctx.fillStyle = rgba(bandInk, LIT_BAND_ALPHA);
      } else {
        const grad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
        if (darkTheme) {
          grad.addColorStop(0, rgba(bandInk, 0));
          grad.addColorStop(clamp(1 - lightSize, 0.01, 0.99), rgba(bandInk, 0));
          grad.addColorStop(1, rgba(bandInk, bandAlpha));
        } else {
          grad.addColorStop(0, rgba(bandInk, bandAlpha));
          grad.addColorStop(clamp(lightSize, 0.01, 0.99), rgba(bandInk, 0));
          grad.addColorStop(1, rgba(bandInk, 0));
        }
        ctx.fillStyle = grad;
      }
      ctx.beginPath();
      ctx.arc(0, 0, outer, 0, Math.PI * 2);
      ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
      ctx.fill();
    }
  }
  ctx.lineWidth = c2.ringWidth / vp.k;
  ctx.setLineDash(c2.ringDashed ? [c2.ringDash / vp.k, c2.ringDash / vp.k] : []);
  rings.forEach((rg, i) => {
    const emphasized = ringIdx != null && (i === ringIdx || i === ringIdx - 1);
    const emphasisAlpha = emphasized ? clamp(LIT_BAND_ALPHA * 2, 0, 1) : ringAlpha;
    const coreFade = i === 0 ? clamp(reveal / 0.08, 0, 1) : 1;
    const ringAlphaNow = fadeAlpha(fades.rings, String(i), emphasisAlpha, emphasized) * (ringVis[i] ?? 1) * coreFade;
    if (ringAlphaNow < 4e-3) {
      return;
    }
    ctx.strokeStyle = shade(ringAlphaNow);
    ctx.beginPath();
    ctx.arc(0, 0, ringDrawR[i] ?? rg.r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const focusNode = focusId ? byId.get(focusId) ?? null : null;
  const focusRingR = focusNode ? nodeRadius(focusNode) * nodeK + 4 : 0;
  for (const link of links) {
    const s = typeof link.source === "object" ? link.source : byId.get(String(link.source));
    const t = typeof link.target === "object" ? link.target : byId.get(String(link.target));
    if (!s || !t) {
      continue;
    }
    if (filterMatches && !(filterMatches.has(s.id) && filterMatches.has(t.id))) {
      continue;
    }
    const revealed = seen(s.rec) && seen(t.rec);
    const lit = revealed && !!focusId && (s.id === focusId || t.id === focusId || !!focusSet && focusSet.has(s.id) && focusSet.has(t.id));
    let x1 = projX(s.x);
    let y1 = projY(s.y);
    let x22 = projX(t.x);
    let y22 = projY(t.y);
    if (s.id === focusId) {
      const d = Math.hypot(x22 - x1, y22 - y1) || 1;
      x1 += (x22 - x1) / d * focusRingR;
      y1 += (y22 - y1) / d * focusRingR;
    }
    if (t.id === focusId) {
      const d = Math.hypot(x1 - x22, y1 - y22) || 1;
      x22 += (x1 - x22) / d * focusRingR;
      y22 += (y1 - y22) / d * focusRingR;
    }
    const key = `${s.id}->${t.id}`;
    const ambient = recencyInk(erec((s.rec + t.rec) / 2)) * c2.lineAlpha;
    const targetAlpha = !revealed ? 0 : lit ? 1 : key === hoverLink ? clamp(ambient * 2, 0, 0.7) : focusId || ring ? 0.025 : ambient;
    const linkAlpha = fadeAlpha(fades.links, key, targetAlpha, lit);
    if (linkAlpha < 4e-3) {
      continue;
    }
    ctx.strokeStyle = shade(linkAlpha);
    ctx.setLineDash(lit || !c2.lineDashed ? [] : [c2.lineDash, c2.lineDash]);
    ctx.lineWidth = lit ? 1.5 : c2.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x22, y22);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const revealedRings = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    if (filterMatches && !filterMatches.has(n.id)) {
      continue;
    }
    const landLaid = (ringAppear[n.outerRingIndex] ?? 1) >= 0.5;
    const revealed = seen(n.rec) && landLaid;
    if (revealed) {
      revealedRings.add(n.outerRingIndex);
    }
    const isFocus = revealed && n.id === focusId;
    const isNeighbor = revealed && !!focusSet && focusSet.has(n.id);
    const inRing = !!ring && n.rec >= ringLo && n.rec < ringHi;
    const nodeHigh = isFocus || isNeighbor;
    const er = erec(n.rec);
    const ageScale = nodeHigh || inRing ? 1 : 0.34 + Math.min(1, er / 0.4) * 0.66;
    const r = nodeRadius(n) * nodeK * ageScale;
    const baseAlpha = nodeHigh ? 1 : ring ? inRing ? focusId ? 0.55 : 1 : 0.16 : focusId ? 0.16 : recencyInk(er);
    const alpha = fadeAlpha(fades.nodes, n.id, revealed ? baseAlpha : 0, nodeHigh || inRing);
    const rawBorn = fadeAlpha(fades.appear, n.id, revealed ? 1 : 0, nodeHigh || inRing, NODE_BIRTH);
    const born = ease(rawBorn);
    const vis = alpha * born;
    if (vis < 4e-3) {
      continue;
    }
    const posScale = WARP_FROM + (1 - WARP_FROM) * warpIn(rawBorn);
    const sx = projX(n.x * posScale);
    const sy = projY(n.y * posScale);
    ctx.globalAlpha = vis;
    const isConcl = !!conclusionIds && conclusionIds.has(n.id);
    const nodeInk = nodeHigh ? base : isConcl ? conclusionInk : n.kind === "memory" ? memoryInk : skillInk;
    const shape = isConcl ? "hexagon" : NODE_SHAPE[n.kind];
    if (shape === "circle") {
      sphereFill(ctx, sx, sy, r, nodeInk, sheen, nodeHigh ? 0 : ORB_DARKEN);
    } else {
      shapePath(ctx, shape, sx, sy, r);
      ctx.fillStyle = rgba(nodeInk, 1);
      ctx.fill();
    }
    if (isFocus) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(nodeInk, 1);
      ctx.lineWidth = 1.4;
      shapePath(ctx, shape, sx, sy, r + 4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  const LABEL_GAP = 15;
  let lastLabelY = Number.POSITIVE_INFINITY;
  rings.forEach((rg, i) => {
    if (!rg.label || !revealedRings.has(i)) {
      return;
    }
    const sx = projX(0);
    const sy = projY(-(ringDrawR[i] ?? rg.r));
    if (sy < 8 || sy > h - 8 || lastLabelY - sy < LABEL_GAP) {
      return;
    }
    lastLabelY = sy;
    const tw = ctx.measureText(rg.label).width;
    const boxW = tw + 6;
    const isThis = ringIdx === i || hoverRing === i;
    const faded = (focusId != null || ringIdx != null) && !isThis;
    const emphasisAlpha = faded ? 0.33 : 1;
    const labelAlpha = fadeAlpha(fades.labels, String(i), emphasisAlpha, isThis) * (ringVis[i] ?? 1);
    if (labelAlpha < 0.01) {
      return;
    }
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle = rgba(bg, 1);
    ctx.fillRect(sx - boxW / 2, sy - 6, boxW, 13);
    ctx.fillStyle = shade(isThis ? 1 : 0.2);
    ctx.fillText(rg.label, sx, sy + 3);
    ctx.globalAlpha = 1;
    ringLabelRects.push({ h: 18, i, w: boxW + 6, x: sx - boxW / 2 - 3, y: sy - 10 });
  });
  const tipNode = focusId ? byId.get(focusId) : null;
  const tip = tipNode && seen(tipNode.rec) ? tipNode : null;
  let tipRect = null;
  if (tip) {
    const PADX = 6;
    const PADY = 4;
    const BADGE_H = 14;
    const ROW_GAP = 3;
    const LINE_H = 16;
    const ITEM_GAP = 8;
    const badgeFont = "9px ui-sans-serif, system-ui, sans-serif";
    const monoFont = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    const titleFont = "600 11px ui-sans-serif, system-ui, sans-serif";
    const footerFont = "9px ui-sans-serif, system-ui, sans-serif";
    const FOOTER_H = 13;
    const badgeFontFor = (i) => i === 0 ? badgeFont : monoFont;
    const badges = metaBadges(tip);
    const use = countLabel(tip);
    const titleText = tip.kind === "memory" ? memById.get(tip.id)?.body.split("\n")[0]?.trim() || tip.label : tip.label;
    const badgeW = badges.map((b, i) => {
      ctx.font = badgeFontFor(i);
      return ctx.measureText(b).width;
    });
    const rowW = badgeW.reduce((a2, b) => a2 + b, 0) + ITEM_GAP * Math.max(0, badges.length - 1);
    ctx.font = monoFont;
    const useW = use ? ctx.measureText(use).width : 0;
    const metaW = rowW + (use ? ITEM_GAP + useW : 0);
    ctx.font = titleFont;
    const maxTitleW = Math.min(380, w - 16) - PADX * 2;
    const titleLines = wrapText(ctx, titleText, maxTitleW);
    const titleW = Math.max(0, ...titleLines.map((l) => ctx.measureText(l).width));
    const titleBgW = titleW + PADX * 2;
    const titleBgH = titleLines.length * LINE_H + PADY * 2;
    const footerText = nodeFooter(tip);
    ctx.font = footerFont;
    const footerW = footerText ? ctx.measureText(footerText).width : 0;
    const totalW = Math.max(metaW, footerW, titleBgW);
    const totalH = BADGE_H + ROW_GAP + titleBgH + (footerText ? ROW_GAP + FOOTER_H : 0);
    const bx = clamp(projX(tip.x) - totalW / 2, 4, Math.max(4, w - totalW - 4));
    const by = clamp(projY(tip.y) - (nodeRadius(tip) * nodeK + 8) - totalH, 4, Math.max(4, h - totalH - 4));
    tipRect = { h: totalH, w: totalW, x: bx, y: by };
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const badgeMidY = by + BADGE_H / 2;
    ctx.fillStyle = shade(0.7);
    let cx = bx;
    badges.forEach((label, i) => {
      ctx.font = badgeFontFor(i);
      ctx.fillText(label, cx, badgeMidY);
      cx += badgeW[i] + ITEM_GAP;
    });
    if (use) {
      ctx.font = monoFont;
      ctx.fillStyle = shade(0.5);
      ctx.fillText(use, cx, badgeMidY);
    }
    const ty = by + BADGE_H + ROW_GAP;
    ctx.fillStyle = shade(1);
    ctx.fillRect(bx, ty, titleBgW, titleBgH);
    ctx.font = titleFont;
    ctx.fillStyle = inkInv;
    titleLines.forEach((line, i) => {
      ctx.fillText(line, bx + PADX, ty + PADY + LINE_H * i + LINE_H / 2);
    });
    if (footerText) {
      ctx.font = footerFont;
      ctx.fillStyle = shade(0.45);
      ctx.fillText(footerText, bx, ty + titleBgH + ROW_GAP + FOOTER_H / 2);
    }
    ctx.textBaseline = "alphabetic";
  }
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  const LBL_M = 6;
  const LBL_H = 15;
  const placed = ringLabelRects.map((r) => ({ h: r.h, w: r.w, x: r.x, y: r.y }));
  if (tipRect) {
    placed.push(tipRect);
  }
  for (const id of focusSet ?? []) {
    if (id === hoverId) {
      continue;
    }
    const n = byId.get(id);
    if (!n || !seen(n.rec)) {
      continue;
    }
    const label = ellipsize(ctx, n.label, Math.min(180, w * 0.32));
    const bw = ctx.measureText(label).width + 8;
    const x3 = clamp(projX(n.x) - bw / 2, LBL_M, Math.max(LBL_M, w - bw - LBL_M));
    const top = projY(n.y) - (nodeRadius(n) * nodeK + 7) - LBL_H + 4;
    const clampY = (v) => clamp(v, LBL_M, Math.max(LBL_M, h - LBL_H - LBL_M));
    const step = LBL_H + 3;
    let y3 = null;
    for (let k = 0; k <= 7 && y3 == null; k += 1) {
      for (const dy of k === 0 ? [0] : [-k * step, k * step]) {
        const cand = { h: LBL_H, w: bw, x: x3, y: clampY(top + dy) };
        if (!placed.some((p) => rectsOverlap(cand, p))) {
          y3 = cand.y;
          break;
        }
      }
    }
    if (y3 == null) {
      continue;
    }
    placed.push({ h: LBL_H, w: bw, x: x3, y: y3 });
    ctx.fillStyle = chipBg;
    ctx.fillRect(x3, y3, bw, LBL_H);
    ctx.fillStyle = shade(0.85);
    ctx.fillText(label, x3 + bw / 2, y3 + 11);
  }
  return { animating, ringLabelRects };
}
var SCRAMBLE_RADIUS = 6;
var SCRAMBLE_CELL_MIN = 5;
var SCRAMBLE_CELL_MAX = 13;
function drawScramble({
  ctx,
  dpr,
  palette,
  rings,
  vp
}) {
  const { bg, darkTheme, primary } = palette;
  const projX = (wx) => wx * vp.k + vp.x;
  const projY = (wy) => wy * vp.k * TILT + vp.y;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const coreX = projX(0);
  const coreY = projY(0);
  const coreRx = (rings[0]?.r ?? RING_INNER) * vp.k * 1.25;
  if (coreRx <= 0) {
    return;
  }
  const washR = coreRx * 1.15;
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.scale(1, TILT);
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, washR);
  wash.addColorStop(0, rgba(bg, darkTheme ? 0.9 : 0.93));
  wash.addColorStop(0.62, rgba(bg, darkTheme ? 0.84 : 0.88));
  wash.addColorStop(1, rgba(bg, 0));
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.arc(0, 0, washR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const cell = clamp(coreRx / SCRAMBLE_RADIUS, SCRAMBLE_CELL_MIN, SCRAMBLE_CELL_MAX);
  const coreRy = coreRx * TILT;
  const half = Math.max(3, Math.round(coreRx / cell));
  const now2 = performance.now();
  const t = now2 / 1e3;
  ctx.save();
  ctx.font = `${cell}px "JetBrains Mono", "Hiragino Sans", "Noto Sans JP", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r = -half; r <= half; r += 1) {
    const rowSeed = r * 19349663 >>> 0 || 1;
    const dir = rowSeed & 1 ? 1 : -1;
    const speed = 8 + rowSeed % 16;
    const scroll = now2 / 1e3 * speed * dir;
    const ny = r * cell / coreRy;
    const rowDim = 1 - 0.5 * Math.min(1, Math.abs(ny));
    const kMin = Math.floor((-coreRx - scroll) / cell) - 1;
    const kMax = Math.ceil((coreRx - scroll) / cell) + 1;
    for (let k = kMin; k <= kMax; k += 1) {
      const sx = k * cell + scroll;
      const nx = sx / coreRx;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) {
        continue;
      }
      const seed = (rowSeed ^ (k >>> 0) * 73856093) >>> 0;
      const ch = SCRAMBLE_CHARS[seed % SCRAMBLE_CHARS.length] ?? "0";
      const edge = clamp((1 - Math.sqrt(d2)) / 0.4, 0, 1);
      const flick = 0.7 + 0.3 * ((seed >>> 5) % 100 / 100);
      const phase = (seed & 7) * 0.35;
      const glow = Math.sin(nx * 4.5 + t * 1.3 + phase) * Math.sin(ny * 4.5 - t * 0.9 + phase);
      const pop = 1 + clamp((glow - 0.25) / 0.75, 0, 1) * 2.6;
      const a2 = clamp((darkTheme ? 0.22 : 0.3) * edge * flick * rowDim * pop, 0, 0.9);
      if (a2 < 0.02) {
        continue;
      }
      ctx.fillStyle = rgba(primary, a2);
      ctx.fillText(ch, coreX + sx, coreY + r * cell);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawSearchPulse({
  conclusionIds = null,
  ctx,
  dpr,
  matches,
  nodes,
  now: now2,
  palette,
  vp
}) {
  if (matches.size === 0) {
    return;
  }
  const { conclusionInk, memoryInk, skillInk } = palette;
  const projX = (wx) => wx * vp.k + vp.x;
  const projY = (wy) => wy * vp.k * TILT + vp.y;
  const phase = now2 % 1600 / 1600;
  const swell = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const n of nodes) {
    if (!matches.has(n.id)) {
      continue;
    }
    const isConcl = !!conclusionIds && conclusionIds.has(n.id);
    const sx = projX(n.x);
    const sy = projY(n.y);
    const r = nodeRadius(n) + 3 + swell * 7;
    const ink = isConcl ? conclusionInk : n.kind === "memory" ? memoryInk : skillInk;
    const shape = isConcl ? "hexagon" : NODE_SHAPE[n.kind];
    ctx.globalAlpha = 0.55 * (1 - swell) + 0.15;
    ctx.strokeStyle = rgba(ink, 1);
    ctx.lineWidth = 1.6;
    shapePath(ctx, shape, sx, sy, r);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    shapePath(ctx, shape, sx, sy, nodeRadius(n) + 2.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// src/lib/storage.ts
var PREFIX = "hermes.plugin.journey-starmap.";
function readKey(key) {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}
function writeKey(key, value) {
  try {
    if (value === null) {
      window.localStorage.removeItem(PREFIX + key);
    } else {
      window.localStorage.setItem(PREFIX + key, value);
    }
  } catch {
  }
}

// src/lib/ui-preferences/keys.ts
function isSharedPreferenceKey(_key) {
  return false;
}

// src/lib/persisted.ts
var Codecs = {
  bool: { decode: (raw) => raw === "true", encode: (value) => String(value) },
  nullableText: { decode: (raw) => raw, encode: (value) => value },
  text: { decode: (raw) => raw, encode: (value) => value },
  // Mirrors storedStringArray/persistStringArray: drops non-strings, empty → removed.
  stringArray: {
    decode: (raw) => {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.length > 0) : [];
    },
    encode: (value) => value.length === 0 ? null : JSON.stringify(value)
  },
  // Mirrors storedStringRecord/persistStringRecord: keeps only string values.
  stringRecord: {
    decode: (raw) => {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return Object.fromEntries(
        Object.entries(parsed).filter((entry) => typeof entry[1] === "string")
      );
    },
    encode: (value) => JSON.stringify(value)
  },
  /** JSON with an optional sanitizer for untrusted persisted shapes. */
  json(sanitize) {
    return {
      decode: (raw) => {
        const parsed = JSON.parse(raw);
        return sanitize ? sanitize(parsed) : parsed;
      },
      encode: (value) => JSON.stringify(value)
    };
  }
};
function decodeOr(raw, fallback, codec2) {
  if (raw === null) {
    return fallback;
  }
  try {
    return codec2.decode(raw);
  } catch {
    return fallback;
  }
}
function persistentAtom(key, fallback, codec2 = Codecs.json()) {
  const $value = atom(decodeOr(readKey(key), fallback, codec2));
  let creationEmission = true;
  let adopting = false;
  $value.subscribe((value) => {
    if (creationEmission || adopting) {
      creationEmission = false;
      return;
    }
    writeKey(key, codec2.encode(value));
  });
  if (isSharedPreferenceKey(key) && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== key) {
        return;
      }
      adopting = true;
      try {
        $value.set(decodeOr(readKey(key), fallback, codec2));
      } finally {
        adopting = false;
      }
    });
  }
  return $value;
}

// src/app/starmap/search.ts
var EMPTY_FILTERS = {
  dateMode: "range",
  from: "",
  kind: "all",
  month: "",
  source: "all",
  to: "",
  year: ""
};
function providerName(graph) {
  return (graph.memoryProvider ?? "").trim().toLowerCase();
}
function conclusionsEnabled(graph) {
  return providerName(graph) === "honcho";
}
var DERIVED_LEVELS = /* @__PURE__ */ new Set(["inductive", "deductive"]);
function isConclusion2(n, memoryProvider) {
  if ((memoryProvider ?? "").trim().toLowerCase() !== "honcho") {
    return false;
  }
  if ((n.memorySource ?? "").toLowerCase() !== "honcho") {
    return false;
  }
  return DERIVED_LEVELS.has((n.memoryLevel ?? "").trim().toLowerCase());
}
function nodeOrigin(n) {
  return (n.origin ?? "hermes").trim().toLowerCase() || "hermes";
}
function distinctOrigins(nodes) {
  const seen = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    seen.add(nodeOrigin(n));
  }
  const imports = [...seen].filter((o) => o !== "hermes").sort();
  return seen.has("hermes") ? ["hermes", ...imports] : imports;
}
function dayStart(iso) {
  const [y3, m2, d] = iso.split("-").map(Number);
  if (!y3 || !m2 || !d) {
    return null;
  }
  return new Date(y3, m2 - 1, d).getTime() / 1e3;
}
function dayEnd(iso) {
  const start = dayStart(iso);
  return start === null ? null : start + 86400 - 1;
}
function yearStart(year) {
  return new Date(year, 0, 1).getTime() / 1e3;
}
function yearEnd(year) {
  return new Date(year + 1, 0, 1).getTime() / 1e3 - 1;
}
function monthStart(year, month1) {
  return new Date(year, month1 - 1, 1).getTime() / 1e3;
}
function monthEnd(year, month1) {
  return new Date(year, month1, 1).getTime() / 1e3 - 1;
}
function effectiveRange(f) {
  if (f.dateMode === "year" || f.dateMode === "yearMonth") {
    const y3 = Number(f.year);
    if (!y3) {
      return { from: null, to: null };
    }
    const m2 = f.dateMode === "yearMonth" ? Number(f.month) : 0;
    if (m2 >= 1 && m2 <= 12) {
      return { from: monthStart(y3, m2), to: monthEnd(y3, m2) };
    }
    return { from: yearStart(y3), to: yearEnd(y3) };
  }
  return { from: f.from ? dayStart(f.from) : null, to: f.to ? dayEnd(f.to) : null };
}
function hasActiveNarrowing(query, filters) {
  const { from, to } = effectiveRange(filters);
  return query.trim() !== "" || filters.kind !== "all" || filters.source !== "all" || from !== null || to !== null;
}
function filterNodes(graph, query, filters) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const { from, to } = effectiveRange(filters);
  const provider = graph.memoryProvider;
  const cardsById = memoryCardsByNodeId(graph);
  const out = graph.nodes.filter((n) => {
    if (filters.kind === "skill") {
      if (n.kind !== "skill") {
        return false;
      }
    } else if (filters.kind === "conclusion") {
      if (!isConclusion2(n, provider)) {
        return false;
      }
    } else if (filters.kind === "memory") {
      if (n.kind !== "memory" || isConclusion2(n, provider)) {
        return false;
      }
    }
    if (filters.source !== "all" && nodeOrigin(n) !== filters.source) {
      return false;
    }
    const ts = n.timestamp ?? null;
    if (from !== null || to !== null) {
      if (ts === null) {
        return false;
      }
      if (from !== null && ts < from || to !== null && ts > to) {
        return false;
      }
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = `${n.label}
${n.category}
${nodeOrigin(n)}
${cardsById.get(n.id)?.body ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  return out.sort((a2, b) => {
    const ta = a2.timestamp ?? null;
    const tb = b.timestamp ?? null;
    if (ta === null && tb === null) {
      return a2.label.localeCompare(b.label);
    }
    if (ta === null) {
      return 1;
    }
    if (tb === null) {
      return -1;
    }
    return ta - tb;
  });
}
var HISTORY_KEY = "hermes.desktop.starmap.search.history";
var SAVED_KEY = "hermes.desktop.starmap.search.saved";
var HISTORY_MAX = 12;
var SAVED_MAX = 20;
var stringArray = {
  decode: (raw) => {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.length > 0) : [];
  },
  encode: (value) => value.length === 0 ? null : JSON.stringify(value)
};
var savedSearches = {
  decode: (raw) => {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const rec = item;
      const kind = rec.kind === "memory" || rec.kind === "skill" || rec.kind === "conclusion" ? rec.kind : "all";
      const dateMode = rec.dateMode === "year" || rec.dateMode === "yearMonth" ? rec.dateMode : "range";
      return [
        {
          dateMode,
          from: typeof rec.from === "string" ? rec.from : "",
          kind,
          month: typeof rec.month === "string" ? rec.month : "",
          query: typeof rec.query === "string" ? rec.query : "",
          source: typeof rec.source === "string" && rec.source ? rec.source : "all",
          to: typeof rec.to === "string" ? rec.to : "",
          year: typeof rec.year === "string" ? rec.year : ""
        }
      ];
    });
  },
  encode: (value) => value.length === 0 ? null : JSON.stringify(value)
};
var $searchHistory = persistentAtom(HISTORY_KEY, [], stringArray);
var $savedSearches = persistentAtom(SAVED_KEY, [], savedSearches);
function commitSearchHistory(query) {
  const q = query.trim();
  if (!q) {
    return;
  }
  $searchHistory.set([q, ...$searchHistory.get().filter((h) => h !== q)].slice(0, HISTORY_MAX));
}
var savedKey = (s) => JSON.stringify([s.query.trim(), s.kind, s.source, s.dateMode, s.from, s.to, s.year, s.month]);
function saveSearch(next) {
  const key = savedKey(next);
  $savedSearches.set(
    [{ ...next, query: next.query.trim() }, ...$savedSearches.get().filter((s) => savedKey(s) !== key)].slice(
      0,
      SAVED_MAX
    )
  );
}
function removeSavedSearch(target) {
  const key = savedKey(target);
  $savedSearches.set($savedSearches.get().filter((s) => savedKey(s) !== key));
}

// src/app/starmap/search-sidebar.tsx
import { useEffect as useEffect6, useMemo as useMemo3, useRef as useRef3, useState as useState6 } from "react";
import { Fragment as Fragment3, jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
function fmtTs2(ts) {
  if (!ts) {
    return "";
  }
  try {
    return fmtDate.format(new Date(ts * 1e3));
  } catch {
    return "";
  }
}
var selectCls = "h-6 rounded-md border border-(--ui-stroke-secondary) bg-transparent px-1 text-[0.65rem] text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/40";
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function yearsWithNodes(nodes) {
  const set2 = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    if (n.timestamp) {
      set2.add(new Date(n.timestamp * 1e3).getFullYear());
    }
  }
  return [...set2].sort((a2, b) => b - a2);
}
function SearchSidebar({
  conclusionColor,
  focusSection,
  graph,
  memoryColor,
  onClose,
  onFocusNode,
  onMatchesChange,
  onNodeMenu,
  onRegisterClear,
  showConclusions
}) {
  const { t } = useI18n();
  const history = useStore($searchHistory);
  const saved = useStore($savedSearches);
  const [query, setQuery] = useState6("");
  const [filters, setFilters] = useState6(EMPTY_FILTERS);
  const [dropdownOpen, setDropdownOpen] = useState6(false);
  const inputRef = useRef3(null);
  const filtersRef = useRef3(null);
  const origins = useMemo3(() => distinctOrigins(graph.nodes), [graph.nodes]);
  const years = useMemo3(() => yearsWithNodes(graph.nodes), [graph.nodes]);
  const narrowed = hasActiveNarrowing(query, filters);
  const results = useMemo3(() => filterNodes(graph, query, filters).reverse(), [filters, graph, query]);
  const conclusionSet = useMemo3(() => {
    const s = /* @__PURE__ */ new Set();
    if (showConclusions) {
      for (const n of graph.nodes) {
        if (isConclusion2(n, graph.memoryProvider)) {
          s.add(n.id);
        }
      }
    }
    return s;
  }, [graph.memoryProvider, graph.nodes, showConclusions]);
  useEffect6(() => {
    onMatchesChange(narrowed ? new Set(results.map((n) => n.id)) : null);
  }, [narrowed, onMatchesChange, results]);
  useEffect6(() => () => onMatchesChange(null), [onMatchesChange]);
  useEffect6(() => {
    onRegisterClear(() => {
      setQuery("");
      setFilters(EMPTY_FILTERS);
    });
  }, [onRegisterClear]);
  useEffect6(() => {
    if (focusSection === "search") {
      inputRef.current?.focus();
    } else {
      filtersRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [focusSection]);
  const commit = () => {
    commitSearchHistory(query);
    setDropdownOpen(false);
  };
  const applySaved = (s) => {
    setQuery(s.query);
    setFilters({
      dateMode: s.dateMode,
      from: s.from,
      kind: s.kind,
      month: s.month,
      source: s.source,
      to: s.to,
      year: s.year
    });
    setDropdownOpen(false);
  };
  const currentSaved = { ...filters, query };
  const recents = history.filter((h) => h.toLowerCase().includes(query.trim().toLowerCase()) && h !== query.trim());
  return /* @__PURE__ */ jsxs5("div", { className: "pointer-events-auto flex h-full w-72 min-w-0 flex-col gap-2 border-l border-(--ui-stroke-secondary) bg-[color-mix(in_srgb,var(--ui-bg-elevated)_94%,transparent)] p-3 backdrop-blur-md [-webkit-app-region:no-drag]", children: [
    /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx7("span", { className: "text-xs font-medium", children: t.starmap.searchTitle }),
      /* @__PURE__ */ jsx7(Button, { "aria-label": t.starmap.close, onClick: onClose, size: "icon-xs", variant: "ghost", children: /* @__PURE__ */ jsx7(X, { className: "size-3.5" }) })
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "relative", children: [
      /* @__PURE__ */ jsx7(
        "input",
        {
          "aria-label": t.starmap.searchTitle,
          className: "h-7 w-full rounded-md border border-(--ui-stroke-secondary) bg-foreground/5 px-2 text-xs outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring/40",
          onBlur: () => setTimeout(() => setDropdownOpen(false), 120),
          onChange: (e) => {
            setQuery(e.target.value);
            setDropdownOpen(true);
          },
          onFocus: () => setDropdownOpen(true),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              commit();
            }
            if (e.key === "Escape") {
              setDropdownOpen(false);
            }
          },
          placeholder: t.starmap.searchPlaceholder,
          ref: inputRef,
          spellCheck: false,
          value: query
        }
      ),
      dropdownOpen && (recents.length > 0 || saved.length > 0) ? /* @__PURE__ */ jsxs5("div", { className: "absolute inset-x-0 top-8 z-30 max-h-56 overflow-y-auto rounded-md border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) py-1 shadow-md", children: [
        saved.length > 0 ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
          /* @__PURE__ */ jsx7("div", { className: "px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground/70", children: t.starmap.searchSaved }),
          saved.map((s) => /* @__PURE__ */ jsxs5(
            "div",
            {
              className: "group flex items-center",
              children: [
                /* @__PURE__ */ jsxs5(
                  "button",
                  {
                    className: "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-(--ui-control-active-background)",
                    onMouseDown: (e) => {
                      e.preventDefault();
                      applySaved(s);
                    },
                    type: "button",
                    children: [
                      /* @__PURE__ */ jsx7(BookmarkFilled, { className: "size-3 shrink-0 text-muted-foreground" }),
                      /* @__PURE__ */ jsx7("span", { className: "truncate", children: s.query || t.starmap.searchFiltersOnly }),
                      /* @__PURE__ */ jsx7("span", { className: "ml-auto shrink-0 text-[0.6rem] text-muted-foreground/70", children: [
                        s.kind !== "all" ? s.kind : null,
                        s.source !== "all" ? s.source : null,
                        hasActiveNarrowing("", s) && (s.from || s.to || s.year) ? "\u{1F4C5}" : null
                      ].filter(Boolean).join(" \xB7 ") })
                    ]
                  }
                ),
                /* @__PURE__ */ jsx7(
                  "button",
                  {
                    "aria-label": t.starmap.searchDeleteSaved,
                    className: "cursor-pointer px-1.5 py-1 text-muted-foreground/50 opacity-0 hover:text-destructive group-hover:opacity-100",
                    onMouseDown: (e) => {
                      e.preventDefault();
                      removeSavedSearch(s);
                    },
                    type: "button",
                    children: /* @__PURE__ */ jsx7(Trash2, { className: "size-3" })
                  }
                )
              ]
            },
            `saved:${s.query}:${s.kind}:${s.source}:${s.dateMode}:${s.from}:${s.to}:${s.year}:${s.month}`
          ))
        ] }) : null,
        recents.length > 0 ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
          /* @__PURE__ */ jsx7("div", { className: "px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground/70", children: t.starmap.searchRecent }),
          recents.map((h) => /* @__PURE__ */ jsx7(
            "button",
            {
              className: "block w-full cursor-pointer truncate px-2 py-1 text-left text-xs hover:bg-(--ui-control-active-background)",
              onMouseDown: (e) => {
                e.preventDefault();
                setQuery(h);
                commitSearchHistory(h);
                setDropdownOpen(false);
              },
              type: "button",
              children: h
            },
            `recent:${h}`
          ))
        ] }) : null
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "flex flex-wrap items-center gap-1.5", ref: filtersRef, children: [
      /* @__PURE__ */ jsxs5(
        "select",
        {
          "aria-label": t.starmap.searchKind,
          className: selectCls,
          onChange: (e) => setFilters((f) => ({ ...f, kind: e.target.value })),
          value: filters.kind,
          children: [
            /* @__PURE__ */ jsx7("option", { value: "all", children: t.starmap.searchKindAll }),
            /* @__PURE__ */ jsx7("option", { value: "memory", children: t.starmap.memory }),
            /* @__PURE__ */ jsx7("option", { value: "skill", children: t.starmap.searchKindSkills }),
            showConclusions ? /* @__PURE__ */ jsx7("option", { value: "conclusion", children: t.starmap.conclusions }) : null
          ]
        }
      ),
      /* @__PURE__ */ jsxs5(
        "select",
        {
          "aria-label": t.starmap.searchSource,
          className: selectCls,
          onChange: (e) => setFilters((f) => ({ ...f, source: e.target.value })),
          value: filters.source,
          children: [
            /* @__PURE__ */ jsx7("option", { value: "all", children: t.starmap.searchSourceAll }),
            origins.map((o) => /* @__PURE__ */ jsx7("option", { value: o, children: o === "hermes" ? t.starmap.searchSourceHermes : t.starmap.searchSourceImported(o) }, o))
          ]
        }
      ),
      /* @__PURE__ */ jsx7(Tip, { label: t.starmap.searchSave, children: /* @__PURE__ */ jsx7(
        Button,
        {
          "aria-label": t.starmap.searchSave,
          disabled: !narrowed,
          onClick: () => saveSearch(currentSaved),
          size: "icon-xs",
          variant: "ghost",
          children: /* @__PURE__ */ jsx7(Bookmark, { className: "size-3.5" })
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxs5(
        "select",
        {
          "aria-label": t.starmap.dateModeLabel,
          className: selectCls,
          onChange: (e) => setFilters((f) => ({ ...f, dateMode: e.target.value })),
          value: filters.dateMode,
          children: [
            /* @__PURE__ */ jsx7("option", { value: "range", children: t.starmap.dateModeRange }),
            /* @__PURE__ */ jsx7("option", { value: "year", children: t.starmap.dateModeYear }),
            /* @__PURE__ */ jsx7("option", { value: "yearMonth", children: t.starmap.dateModeYearMonth })
          ]
        }
      ),
      filters.dateMode === "range" ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
        /* @__PURE__ */ jsx7(
          "input",
          {
            "aria-label": t.starmap.searchFrom,
            className: `${selectCls} min-w-0 flex-1`,
            onChange: (e) => setFilters((f) => ({ ...f, from: e.target.value })),
            type: "date",
            value: filters.from
          }
        ),
        /* @__PURE__ */ jsx7("span", { className: "text-[0.6rem] text-muted-foreground/60", children: "\u2192" }),
        /* @__PURE__ */ jsx7(
          "input",
          {
            "aria-label": t.starmap.searchTo,
            className: `${selectCls} min-w-0 flex-1`,
            onChange: (e) => setFilters((f) => ({ ...f, to: e.target.value })),
            type: "date",
            value: filters.to
          }
        )
      ] }) : /* @__PURE__ */ jsxs5(Fragment3, { children: [
        /* @__PURE__ */ jsxs5(
          "select",
          {
            "aria-label": t.starmap.dateModeYear,
            className: `${selectCls} min-w-0 flex-1`,
            onChange: (e) => setFilters((f) => ({ ...f, year: e.target.value })),
            value: filters.year,
            children: [
              /* @__PURE__ */ jsx7("option", { value: "", children: t.starmap.dateYearAny }),
              years.map((y3) => /* @__PURE__ */ jsx7("option", { value: String(y3), children: y3 }, y3))
            ]
          }
        ),
        filters.dateMode === "yearMonth" ? /* @__PURE__ */ jsxs5(
          "select",
          {
            "aria-label": t.starmap.dateMonthLabel,
            className: `${selectCls} min-w-0 flex-1`,
            onChange: (e) => setFilters((f) => ({ ...f, month: e.target.value })),
            value: filters.month,
            children: [
              /* @__PURE__ */ jsx7("option", { value: "", children: t.starmap.dateMonthAny }),
              MONTHS.map((label, i) => /* @__PURE__ */ jsx7("option", { value: String(i + 1).padStart(2, "0"), children: label }, label))
            ]
          }
        ) : null
      ] })
    ] }),
    /* @__PURE__ */ jsx7("div", { className: "text-[0.62rem] text-muted-foreground/70", children: t.starmap.searchCount(results.length) }),
    /* @__PURE__ */ jsx7("div", { className: "min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5", children: results.length === 0 ? /* @__PURE__ */ jsx7("p", { className: "pt-2 text-xs text-muted-foreground", children: t.starmap.searchEmpty }) : results.map((n) => /* @__PURE__ */ jsx7(
      SearchRow,
      {
        conclusionColor,
        isConclusion: conclusionSet.has(n.id),
        memoryColor,
        node: n,
        onFocusNode,
        onNodeMenu
      },
      n.id
    )) })
  ] });
}
function SearchRow({
  conclusionColor,
  isConclusion: isConclusion3,
  memoryColor,
  node,
  onFocusNode,
  onNodeMenu
}) {
  const origin = nodeOrigin(node);
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      className: "group flex w-full cursor-pointer items-start gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-left hover:border-(--ui-stroke-secondary) hover:bg-(--ui-control-active-background)",
      onClick: () => onFocusNode(node.id),
      onContextMenu: (e) => {
        e.preventDefault();
        onNodeMenu(node.id, e.clientX, e.clientY);
      },
      role: "button",
      tabIndex: 0,
      children: [
        isConclusion3 ? /* @__PURE__ */ jsx7(
          "span",
          {
            className: "mt-1 inline-block size-2 shrink-0",
            style: { backgroundColor: conclusionColor, clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)" }
          }
        ) : node.kind === "memory" ? /* @__PURE__ */ jsx7("span", { className: "mt-1 inline-block size-2 shrink-0 rotate-45", style: { backgroundColor: memoryColor } }) : /* @__PURE__ */ jsx7("span", { className: "mt-1 inline-block size-2 shrink-0 rounded-full bg-[var(--theme-primary)]/80" }),
        /* @__PURE__ */ jsxs5("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx7("span", { className: "block truncate text-xs leading-tight", children: node.label }),
          /* @__PURE__ */ jsx7("span", { className: "block text-[0.6rem] text-muted-foreground/70", children: [fmtTs2(node.timestamp), origin !== "hermes" ? origin : null].filter(Boolean).join(" \xB7 ") })
        ] }),
        /* @__PURE__ */ jsx7(
          "button",
          {
            "aria-label": "\u22EF",
            className: "mt-0.5 shrink-0 cursor-pointer rounded px-1 text-xs text-muted-foreground/60 opacity-0 hover:text-foreground group-hover:opacity-100",
            onClick: (e) => {
              e.stopPropagation();
              onNodeMenu(node.id, e.clientX, e.clientY);
            },
            type: "button",
            children: "\u22EF"
          }
        )
      ]
    }
  );
}

// tools/node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x3 = (i & 43690) >> 1 | (i & 21845) << 1;
  x3 = (x3 & 52428) >> 2 | (x3 & 13107) << 2;
  x3 = (x3 & 61680) >> 4 | (x3 & 3855) << 4;
  rev[i] = ((x3 & 65280) >> 8 | (x3 & 255) << 8) >> 1;
}
var x3;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m2 = v | (1 << r_1) - 1; v <= m2; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a2) {
  var m2 = a2[0];
  for (var i = 1; i < a2.length; ++i) {
    if (a2[i] > m2)
      m2 = a2[i];
  }
  return m2;
};
var bits = function(d, p, m2) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m2;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c2 = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c2 = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c2;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c2 = lm[bits16(dat, pos) & lms], sym = c2 >> 4;
      pos += c2 & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c2)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add2 = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add2 = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add2;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a2, b) {
    return a2.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a2, b) {
      return tr[b.s] - tr[a2.s] || a2.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c2) {
  var s = c2.length;
  while (s && !c2[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c2[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c2[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c2[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c2 = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c2, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// src/lib/text.ts
function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// src/lib/loadout.ts
var BitWriter = class {
  bits = [];
  bit(v) {
    this.bits.push(v ? 1 : 0);
  }
  uint(value, width) {
    let v = value >>> 0;
    for (let i = 0; i < width; i += 1) {
      this.bits.push(v & 1);
      v >>>= 1;
    }
  }
  // LEB128-style varint: 7 payload bits per group, high "continue" bit set while
  // more groups follow.
  varint(value) {
    let v = Math.max(0, Math.floor(value));
    do {
      const group = v & 127;
      v = Math.floor(v / 128);
      this.bit(v > 0 ? 1 : 0);
      this.uint(group, 7);
    } while (v > 0);
  }
  str(s) {
    const bytes = new TextEncoder().encode(s);
    this.varint(bytes.length);
    for (const b of bytes) {
      this.uint(b, 8);
    }
  }
  bytes() {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i += 1) {
      if (this.bits[i]) {
        out[i >> 3] |= 1 << (i & 7);
      }
    }
    return out;
  }
};
var BitReader = class {
  constructor(buf) {
    this.buf = buf;
  }
  pos = 0;
  bit() {
    if (this.pos >= this.buf.length * 8) {
      throw new RangeError("loadout truncated");
    }
    const i = this.pos++;
    return this.buf[i >> 3] >> (i & 7) & 1;
  }
  uint(width) {
    let v = 0;
    for (let i = 0; i < width; i += 1) {
      v |= this.bit() << i;
    }
    return v >>> 0;
  }
  varint() {
    let v = 0;
    let shift = 0;
    for (; ; ) {
      const cont = this.bit();
      v += this.uint(7) * 2 ** shift;
      shift += 7;
      if (!cont) {
        return v;
      }
    }
  }
  str() {
    const len = this.varint();
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = this.uint(8);
    }
    return new TextDecoder().decode(bytes);
  }
};
var Dict = class {
  index = /* @__PURE__ */ new Map();
  list = [];
  id(s) {
    const hit = this.index.get(s);
    if (hit !== void 0) {
      return hit;
    }
    const id = this.list.length;
    this.index.set(s, id);
    this.list.push(s);
    return id;
  }
};
var idxOf = (table, value) => {
  const i = table.indexOf(value);
  return i < 0 ? 0 : i;
};
var indexBits = (n) => n <= 1 ? 1 : Math.ceil(Math.log2(n));
function toBase64Url(buf) {
  let bin = "";
  for (const b of buf) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - b64.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}
function checksum16(buf) {
  let h = 2166136261;
  for (const b of buf) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 & 65535;
}
var LoadoutError = class extends Error {
};
var HEAD_BYTES = 3;
function createLoadout(spec) {
  const Err = spec.error ?? LoadoutError;
  const noun = spec.noun ?? "code";
  const Noun = capitalize(noun);
  const encode = (value) => {
    const body = new BitWriter();
    spec.write(body, value);
    const payload = deflateSync(body.bytes(), { level: 9 });
    const head = new BitWriter();
    head.uint(spec.version, 8);
    head.uint(checksum16(payload), 16);
    const headBytes = head.bytes();
    const framed = new Uint8Array(headBytes.length + payload.length);
    framed.set(headBytes, 0);
    framed.set(payload, headBytes.length);
    return spec.prefix + toBase64Url(framed);
  };
  const decode = (code) => {
    const cleaned = code.replace(/\s+/g, "");
    const raw = cleaned.startsWith(spec.prefix) ? cleaned.slice(spec.prefix.length) : cleaned;
    if (!raw) {
      throw new Err(`That doesn't look like a ${noun}.`);
    }
    let framed;
    try {
      framed = fromBase64Url(raw);
    } catch {
      throw new Err(`That doesn't look like a ${noun}.`);
    }
    if (framed.length <= HEAD_BYTES) {
      throw new Err(`${Noun} is too short to be valid.`);
    }
    const head = new BitReader(framed.subarray(0, HEAD_BYTES));
    const version = head.uint(8);
    const storedSum = head.uint(16);
    const read = version === spec.version ? spec.read : spec.legacyReads?.[version];
    if (!read) {
      throw new Err(`${Noun} is version ${version}; this build reads version ${spec.version}.`);
    }
    const payload = framed.subarray(HEAD_BYTES);
    if (checksum16(payload) !== storedSum) {
      throw new Err(`${Noun} looks corrupted (checksum mismatch).`);
    }
    try {
      return read(new BitReader(inflateSync(payload)));
    } catch (err2) {
      throw new Err(err2 instanceof Error ? `${Noun} is malformed: ${err2.message}` : `${Noun} is malformed.`);
    }
  };
  return { decode, encode };
}

// src/app/starmap/share-code.ts
var VERSION = 4;
var PREFIX2 = "HML";
var MAX_LABEL = 64;
var trim = (s) => s.length > MAX_LABEL ? s.slice(0, MAX_LABEL) : s;
var KINDS = ["skill", "memory"];
var STATES = ["active", "archived", "disabled", "draft"];
var MEM_SOURCES = ["none", "memory", "profile", "other"];
var OTHER_SOURCE = 3;
var CREATED_BY = ["none", "agent", "user", "learn"];
var REC_BITS = 12;
var REC_MAX = (1 << REC_BITS) - 1;
var finiteTs = (v) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null;
function writeNode(w, n, dict, minTs, span) {
  w.uint(idxOf(KINDS, n.kind), 1);
  w.varint(dict.id(trim(n.label || "")));
  w.varint(dict.id(n.category || ""));
  w.varint(Math.max(0, n.useCount | 0));
  w.uint(idxOf(STATES, n.state), 2);
  const src = n.memorySource ?? "none";
  if (isProviderSource(src)) {
    w.uint(OTHER_SOURCE, 2);
    w.varint(dict.id(src));
  } else {
    w.uint(idxOf(MEM_SOURCES, src), 2);
  }
  w.uint(idxOf(CREATED_BY, n.createdBy ?? "none"), 2);
  w.bit(n.pinned);
  const ts = finiteTs(n.timestamp);
  if (ts === null) {
    w.bit(0);
  } else {
    w.bit(1);
    w.uint(span > 0 ? Math.round((ts - minTs) / span * REC_MAX) : 0, REC_BITS);
  }
}
function readNode(r, dict, i, minTs, span, version) {
  const kind = KINDS[r.uint(1)] ?? "skill";
  const label = dict[r.varint()] ?? "";
  const category = dict[r.varint()] ?? "";
  const useCount = r.varint();
  const state = STATES[r.uint(2)] ?? "active";
  const memSlot = r.uint(2);
  const memSrc = version >= 4 && memSlot === OTHER_SOURCE ? dict[r.varint()] ?? "memory" : MEM_SOURCES[memSlot] ?? "none";
  const createdBy = CREATED_BY[r.uint(2)] ?? "none";
  const pinned = r.bit() === 1;
  const timestamp = r.bit() === 1 ? minTs + (span > 0 ? Math.round(r.uint(REC_BITS) / REC_MAX * span) : 0) : null;
  const isMemory = kind === "memory";
  const source = memSrc === "none" ? "memory" : memSrc;
  return {
    category,
    createdBy: createdBy === "none" ? null : createdBy,
    id: isMemory ? `memory:${source}:${i}` : `s${i}`,
    kind,
    label,
    memorySource: isMemory ? source : void 0,
    pinned,
    state,
    timestamp,
    useCount
  };
}
function writeGraph(w, graph) {
  const dict = new Dict();
  for (const n of graph.nodes) {
    dict.id(trim(n.label || ""));
    dict.id(n.category || "");
    if (isProviderSource(n.memorySource)) {
      dict.id(n.memorySource);
    }
  }
  const stamps = graph.nodes.map((n) => finiteTs(n.timestamp)).filter((v) => v !== null);
  const minTs = stamps.length ? Math.min(...stamps) : 0;
  const maxTs = stamps.length ? Math.max(...stamps) : 0;
  const span = maxTs - minTs;
  w.varint(minTs);
  w.varint(maxTs);
  w.varint(dict.list.length);
  for (const s of dict.list) {
    w.str(s);
  }
  w.varint(graph.nodes.length);
  for (const n of graph.nodes) {
    writeNode(w, n, dict, minTs, span);
  }
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const edges = graph.edges.filter((e) => order.has(e.source) && order.has(e.target));
  const bits2 = indexBits(graph.nodes.length);
  w.varint(edges.length);
  for (const e of edges) {
    w.uint(order.get(e.source), bits2);
    w.uint(order.get(e.target), bits2);
  }
}
var readGraph = (version) => (r) => {
  const minTs = r.varint();
  const maxTs = r.varint();
  const span = maxTs - minTs;
  const dictLen = r.varint();
  const dict = [];
  for (let i = 0; i < dictLen; i += 1) {
    dict.push(r.str());
  }
  const nodeCount = r.varint();
  const nodes = [];
  for (let i = 0; i < nodeCount; i += 1) {
    nodes.push(readNode(r, dict, i, minTs, span, version));
  }
  const bits2 = indexBits(nodeCount);
  const edgeCount = r.varint();
  const edges = [];
  for (let i = 0; i < edgeCount; i += 1) {
    const src = nodes[r.uint(bits2)];
    const dst = nodes[r.uint(bits2)];
    if (src && dst) {
      edges.push({ source: src.id, target: dst.id });
    }
  }
  const counts = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
  }
  const clusters = [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a2, b) => b.count - a2.count);
  return { clusters, edges, memory: [], nodes, stats: { imported: true } };
};
var ShareCodeError = class extends LoadoutError {
};
var codec = createLoadout({
  error: ShareCodeError,
  legacyReads: { 3: readGraph(3) },
  noun: "map code",
  prefix: PREFIX2,
  read: readGraph(VERSION),
  version: VERSION,
  write: writeGraph
});
function encodeShareCode(graph) {
  return codec.encode(graph);
}
function decodeShareCode(code) {
  return codec.decode(code);
}

// src/app/starmap/share-controls.tsx
import { useState as useState7 } from "react";
import { jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
function ShareControls({ imported = false, onImport, onResetMap, shareCode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState7(false);
  const [value, setValue] = useState7("");
  const [error, setError] = useState7(null);
  const own = (shareCode ?? "").trim();
  const code = value.trim();
  const canLoad = code !== "" && code !== own;
  const load = () => {
    if (!code) {
      setError(t.starmap.importEmpty);
      return;
    }
    const err2 = onImport?.(code) ?? null;
    setError(err2);
    if (err2 === null) {
      setOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-1", children: [
    imported && /* @__PURE__ */ jsx8(
      Button,
      {
        className: "text-muted-foreground hover:text-foreground",
        onClick: () => onResetMap?.(),
        size: "xs",
        variant: "text",
        children: t.starmap.resetToMine
      }
    ),
    /* @__PURE__ */ jsxs6(
      Dialog,
      {
        onOpenChange: (next) => {
          setOpen(next);
          setError(null);
          if (next) {
            setValue(shareCode ?? "");
          }
        },
        open,
        children: [
          /* @__PURE__ */ jsx8(Tip, { label: t.starmap.shareTitle, children: /* @__PURE__ */ jsx8(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx8(
            Button,
            {
              "aria-label": t.starmap.shareTitle,
              className: "text-muted-foreground hover:text-foreground",
              size: "icon",
              variant: "ghost",
              children: /* @__PURE__ */ jsx8(Upload, { className: "size-3.5" })
            }
          ) }) }),
          /* @__PURE__ */ jsxs6(DialogContent, { className: "max-w-md", children: [
            /* @__PURE__ */ jsxs6(DialogHeader, { children: [
              /* @__PURE__ */ jsx8(DialogTitle, { children: t.starmap.shareTitle }),
              /* @__PURE__ */ jsx8(DialogDescription, { children: t.starmap.shareHint })
            ] }),
            /* @__PURE__ */ jsxs6("div", { className: "group/code relative", children: [
              /* @__PURE__ */ jsx8(
                "textarea",
                {
                  "aria-label": t.starmap.shareTitle,
                  className: "h-24 w-full resize-none rounded-md bg-foreground/5 p-2.5 pr-9 font-mono text-xs leading-relaxed break-all text-muted-foreground/90 outline-none transition placeholder:text-muted-foreground/50 focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40",
                  onChange: (e) => {
                    setValue(e.target.value);
                    setError(null);
                  },
                  placeholder: t.starmap.sharePlaceholder,
                  spellCheck: false,
                  value
                }
              ),
              code !== "" && /* @__PURE__ */ jsx8(
                CopyButton,
                {
                  appearance: "inline",
                  className: "absolute right-1.5 top-1.5 h-5 gap-0 rounded-md px-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/code:opacity-100 hover:opacity-100",
                  iconClassName: "size-3",
                  label: t.starmap.copy,
                  showLabel: false,
                  text: value
                }
              )
            ] }),
            error && /* @__PURE__ */ jsx8("p", { className: "text-[0.7rem] text-destructive", children: error }),
            /* @__PURE__ */ jsx8(Button, { className: "w-full", disabled: !canLoad, onClick: load, type: "button", children: t.starmap.importBtn })
          ] })
        ]
      }
    )
  ] });
}

// tools/node_modules/d3-quadtree/src/add.js
function add_default(d) {
  const x3 = +this._x.call(null, d), y3 = +this._y.call(null, d);
  return add(this.cover(x3, y3), x3, y3, d);
}
function add(tree, x3, y3, d) {
  if (isNaN(x3) || isNaN(y3)) return tree;
  var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
  if (!node) return tree._root = leaf, tree;
  while (node.length) {
    if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x3 === xp && y3 === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll(data) {
  var d, i, n = data.length, x3, y3, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (i = 0; i < n; ++i) {
    if (isNaN(x3 = +this._x.call(null, d = data[i])) || isNaN(y3 = +this._y.call(null, d))) continue;
    xz[i] = x3;
    yz[i] = y3;
    if (x3 < x0) x0 = x3;
    if (x3 > x1) x1 = x3;
    if (y3 < y0) y0 = y3;
    if (y3 > y1) y1 = y3;
  }
  if (x0 > x1 || y0 > y1) return this;
  this.cover(x0, y0).cover(x1, y1);
  for (i = 0; i < n; ++i) {
    add(this, xz[i], yz[i], data[i]);
  }
  return this;
}

// tools/node_modules/d3-quadtree/src/cover.js
function cover_default(x3, y3) {
  if (isNaN(x3 = +x3) || isNaN(y3 = +y3)) return this;
  var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x3)) + 1;
    y1 = (y0 = Math.floor(y3)) + 1;
  } else {
    var z = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x3 || x3 >= x1 || y0 > y3 || y3 >= y1) {
      i = (y3 < y0) << 1 | x3 < x0;
      parent = new Array(4), parent[i] = node, node = parent, z *= 2;
      switch (i) {
        case 0:
          x1 = x0 + z, y1 = y0 + z;
          break;
        case 1:
          x0 = x1 - z, y1 = y0 + z;
          break;
        case 2:
          x1 = x0 + z, y0 = y1 - z;
          break;
        case 3:
          x0 = x1 - z, y0 = y1 - z;
          break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
}

// tools/node_modules/d3-quadtree/src/data.js
function data_default() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do
      data.push(node.data);
    while (node = node.next);
  });
  return data;
}

// tools/node_modules/d3-quadtree/src/extent.js
function extent_default(_) {
  return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
}

// tools/node_modules/d3-quadtree/src/quad.js
function quad_default(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}

// tools/node_modules/d3-quadtree/src/find.js
function find_default(x3, y3, radius) {
  var data, x0 = this._x0, y0 = this._y0, x1, y1, x22, y22, x32 = this._x1, y32 = this._y1, quads = [], node = this._root, q, i;
  if (node) quads.push(new quad_default(node, x0, y0, x32, y32));
  if (radius == null) radius = Infinity;
  else {
    x0 = x3 - radius, y0 = y3 - radius;
    x32 = x3 + radius, y32 = y3 + radius;
    radius *= radius;
  }
  while (q = quads.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x32 || (y1 = q.y0) > y32 || (x22 = q.x1) < x0 || (y22 = q.y1) < y0) continue;
    if (node.length) {
      var xm = (x1 + x22) / 2, ym = (y1 + y22) / 2;
      quads.push(
        new quad_default(node[3], xm, ym, x22, y22),
        new quad_default(node[2], x1, ym, xm, y22),
        new quad_default(node[1], xm, y1, x22, ym),
        new quad_default(node[0], x1, y1, xm, ym)
      );
      if (i = (y3 >= ym) << 1 | x3 >= xm) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    } else {
      var dx = x3 - +this._x.call(null, node.data), dy = y3 - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x3 - d, y0 = y3 - d;
        x32 = x3 + d, y32 = y3 + d;
        data = node.data;
      }
    }
  }
  return data;
}

// tools/node_modules/d3-quadtree/src/remove.js
function remove_default(d) {
  if (isNaN(x3 = +this._x.call(null, d)) || isNaN(y3 = +this._y.call(null, d))) return this;
  var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x3, y3, xm, ym, right, bottom, i, j;
  if (!node) return this;
  if (node.length) while (true) {
    if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3]) retainer = parent, j = i;
  }
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  if (previous) return next ? previous.next = next : delete previous.next, this;
  if (!parent) return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }
  return this;
}
function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}

// tools/node_modules/d3-quadtree/src/root.js
function root_default() {
  return this._root;
}

// tools/node_modules/d3-quadtree/src/size.js
function size_default() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do
      ++size;
    while (node = node.next);
  });
  return size;
}

// tools/node_modules/d3-quadtree/src/visit.js
function visit_default(callback) {
  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
  if (node) quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
      if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
    }
  }
  return this;
}

// tools/node_modules/d3-quadtree/src/visitAfter.js
function visitAfter_default(callback) {
  var quads = [], next = [], q;
  if (this._root) quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
      if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}

// tools/node_modules/d3-quadtree/src/x.js
function defaultX(d) {
  return d[0];
}
function x_default(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

// tools/node_modules/d3-quadtree/src/y.js
function defaultY(d) {
  return d[1];
}
function y_default(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}

// tools/node_modules/d3-quadtree/src/quadtree.js
function quadtree(nodes, x3, y3) {
  var tree = new Quadtree(x3 == null ? defaultX : x3, y3 == null ? defaultY : y3, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Quadtree(x3, y3, x0, y0, x1, y1) {
  this._x = x3;
  this._y = y3;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = void 0;
}
function leaf_copy(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next) next = next.next = { data: leaf.data };
  return copy;
}
var treeProto = quadtree.prototype = Quadtree.prototype;
treeProto.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
  if (!node) return copy;
  if (!node.length) return copy._root = leaf_copy(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(4) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({ source: child, target: node.target[i] = new Array(4) });
        else node.target[i] = leaf_copy(child);
      }
    }
  }
  return copy;
};
treeProto.add = add_default;
treeProto.addAll = addAll;
treeProto.cover = cover_default;
treeProto.data = data_default;
treeProto.extent = extent_default;
treeProto.find = find_default;
treeProto.remove = remove_default;
treeProto.removeAll = removeAll;
treeProto.root = root_default;
treeProto.size = size_default;
treeProto.visit = visit_default;
treeProto.visitAfter = visitAfter_default;
treeProto.x = x_default;
treeProto.y = y_default;

// tools/node_modules/d3-force/src/constant.js
function constant_default(x3) {
  return function() {
    return x3;
  };
}

// tools/node_modules/d3-force/src/jiggle.js
function jiggle_default(random) {
  return (random() - 0.5) * 1e-6;
}

// tools/node_modules/d3-force/src/collide.js
function x(d) {
  return d.x + d.vx;
}
function y(d) {
  return d.y + d.vy;
}
function collide_default(radius) {
  var nodes, radii, random, strength = 1, iterations = 1;
  if (typeof radius !== "function") radius = constant_default(radius == null ? 1 : +radius);
  function force() {
    var i, n = nodes.length, tree, node, xi, yi, ri, ri2;
    for (var k = 0; k < iterations; ++k) {
      tree = quadtree(nodes, x, y).visitAfter(prepare);
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        ri = radii[node.index], ri2 = ri * ri;
        xi = node.x + node.vx;
        yi = node.y + node.vy;
        tree.visit(apply);
      }
    }
    function apply(quad, x0, y0, x1, y1) {
      var data = quad.data, rj = quad.r, r = ri + rj;
      if (data) {
        if (data.index > node.index) {
          var x3 = xi - data.x - data.vx, y3 = yi - data.y - data.vy, l = x3 * x3 + y3 * y3;
          if (l < r * r) {
            if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
            if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
            l = (r - (l = Math.sqrt(l))) / l * strength;
            node.vx += (x3 *= l) * (r = (rj *= rj) / (ri2 + rj));
            node.vy += (y3 *= l) * r;
            data.vx -= x3 * (r = 1 - r);
            data.vy -= y3 * r;
          }
        }
        return;
      }
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
    }
  }
  function prepare(quad) {
    if (quad.data) return quad.r = radii[quad.data.index];
    for (var i = quad.r = 0; i < 4; ++i) {
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r;
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    radii = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
  }
  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };
  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : radius;
  };
  return force;
}

// tools/node_modules/d3-force/src/link.js
function index(d) {
  return d.index;
}
function find(nodeById, nodeId) {
  var node = nodeById.get(nodeId);
  if (!node) throw new Error("node not found: " + nodeId);
  return node;
}
function link_default(links) {
  var id = index, strength = defaultStrength, strengths, distance = constant_default(30), distances, nodes, count, bias, random, iterations = 1;
  if (links == null) links = [];
  function defaultStrength(link) {
    return 1 / Math.min(count[link.source.index], count[link.target.index]);
  }
  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x3, y3, l, b; i < n; ++i) {
        link = links[i], source = link.source, target = link.target;
        x3 = target.x + target.vx - source.x - source.vx || jiggle_default(random);
        y3 = target.y + target.vy - source.y - source.vy || jiggle_default(random);
        l = Math.sqrt(x3 * x3 + y3 * y3);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x3 *= l, y3 *= l;
        target.vx -= x3 * (b = bias[i]);
        target.vy -= y3 * b;
        source.vx += x3 * (b = 1 - b);
        source.vy += y3 * b;
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, m2 = links.length, nodeById = new Map(nodes.map((d, i2) => [id(d, i2, nodes), d])), link;
    for (i = 0, count = new Array(n); i < m2; ++i) {
      link = links[i], link.index = i;
      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
      count[link.source.index] = (count[link.source.index] || 0) + 1;
      count[link.target.index] = (count[link.target.index] || 0) + 1;
    }
    for (i = 0, bias = new Array(m2); i < m2; ++i) {
      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }
    strengths = new Array(m2), initializeStrength();
    distances = new Array(m2), initializeDistance();
  }
  function initializeStrength() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }
  function initializeDistance() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      distances[i] = +distance(links[i], i, links);
    }
  }
  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };
  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };
  force.id = function(_) {
    return arguments.length ? (id = _, force) : id;
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initializeStrength(), force) : strength;
  };
  force.distance = function(_) {
    return arguments.length ? (distance = typeof _ === "function" ? _ : constant_default(+_), initializeDistance(), force) : distance;
  };
  return force;
}

// tools/node_modules/d3-dispatch/src/dispatch.js
var noop = { value: () => {
} };
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return { type: t, name };
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};
function get(type, name) {
  for (var i = 0, n = type.length, c2; i < n; ++i) {
    if ((c2 = type[i]).name === name) {
      return c2.value;
    }
  }
}
function set(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({ name, value: callback });
  return type;
}
var dispatch_default = dispatch;

// tools/node_modules/d3-timer/src/timer.js
var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1e3;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
  setTimeout(f, 17);
};
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call = this._time = this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer();
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now();
  ++frame;
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now2 = clock.now(), delay = now2 - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame) return;
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

// tools/node_modules/d3-force/src/lcg.js
var a = 1664525;
var c = 1013904223;
var m = 4294967296;
function lcg_default() {
  let s = 1;
  return () => (s = (a * s + c) % m) / m;
}

// tools/node_modules/d3-force/src/simulation.js
function x2(d) {
  return d.x;
}
function y2(d) {
  return d.y;
}
var initialRadius = 10;
var initialAngle = Math.PI * (3 - Math.sqrt(5));
function simulation_default(nodes) {
  var simulation, alpha = 1, alphaMin = 1e-3, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = 0.6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch_default("tick", "end"), random = lcg_default();
  if (nodes == null) nodes = [];
  function step() {
    tick();
    event.call("tick", simulation);
    if (alpha < alphaMin) {
      stepper.stop();
      event.call("end", simulation);
    }
  }
  function tick(iterations) {
    var i, n = nodes.length, node;
    if (iterations === void 0) iterations = 1;
    for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;
      forces.forEach(function(force) {
        force(alpha);
      });
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (node.fx == null) node.x += node.vx *= velocityDecay;
        else node.x = node.fx, node.vx = 0;
        if (node.fy == null) node.y += node.vy *= velocityDecay;
        else node.y = node.fy, node.vy = 0;
      }
    }
    return simulation;
  }
  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.index = i;
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (isNaN(node.x) || isNaN(node.y)) {
        var radius = initialRadius * Math.sqrt(0.5 + i), angle = i * initialAngle;
        node.x = radius * Math.cos(angle);
        node.y = radius * Math.sin(angle);
      }
      if (isNaN(node.vx) || isNaN(node.vy)) {
        node.vx = node.vy = 0;
      }
    }
  }
  function initializeForce(force) {
    if (force.initialize) force.initialize(nodes, random);
    return force;
  }
  initializeNodes();
  return simulation = {
    tick,
    restart: function() {
      return stepper.restart(step), simulation;
    },
    stop: function() {
      return stepper.stop(), simulation;
    },
    nodes: function(_) {
      return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
    },
    alpha: function(_) {
      return arguments.length ? (alpha = +_, simulation) : alpha;
    },
    alphaMin: function(_) {
      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
    },
    alphaDecay: function(_) {
      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
    },
    alphaTarget: function(_) {
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    },
    velocityDecay: function(_) {
      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
    },
    randomSource: function(_) {
      return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
    },
    force: function(name, _) {
      return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
    },
    find: function(x3, y3, radius) {
      var i = 0, n = nodes.length, dx, dy, d2, node, closest;
      if (radius == null) radius = Infinity;
      else radius *= radius;
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x3 - node.x;
        dy = y3 - node.y;
        d2 = dx * dx + dy * dy;
        if (d2 < radius) closest = node, radius = d2;
      }
      return closest;
    },
    on: function(name, _) {
      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
    }
  };
}

// tools/node_modules/d3-force/src/manyBody.js
function manyBody_default() {
  var nodes, node, random, alpha, strength = constant_default(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = 0.81;
  function force(_) {
    var i, n = nodes.length, tree = quadtree(nodes, x2, y2).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node2;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) node2 = nodes[i], strengths[node2.index] = +strength(node2, i, nodes);
  }
  function accumulate(quad) {
    var strength2 = 0, q, c2, weight = 0, x3, y3, i;
    if (quad.length) {
      for (x3 = y3 = i = 0; i < 4; ++i) {
        if ((q = quad[i]) && (c2 = Math.abs(q.value))) {
          strength2 += q.value, weight += c2, x3 += c2 * q.x, y3 += c2 * q.y;
        }
      }
      quad.x = x3 / weight;
      quad.y = y3 / weight;
    } else {
      q = quad;
      q.x = q.data.x;
      q.y = q.data.y;
      do
        strength2 += strengths[q.data.index];
      while (q = q.next);
    }
    quad.value = strength2;
  }
  function apply(quad, x1, _, x22) {
    if (!quad.value) return true;
    var x3 = quad.x - node.x, y3 = quad.y - node.y, w = x22 - x1, l = x3 * x3 + y3 * y3;
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
        if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x3 * quad.value * alpha / l;
        node.vy += y3 * quad.value * alpha / l;
      }
      return true;
    } else if (quad.length || l >= distanceMax2) return;
    if (quad.data !== node || quad.next) {
      if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
      if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
    }
    do
      if (quad.data !== node) {
        w = strengths[quad.data.index] * alpha / l;
        node.vx += x3 * w;
        node.vy += y3 * w;
      }
    while (quad = quad.next);
  }
  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : strength;
  };
  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };
  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };
  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };
  return force;
}

// tools/node_modules/d3-force/src/radial.js
function radial_default(radius, x3, y3) {
  var nodes, strength = constant_default(0.1), strengths, radiuses;
  if (typeof radius !== "function") radius = constant_default(+radius);
  if (x3 == null) x3 = 0;
  if (y3 == null) y3 = 0;
  function force(alpha) {
    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i], dx = node.x - x3 || 1e-6, dy = node.y - y3 || 1e-6, r = Math.sqrt(dx * dx + dy * dy), k = (radiuses[i] - r) * strengths[i] * alpha / r;
      node.vx += dx * k;
      node.vy += dy * k;
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    radiuses = new Array(n);
    for (i = 0; i < n; ++i) {
      radiuses[i] = +radius(nodes[i], i, nodes);
      strengths[i] = isNaN(radiuses[i]) ? 0 : +strength(nodes[i], i, nodes);
    }
  }
  force.initialize = function(_) {
    nodes = _, initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : strength;
  };
  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : radius;
  };
  force.x = function(_) {
    return arguments.length ? (x3 = +_, force) : x3;
  };
  force.y = function(_) {
    return arguments.length ? (y3 = +_, force) : y3;
  };
  return force;
}

// src/app/starmap/time-axis.ts
var LEAD_IN = 0.06;
var recForRatio = (ratio) => LEAD_IN + (1 - LEAD_IN) * clamp(ratio, 0, 1);
function computeRecency(nodes) {
  const known = nodes.map((n) => typeof n.timestamp === "number" && Number.isFinite(n.timestamp) ? Number(n.timestamp) : null).filter((v) => v !== null);
  const minTs = known.length ? Math.min(...known) : null;
  const maxTs = known.length ? Math.max(...known) : null;
  const timed = minTs !== null && maxTs !== null && maxTs > minTs;
  const ordered = [...nodes].sort((a2, b) => {
    const at = typeof a2.timestamp === "number" ? a2.timestamp : Infinity;
    const bt = typeof b.timestamp === "number" ? b.timestamp : Infinity;
    return at === bt ? a2.id.localeCompare(b.id) : at - bt;
  });
  const ordRatio = new Map(ordered.map((n, i) => [n.id, ordered.length > 1 ? i / (ordered.length - 1) : 0]));
  const rec = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    const ratio = timed && typeof n.timestamp === "number" && minTs !== null && maxTs !== null ? (Number(n.timestamp) - minTs) / (maxTs - minTs) : ordRatio.get(n.id) ?? 0;
    rec.set(n.id, recForRatio(ratio));
  }
  return { maxTs, minTs, rec, timed };
}
function buildTimeAxis(graph, bucketCount = 48) {
  const { maxTs, minTs, rec, timed } = computeRecency(graph.nodes);
  const n = Math.max(1, bucketCount);
  const buckets = Array.from({ length: n }, () => ({ memory: 0, skill: 0, total: 0 }));
  for (const node of graph.nodes) {
    const r = rec.get(node.id) ?? 0;
    const idx = clamp(Math.floor(r * n), 0, n - 1);
    const b = buckets[idx];
    b.total += 1;
    if (node.kind === "memory") {
      b.memory += 1;
    } else {
      b.skill += 1;
    }
  }
  const maxTotal = buckets.reduce((m2, b) => Math.max(m2, b.total), 0);
  return { buckets, maxTotal, maxTs, minTs, size: graph.nodes.length, timed };
}
function dateAtReveal(axis, reveal) {
  if (!axis.timed || axis.minTs === null || axis.maxTs === null) {
    return null;
  }
  return Math.round(axis.minTs + clamp(reveal, 0, 1) * (axis.maxTs - axis.minTs));
}

// src/app/starmap/simulation.ts
var DAY = 86400;
var CLUSTER_SIZE = 5;
var RING_CORE = radiusForRecency(recForRatio(0));
var RING_BAND = (radiusForRecency(recForRatio(1)) - RING_CORE) / RING_STEPS;
var ringRadius = (i) => RING_CORE + i * RING_BAND;
var placeRadius = (i, id) => {
  const outer = ringRadius(i);
  const inner = i > 0 ? ringRadius(i - 1) : RING_CORE - RING_BAND * 0.5;
  const h = hash(id) % 1e3 / 1e3;
  return outer - (0.15 + 0.7 * h) * (outer - inner);
};
var UNITS = [
  { kind: "day", step: 1 },
  { kind: "day", step: 2 },
  { kind: "day", step: 7 },
  { kind: "day", step: 14 },
  { kind: "month", step: 1 },
  { kind: "month", step: 2 },
  { kind: "month", step: 3 },
  { kind: "month", step: 6 },
  { kind: "month", step: 12 }
];
function bucketStart(ts, { kind, step }) {
  if (kind === "day") {
    const period = step * DAY;
    return Math.floor(ts / period) * period;
  }
  const d = new Date(ts * 1e3);
  d.setUTCHours(0, 0, 0, 0);
  const absMonth = Math.floor((d.getUTCFullYear() * 12 + d.getUTCMonth()) / step) * step;
  d.setUTCFullYear(Math.floor(absMonth / 12), absMonth % 12, 1);
  return Math.floor(d.getTime() / 1e3);
}
var populatedStarts = (stamps, u) => [...new Set(stamps.map((t) => bucketStart(t, u)))].sort((a2, b) => a2 - b);
function chooseUnit(stamps, spanDays) {
  const target = clamp(Math.round(4 + Math.log2(Math.max(1, spanDays / 60))), 5, 12);
  let best = UNITS[0];
  let bestScore = Infinity;
  for (const u of UNITS) {
    const count = populatedStarts(stamps, u).length;
    if (!count) {
      continue;
    }
    const score = Math.abs(count - target) + (count > target ? 0.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}
function bucketLabel(ts, { kind, step }) {
  if (kind === "day") {
    return formatDate(ts);
  }
  try {
    const d = new Date(ts * 1e3);
    return step >= 12 ? String(d.getUTCFullYear()) : d.toLocaleDateString(void 0, { month: "short", timeZone: "UTC", year: "numeric" });
  } catch {
    return formatDate(ts);
  }
}
function evenLayout(recById, minTs, maxTs, timed) {
  const rings = Array.from({ length: RING_STEPS + 1 }, (_, i) => ({
    label: timed && minTs !== null && maxTs !== null ? formatDate(Math.round(minTs + (maxTs - minTs) * (i / RING_STEPS))) : null,
    r: ringRadius(i),
    ratio: recForRatio(i / RING_STEPS)
  }));
  const capRing = (rec) => {
    for (let i = 0; i < rings.length; i += 1) {
      if ((rings[i]?.ratio ?? 1) >= rec - 1e-3) {
        return i;
      }
    }
    return rings.length - 1;
  };
  return {
    index: (n) => capRing(recById.get(n.id) ?? 0),
    rec: (n) => recById.get(n.id) ?? 0,
    rings,
    tr: (n) => radiusForRecency(recById.get(n.id) ?? 0)
  };
}
function buildLayout(graph, recById, minTs, maxTs, timed) {
  const stamps = graph.nodes.map((n) => Number(n.timestamp)).filter(Number.isFinite);
  if (!(timed && minTs !== null && maxTs !== null && maxTs > minTs && stamps.length)) {
    return evenLayout(recById, minTs, maxTs, timed);
  }
  const span = maxTs - minTs;
  const unit = chooseUnit(stamps, span / DAY);
  const starts = populatedStarts(stamps, unit);
  if (starts.length < 2) {
    return evenLayout(recById, minTs, maxTs, timed);
  }
  const indexOfStart = new Map(starts.map((s, i) => [s, i]));
  const last = Math.max(1, starts.length - 1);
  const rings = starts.map((s, i) => ({
    label: bucketLabel(s, unit),
    r: ringRadius(i),
    ratio: recForRatio(i / last)
  }));
  const indexFor = (n) => {
    const ts = Number(n.timestamp);
    return Number.isFinite(ts) ? indexOfStart.get(bucketStart(ts, unit)) ?? starts.length - 1 : starts.length - 1;
  };
  const buckets = starts.map(() => []);
  for (const n of graph.nodes) {
    buckets[indexFor(n)].push(n);
  }
  const tsOf = (n) => Number.isFinite(Number(n.timestamp)) ? Number(n.timestamp) : Infinity;
  const recByNode = /* @__PURE__ */ new Map();
  buckets.forEach((bucket, i) => {
    bucket.sort((a2, b) => tsOf(a2) === tsOf(b) ? a2.id.localeCompare(b.id) : tsOf(a2) - tsOf(b));
    const hi = rings[i].ratio;
    const lo = i > 0 ? rings[i - 1].ratio : 0;
    const m2 = bucket.length;
    const clusters = Math.max(1, Math.round(m2 / CLUSTER_SIZE));
    bucket.forEach((n, k) => {
      const c2 = Math.min(clusters - 1, Math.floor(k / m2 * clusters));
      const jitter = (hash(n.id) % 100 / 100 - 0.5) * (0.5 / clusters);
      const f = clamp((c2 + 1) / clusters + jitter, 0.02, 1);
      recByNode.set(n.id, lo + f * (hi - lo));
    });
  });
  return {
    index: indexFor,
    rec: (n) => recByNode.get(n.id) ?? 0,
    rings,
    tr: (n) => placeRadius(indexFor(n), n.id)
  };
}
function buildSimulation(graph, onTick) {
  const { maxTs, minTs, rec: recById, timed } = computeRecency(graph.nodes);
  const { index: index2, rec: recOf, rings, tr: trOf } = buildLayout(graph, recById, minTs, maxTs, timed);
  const nodes = graph.nodes.map((n) => {
    const rec = recOf(n);
    const tr = trOf(n);
    const angle = hash(n.id) % 3600 / 3600 * Math.PI * 2;
    return { ...n, outerRingIndex: index2(n), rec, tr, vx: 0, vy: 0, x: Math.cos(angle) * tr, y: Math.sin(angle) * tr };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = graph.edges.filter((e) => byId.has(e.source) && byId.has(e.target)).map((e) => ({ source: e.source, target: e.target }));
  const sim = simulation_default(nodes).alphaDecay(0.05).velocityDecay(0.62).force("charge", manyBody_default().strength(-12)).force(
    "link",
    link_default(links).id((n) => n.id).distance(26).strength(0.06)
  ).force(
    "collide",
    collide_default().radius((n) => nodeRadius(n) + 2).iterations(2)
  ).force("radial", radial_default((n) => n.tr, 0, 0).strength(0.92)).on("tick", onTick);
  return { byId, links, nodes, rings, sim };
}

// src/app/starmap/timeline.tsx
import { memo, useCallback, useEffect as useEffect7, useMemo as useMemo4, useRef as useRef4 } from "react";
import { jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
var ACTIVE_MARKER_CLASS = "opacity-100";
var INACTIVE_MARKER_CLASS = "opacity-30";
var MAX_STARS_PER_BUCKET = 7;
function rng(seed) {
  let a2 = seed >>> 0;
  return () => {
    a2 += 1831565813;
    let t = a2;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function buildStars(axis) {
  const n = Math.max(1, axis.buckets.length);
  const stars = [];
  axis.buckets.forEach((b, i) => {
    if (b.total === 0) {
      return;
    }
    const intensity = axis.maxTotal > 0 ? b.total / axis.maxTotal : 0;
    const count = Math.max(1, Math.round(Math.sqrt(intensity) * MAX_STARS_PER_BUCKET));
    const skillCount = Math.round(b.skill / b.total * count);
    const r = rng(i * 9973 + 7);
    const slot = 1 / n;
    const center = (i + 0.5) / n;
    for (let s = 0; s < count; s++) {
      const jitter = (r() - 0.5) * slot * 0.9;
      const vertical = (r() + r()) / 2;
      stars.push({
        delay: r() * 3,
        duration: 2.4 + r() * 2.6,
        kind: s < skillCount ? "skill" : "memory",
        leftPct: Math.max(0, Math.min(1, center + jitter)) * 100,
        // Brighter, slightly larger stars are rarer.
        opacity: 0.5 + r() * 0.5,
        // Floor at 2px so a lone star in a quiet bucket still reads on black.
        size: 2 + Math.round(r() * r() * 2.2),
        topPct: 12 + vertical * 76
      });
    }
  });
  return stars;
}
var Timeline = memo(function Timeline2({
  axis,
  memoryColor = "var(--theme-secondary)",
  onScrub,
  onTogglePlay,
  playing,
  revealStore,
  ringStops = []
}) {
  const trackRef = useRef4(null);
  const draggingRef = useRef4(false);
  const markerRefs = useRef4([]);
  const stars = useMemo4(() => buildStars(axis), [axis]);
  const syncReveal = useCallback(
    (value) => {
      const reveal = Math.max(0, Math.min(1, value));
      const track = trackRef.current;
      if (track) {
        track.style.setProperty("--starmap-reveal", String(reveal));
        track.setAttribute("aria-valuenow", String(Math.round(reveal * 100)));
      }
      ringStops.forEach((stop, i) => {
        const el = markerRefs.current[i];
        if (!el) {
          return;
        }
        const active = stop <= reveal;
        el.classList.toggle(ACTIVE_MARKER_CLASS, active);
        el.classList.toggle(INACTIVE_MARKER_CLASS, !active);
      });
    },
    [ringStops]
  );
  useEffect7(() => revealStore.subscribe(syncReveal), [revealStore, syncReveal]);
  useEffect7(() => {
    markerRefs.current.length = ringStops.length;
    syncReveal(revealStore.get());
  }, [revealStore, ringStops.length, syncReveal]);
  const ratioAt = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return revealStore.get();
    }
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };
  const onPointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrub(ratioAt(e.clientX));
  };
  const onPointerMove = (e) => {
    if (draggingRef.current) {
      onScrub(ratioAt(e.clientX));
    }
  };
  const onPointerUp = (e) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };
  const colorFor = (kind) => kind === "skill" ? "var(--theme-primary)" : memoryColor;
  return /* @__PURE__ */ jsxs7("div", { className: "pointer-events-auto flex w-[28rem] max-w-full items-center gap-3 [-webkit-app-region:no-drag]", children: [
    /* @__PURE__ */ jsx9(
      "button",
      {
        "aria-label": playing ? "Pause" : "Play timeline",
        className: "flex size-5 shrink-0 items-center justify-center text-foreground/75 transition-colors hover:text-foreground",
        onClick: onTogglePlay,
        type: "button",
        children: /* @__PURE__ */ jsx9(Codicon, { name: playing ? "debug-pause" : "triangle-right", size: playing ? "0.8rem" : "0.95rem" })
      }
    ),
    /* @__PURE__ */ jsxs7(
      "div",
      {
        "aria-label": "Timeline scrubber",
        "aria-valuemax": 100,
        "aria-valuemin": 0,
        "aria-valuenow": Math.round(revealStore.get() * 100),
        className: "relative h-7 min-w-0 flex-1 cursor-pointer select-none touch-none",
        onPointerDown,
        onPointerMove,
        onPointerUp,
        ref: trackRef,
        role: "slider",
        style: { "--starmap-reveal": revealStore.get() },
        tabIndex: 0,
        children: [
          /* @__PURE__ */ jsx9(
            "div",
            {
              "aria-hidden": true,
              className: "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-foreground/5"
            }
          ),
          /* @__PURE__ */ jsx9("div", { "aria-hidden": true, className: "absolute inset-0", children: stars.map((star, i) => /* @__PURE__ */ jsx9(
            "div",
            {
              className: "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
              style: {
                backgroundColor: colorFor(star.kind),
                height: star.size,
                left: `${star.leftPct}%`,
                opacity: 0.22,
                top: `${star.topPct}%`,
                width: star.size
              }
            },
            i
          )) }),
          /* @__PURE__ */ jsx9(
            "div",
            {
              "aria-hidden": true,
              className: "absolute inset-0",
              style: { clipPath: "inset(0 calc((1 - var(--starmap-reveal, 1)) * 100%) 0 0)" },
              children: stars.map((star, i) => {
                const color = colorFor(star.kind);
                return /* @__PURE__ */ jsx9(
                  "div",
                  {
                    className: "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                    style: {
                      "--o": star.opacity,
                      animation: `starmap-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
                      backgroundColor: color,
                      height: star.size,
                      left: `${star.leftPct}%`,
                      opacity: star.opacity,
                      top: `${star.topPct}%`,
                      width: star.size
                    }
                  },
                  i
                );
              })
            }
          ),
          /* @__PURE__ */ jsx9("div", { "aria-hidden": true, className: "absolute inset-0", children: ringStops.map((stop, i) => /* @__PURE__ */ jsx9(
            "div",
            {
              className: `pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--theme-primary)] ${INACTIVE_MARKER_CLASS}`,
              ref: (el) => {
                if (el) {
                  markerRefs.current[i] = el;
                }
              },
              style: { left: `${stop * 100}%` }
            },
            i
          )) }),
          /* @__PURE__ */ jsx9(
            "div",
            {
              "aria-hidden": true,
              className: "pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground",
              style: { left: "calc(var(--starmap-reveal, 1) * 100%)" }
            }
          )
        ]
      }
    )
  ] });
});

// src/app/starmap/star-map.tsx
import { jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
var SWEEP_MS = 15e3;
var GENTLE = 0.45;
function cineEase(t) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  const smooth = u * u * (3 - 2 * u);
  return GENTLE * u + (1 - GENTLE) * smooth;
}
function invCineEase(y3) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (cineEase(mid) < y3) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
function revealText(axis, reveal) {
  const date = dateAtReveal(axis, reveal);
  return date !== null ? formatDate(date) : `${Math.round(reveal * axis.size)} / ${axis.size}`;
}
function RevealLabel({ axis, revealStore }) {
  const labelRef = useRef5(null);
  const sync = useCallback2(
    (reveal) => {
      const el = labelRef.current;
      if (el) {
        el.textContent = revealText(axis, reveal);
      }
    },
    [axis]
  );
  useEffect8(() => revealStore.subscribe(sync), [revealStore, sync]);
  useEffect8(() => {
    sync(revealStore.get());
  }, [revealStore, sync]);
  return /* @__PURE__ */ jsx10("span", { className: "tabular-nums text-foreground/75", ref: labelRef, children: revealText(axis, revealStore.get()) });
}
function StarMap({
  graph,
  imported = false,
  initialSearchFocus = false,
  onAddToSession,
  onImport,
  onInsertIntoProfile,
  onOpenSession,
  onRecallIntoChat,
  onResetMap,
  onStartConversation,
  recentSessions
}) {
  const canvasRef = useRef5(null);
  const wrapRef = useRef5(null);
  const { t } = useI18n();
  const activeProfile = useStore($activeProfile);
  const simRef = useRef5(null);
  const nodesRef = useRef5([]);
  const linksRef = useRef5([]);
  const byIdRef = useRef5(/* @__PURE__ */ new Map());
  const adjacencyRef = useRef5(/* @__PURE__ */ new Map());
  const memByIdRef = useRef5(/* @__PURE__ */ new Map());
  const ringsRef = useRef5([]);
  const ringLabelRectsRef = useRef5([]);
  const fadeRef = useRef5({
    appear: /* @__PURE__ */ new Map(),
    labels: /* @__PURE__ */ new Map(),
    links: /* @__PURE__ */ new Map(),
    nodes: /* @__PURE__ */ new Map(),
    rings: /* @__PURE__ */ new Map()
  });
  const doubleTapRef = useRef5(createDoubleTapDetector());
  const paletteRef = useRef5(null);
  const themeDirtyRef = useRef5(true);
  const invalidateRef = useRef5(() => {
  });
  const viewportRef = useRef5({ k: 1, x: 0, y: 0 });
  const hoverRef = useRef5(null);
  const hoveredLinkRef = useRef5(null);
  const hoveredRingRef = useRef5(null);
  const selectedRingRef = useRef5(null);
  const selectedIdRef = useRef5(null);
  const sizeRef = useRef5({ h: 0, w: 0 });
  const dprRef = useRef5(1);
  const dirtyRef = useRef5(true);
  const snapMotionRef = useRef5(false);
  const dragRef = useRef5({ id: null, mode: "none", moved: false, ring: null, sx: 0, sy: 0, vp: { k: 1, x: 0, y: 0 } });
  const [selectedId, setSelectedId] = useState8(null);
  const [menuTarget, setMenuTarget] = useState8(null);
  const [sessionsTarget, setSessionsTarget] = useState8(null);
  const [searchOpen, setSearchOpen] = useState8(initialSearchFocus);
  const [searchTab, setSearchTab] = useState8("search");
  const matchesRef = useRef5(null);
  const [filterMatches, setFilterMatches] = useState8(null);
  const clearFiltersRef = useRef5(null);
  const [size, setSize] = useState8({ h: 0, w: 0 });
  const themeEpoch = useThemeEpoch();
  const [memoryColor, setMemoryColor] = useState8("var(--theme-secondary)");
  const [conclusionColor, setConclusionColor] = useState8("var(--theme-primary)");
  const revealStore = useMemo5(() => atom(1), []);
  const [playing, setPlaying] = useState8(false);
  const [ringStops, setRingStops] = useState8([]);
  const revealRef = useRef5(1);
  const camRadiusRef = useRef5(RING_OUTER);
  const timeAxis = useMemo5(() => buildTimeAxis(graph, 72), [graph]);
  const shareCode = useMemo5(() => encodeShareCode(graph), [graph]);
  const importCode = useCallback2(
    (code) => {
      try {
        const next = decodeShareCode(code);
        onImport?.(next);
        return null;
      } catch (err2) {
        return err2 instanceof ShareCodeError ? err2.message : "Could not read that map code.";
      }
    },
    [onImport]
  );
  const invalidate = useCallback2(() => invalidateRef.current(), []);
  const setRevealValue = useCallback2(
    (value) => {
      const next = clamp(value, 0, 1);
      revealRef.current = next;
      revealStore.set(next);
      invalidate();
    },
    [invalidate, revealStore]
  );
  const resetFades = useCallback2(() => {
    for (const bucket of Object.values(fadeRef.current)) {
      bucket.clear();
    }
  }, []);
  const onMatchesChange = useCallback2(
    (ids) => {
      matchesRef.current = ids;
      setFilterMatches(ids);
      invalidate();
    },
    [invalidate]
  );
  const registerClearFilters = useCallback2((fn) => {
    clearFiltersRef.current = fn;
  }, []);
  const focusNode = useCallback2(
    (id) => {
      const node = byIdRef.current.get(id);
      if (!node) {
        return;
      }
      setSelectedId(id);
      const { h, w } = sizeRef.current;
      const k = viewportRef.current.k;
      viewportRef.current = { k, x: w / 2 - node.x * k, y: h / 2 - node.y * k * TILT };
      invalidate();
    },
    [invalidate]
  );
  const openNodeMenuById = useCallback2((id, x3, y3) => {
    const node = byIdRef.current.get(id);
    if (!node) {
      setMenuTarget(null);
      return false;
    }
    setSelectedId(id);
    setMenuTarget({
      id: node.id,
      connectionId: node.connectionId,
      isConclusion: !!conclusionIdsRef.current?.has(node.id),
      kind: node.kind === "memory" ? "memory" : "skill",
      label: node.label,
      memorySource: node.memorySource,
      // Multi-profile mode: pass the profile and original id so recall /
      // cross-profile ops resolve against the node's OWN profile — the canvas
      // path already does this; dropping it here made sidebar-opened menus
      // fail with "Could not load that memory" on prefixed ids.
      profile: node.profile,
      _originalId: node._originalId,
      x: x3,
      y: y3
    });
    return true;
  }, []);
  const memById = useMemo5(() => memoryCardsByNodeId(graph), [graph]);
  const adjacency = useMemo5(() => {
    const m2 = /* @__PURE__ */ new Map();
    for (const n of graph.nodes) {
      m2.set(n.id, /* @__PURE__ */ new Set());
    }
    for (const e of graph.edges) {
      m2.get(e.source)?.add(e.target);
      m2.get(e.target)?.add(e.source);
    }
    return m2;
  }, [graph.edges, graph.nodes]);
  const showConclusions = useMemo5(() => conclusionsEnabled(graph), [graph]);
  const conclusionIds = useMemo5(() => {
    if (!showConclusions) {
      return null;
    }
    const s = /* @__PURE__ */ new Set();
    for (const n of graph.nodes) {
      if (isConclusion2(n, graph.memoryProvider)) {
        s.add(n.id);
      }
    }
    return s;
  }, [graph.memoryProvider, graph.nodes, showConclusions]);
  const conclusionIdsRef = useRef5(null);
  useEffect8(() => {
    conclusionIdsRef.current = conclusionIds;
    invalidate();
  }, [conclusionIds, invalidate]);
  useEffect8(() => {
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    const sync = () => setSize({ h: el.clientHeight, w: el.clientWidth });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    sync();
    return () => ro.disconnect();
  }, []);
  useEffect8(() => {
    sizeRef.current = size;
    if (size.w === 0 || size.h === 0) {
      return;
    }
    const { byId, links, nodes, rings, sim } = buildSimulation(graph, invalidate);
    simRef.current = sim;
    nodesRef.current = nodes;
    linksRef.current = links;
    byIdRef.current = byId;
    ringsRef.current = rings;
    setRingStops(rings.map((rg, i) => rg.label != null ? rings[i - 1]?.ratio ?? 0 : -1).filter((v) => v >= 0));
    resetFades();
    viewportRef.current = fitViewport(size.w, size.h, rings[rings.length - 1]?.r ?? RING_OUTER);
    invalidate();
    if (selectedIdRef.current && !byId.has(selectedIdRef.current)) {
      selectedIdRef.current = null;
      setSelectedId(null);
    }
    return () => {
      sim.stop();
      if (simRef.current === sim) {
        simRef.current = null;
      }
    };
  }, [graph, invalidate, resetFades, size]);
  useEffect8(() => {
    adjacencyRef.current = adjacency;
    memByIdRef.current = memById;
    invalidate();
  }, [adjacency, invalidate, memById]);
  useEffect8(() => {
    document.fonts?.load('1em "JetBrains Mono"').then(invalidate, () => {
    });
  }, [invalidate]);
  useEffect8(() => {
    selectedIdRef.current = selectedId;
    invalidate();
  }, [invalidate, selectedId]);
  useEffect8(() => {
    camRadiusRef.current = RING_OUTER;
    snapMotionRef.current = false;
    setRevealValue(1);
    setPlaying(false);
  }, [graph, setRevealValue]);
  const targetRadius = useCallback2((rev2) => {
    const rings = ringsRef.current;
    if (!rings.length) {
      return RING_OUTER;
    }
    const lead = rings.findIndex((rg) => rg.ratio > rev2 + 1e-3);
    const i = lead === -1 ? rings.length - 1 : lead;
    const band = (rings[1]?.r ?? RING_OUTER) - (rings[0]?.r ?? 0);
    return rings[i].r + band * 0.35;
  }, []);
  const applyFit = useCallback2((radius) => {
    const { h, w } = sizeRef.current;
    if (w > 0 && h > 0) {
      viewportRef.current = fitViewport(w, h, radius);
    }
  }, []);
  const fitForReveal = useCallback2(
    (rev2) => {
      camRadiusRef.current = targetRadius(rev2);
      applyFit(camRadiusRef.current);
    },
    [applyFit, targetRadius]
  );
  useEffect8(() => {
    if (!playing) {
      return;
    }
    let raf = 0;
    let start = 0;
    const step = (now2) => {
      if (!start) {
        start = now2 - invCineEase(revealRef.current) * SWEEP_MS;
      }
      const progress = Math.min(1, (now2 - start) / SWEEP_MS);
      const next = cineEase(progress);
      const target = targetRadius(next);
      camRadiusRef.current += (target - camRadiusRef.current) * 0.1;
      applyFit(camRadiusRef.current);
      setRevealValue(next);
      if (progress >= 1 && Math.abs(target - camRadiusRef.current) < 0.5) {
        camRadiusRef.current = target;
        applyFit(target);
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [applyFit, playing, setRevealValue, targetRadius]);
  const onTogglePlay = useCallback2(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    snapMotionRef.current = false;
    if (revealRef.current >= 1) {
      resetFades();
      fitForReveal(0);
      setRevealValue(0);
    }
    setPlaying(true);
  }, [fitForReveal, playing, resetFades, setRevealValue]);
  const onScrub = useCallback2(
    (value) => {
      const next = clamp(value, 0, 1);
      setPlaying(false);
      snapMotionRef.current = true;
      fitForReveal(next);
      setRevealValue(next);
    },
    [fitForReveal, setRevealValue]
  );
  useEffect8(() => {
    const onKey = (e) => {
      if (shouldIgnorePlaybackHotkey(e, document.activeElement)) {
        return;
      }
      e.preventDefault();
      onTogglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTogglePlay]);
  useEffect8(() => {
    const el = canvasRef.current ?? wrapRef.current;
    if (!el) {
      return;
    }
    const style = getComputedStyle(el);
    const val = style.getPropertyValue("--theme-primary").trim();
    if (val) {
      const bgVal = style.getPropertyValue("--background").trim() || style.getPropertyValue("--dt-background").trim() || "#000";
      const primaryRgb = resolveRgb(val);
      setMemoryColor(rgba(memoryInkFor(primaryRgb, resolveRgb(bgVal)), 0.9));
      setConclusionColor(rgba(conclusionInkFor(primaryRgb), 0.95));
    }
  }, [size, themeEpoch]);
  useEffect8(() => {
    themeDirtyRef.current = true;
    invalidate();
  }, [invalidate, themeEpoch]);
  useEffect8(() => {
    let raf = 0;
    const ANIM_MS = 1e3 / 30;
    let lastAnimTs = 0;
    let force = true;
    let paused = false;
    let pauseController;
    const schedule = () => {
      if (!paused && !raf) {
        raf = requestAnimationFrame(frame2);
      }
    };
    let staticCanvas = null;
    const paint = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        return;
      }
      if (!staticCanvas) {
        staticCanvas = document.createElement("canvas");
      }
      if (staticCanvas.width !== canvas.width || staticCanvas.height !== canvas.height) {
        staticCanvas.width = canvas.width;
        staticCanvas.height = canvas.height;
        dirtyRef.current = true;
      }
      const offCtx = staticCanvas.getContext("2d");
      if (!offCtx) {
        return;
      }
      if (themeDirtyRef.current || !paletteRef.current) {
        paletteRef.current = computePalette(canvas);
        themeDirtyRef.current = false;
        dirtyRef.current = true;
      }
      const palette = paletteRef.current;
      if (!palette) {
        return;
      }
      if (dirtyRef.current) {
        const { animating, ringLabelRects } = drawScene({
          adjacency: adjacencyRef.current,
          byId: byIdRef.current,
          conclusionIds: conclusionIdsRef.current,
          ctx: offCtx,
          dpr: dprRef.current,
          fades: fadeRef.current,
          // Filter-only exploration: when the sidebar narrows, paint just the
          // surviving subset so the map shows only the filtered results.
          filterMatches: matchesRef.current,
          focusId: selectedIdRef.current ?? hoverRef.current,
          hoverId: hoverRef.current,
          hoverLink: hoveredLinkRef.current,
          hoverRing: hoveredRingRef.current,
          links: linksRef.current,
          memById: memByIdRef.current,
          nodes: nodesRef.current,
          palette,
          reveal: revealRef.current,
          rings: ringsRef.current,
          selectedRing: selectedRingRef.current,
          size: sizeRef.current,
          snapMotion: snapMotionRef.current,
          vp: viewportRef.current
        });
        snapMotionRef.current = false;
        ringLabelRectsRef.current = ringLabelRects;
        dirtyRef.current = animating;
      }
      const focused = selectedIdRef.current ?? hoverRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (focused) {
        drawScramble({ ctx, dpr: dprRef.current, palette, rings: ringsRef.current, vp: viewportRef.current });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(staticCanvas, 0, 0);
      } else {
        ctx.drawImage(staticCanvas, 0, 0);
        drawScramble({ ctx, dpr: dprRef.current, palette, rings: ringsRef.current, vp: viewportRef.current });
      }
      if (matchesRef.current && matchesRef.current.size > 0) {
        drawSearchPulse({
          conclusionIds: conclusionIdsRef.current,
          ctx,
          dpr: dprRef.current,
          matches: matchesRef.current,
          nodes: nodesRef.current,
          now: performance.now(),
          palette,
          vp: viewportRef.current
        });
      }
    };
    const frame2 = (ts) => {
      raf = 0;
      if (!force && ts - lastAnimTs < ANIM_MS) {
        schedule();
        return;
      }
      force = false;
      lastAnimTs = ts;
      paint();
      schedule();
    };
    invalidateRef.current = () => {
      dirtyRef.current = true;
      force = true;
      schedule();
    };
    const onActivity = () => {
      const next = pauseController.isPaused();
      if (next === paused) {
        return;
      }
      paused = next;
      if (paused) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else {
        dirtyRef.current = true;
        force = true;
        schedule();
      }
    };
    pauseController = createRendererLoopPauseController(onActivity);
    paused = pauseController.isPaused();
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      pauseController.dispose();
      invalidateRef.current = () => {
      };
    };
  }, []);
  useEffect8(() => {
    sizeRef.current = size;
    dprRef.current = Math.min(2, window.devicePixelRatio || 1);
    const canvas = canvasRef.current;
    if (canvas && size.w > 0 && size.h > 0) {
      canvas.width = Math.round(size.w * dprRef.current);
      canvas.height = Math.round(size.h * dprRef.current);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
    }
    invalidate();
  }, [invalidate, size]);
  const pickNode = useCallback2((cssX, cssY) => {
    const vp = viewportRef.current;
    const nodeK = fitScale(sizeRef.current.w, sizeRef.current.h, ringsRef.current);
    let best = null;
    let bestD = Infinity;
    for (const n of nodesRef.current) {
      if (matchesRef.current && !matchesRef.current.has(n.id)) {
        continue;
      }
      const r = nodeRadius(n) * nodeK + 6;
      const sx = n.x * vp.k + vp.x;
      const sy = n.y * vp.k * TILT + vp.y;
      const d = (sx - cssX) ** 2 + (sy - cssY) ** 2;
      if (d < r * r && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }, []);
  const pickLink = (cssX, cssY) => {
    const vp = viewportRef.current;
    let best = null;
    let bestD = 25;
    for (const link of linksRef.current) {
      const s = typeof link.source === "object" ? link.source : byIdRef.current.get(String(link.source));
      const t2 = typeof link.target === "object" ? link.target : byIdRef.current.get(String(link.target));
      if (!s || !t2) {
        continue;
      }
      const d = distToSegmentSq(
        cssX,
        cssY,
        s.x * vp.k + vp.x,
        s.y * vp.k * TILT + vp.y,
        t2.x * vp.k + vp.x,
        t2.y * vp.k * TILT + vp.y
      );
      if (d < bestD) {
        bestD = d;
        best = `${s.id}->${t2.id}`;
      }
    }
    return best;
  };
  const pickRingLabel = (cssX, cssY) => {
    for (const r of ringLabelRectsRef.current) {
      if (cssX >= r.x && cssX <= r.x + r.w && cssY >= r.y && cssY <= r.y + r.h) {
        return r.i;
      }
    }
    return null;
  };
  const localXY = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };
  const openNodeMenuAt = useCallback2(
    (clientX, clientY) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const node = pickNode(clientX - (rect?.left ?? 0), clientY - (rect?.top ?? 0));
      if (!node) {
        setMenuTarget(null);
        return false;
      }
      return openNodeMenuById(node.id, clientX, clientY);
    },
    [openNodeMenuById, pickNode]
  );
  useEffect8(() => {
    const canvas = canvasRef.current;
    return canvas ? registerStarMapContextMenu(canvas, { openNodeMenuAt }) : void 0;
  }, [openNodeMenuAt]);
  const resetView = () => {
    setPlaying(false);
    viewportRef.current = fitViewport(
      sizeRef.current.w,
      sizeRef.current.h,
      ringsRef.current[ringsRef.current.length - 1]?.r ?? RING_OUTER
    );
    selectedRingRef.current = null;
    invalidate();
    setSelectedId(null);
  };
  const onMouseDown = (e) => {
    if (e.button !== 0) {
      return;
    }
    const { x: x3, y: y3 } = localXY(e);
    const ringHit = pickRingLabel(x3, y3);
    hoveredRingRef.current = null;
    const nodeId = ringHit == null ? pickNode(x3, y3)?.id ?? null : null;
    dragRef.current = {
      id: nodeId,
      mode: "pan",
      moved: false,
      ring: ringHit,
      sx: e.clientX,
      sy: e.clientY,
      vp: viewportRef.current
    };
  };
  const onMouseMove = (e) => {
    const drag = dragRef.current;
    if (drag.mode === "none") {
      const { x: x3, y: y3 } = localXY(e);
      const ringHit = pickRingLabel(x3, y3);
      const id = ringHit == null ? pickNode(x3, y3)?.id ?? null : null;
      const linkKey = ringHit == null && id == null ? pickLink(x3, y3) : null;
      if (id !== hoverRef.current || ringHit !== hoveredRingRef.current || linkKey !== hoveredLinkRef.current) {
        hoverRef.current = id;
        hoveredRingRef.current = ringHit;
        hoveredLinkRef.current = linkKey;
        invalidate();
      }
      return;
    }
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }
    if (drag.mode === "pan") {
      if (drag.moved) {
        setPlaying(false);
      }
      viewportRef.current = { ...drag.vp, x: drag.vp.x + dx, y: drag.vp.y + dy };
      invalidate();
    }
  };
  const endDrag = () => {
    const drag = dragRef.current;
    if (drag.mode === "pan" && !drag.moved) {
      if (doubleTapRef.current()) {
        if (drag.id) {
          const node = byIdRef.current.get(drag.id) ?? null;
          setSelectedId(drag.id);
          setSessionsTarget(node);
        } else {
          resetView();
        }
        dragRef.current = { id: null, mode: "none", moved: false, ring: null, sx: 0, sy: 0, vp: viewportRef.current };
        return;
      }
      if (drag.ring != null) {
        selectedRingRef.current = selectedRingRef.current === drag.ring ? null : drag.ring;
      } else if (drag.id) {
        setSelectedId((prev) => prev === drag.id ? null : drag.id);
      } else {
        selectedRingRef.current = null;
        setSelectedId(null);
      }
      invalidate();
    }
    dragRef.current = { id: null, mode: "none", moved: false, ring: null, sx: 0, sy: 0, vp: viewportRef.current };
  };
  const onMouseLeave = () => {
    hoverRef.current = null;
    hoveredRingRef.current = null;
    hoveredLinkRef.current = null;
    invalidate();
    endDrag();
  };
  const onDoubleClick = (e) => {
    const { x: x3, y: y3 } = localXY(e);
    const node = pickNode(x3, y3);
    if (node) {
      setSelectedId(node.id);
      setSessionsTarget(node);
    } else {
      resetView();
    }
  };
  const onContextMenu = (e) => {
    if (openNodeMenuAt(e.clientX, e.clientY)) {
      e.preventDefault();
    }
  };
  const onWheel = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    if (isSmartZoomWheel(e)) {
      resetView();
      return;
    }
    setPlaying(false);
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const vp = viewportRef.current;
    const k = clamp(vp.k * (e.deltaY > 0 ? 0.9 : 1.1), ZOOM_MIN, ZOOM_MAX);
    viewportRef.current = { k, x: px - (px - vp.x) / vp.k * k, y: py - (py - vp.y) / vp.k * k };
    invalidate();
  };
  return /* @__PURE__ */ jsxs8("div", { className: "relative min-h-0 flex-1 overflow-hidden", ref: wrapRef, children: [
    /* @__PURE__ */ jsx10(
      "canvas",
      {
        className: "block touch-none select-none text-foreground",
        onContextMenu,
        onDoubleClick,
        onMouseDown,
        onMouseLeave,
        onMouseMove,
        onMouseUp: endDrag,
        onWheel,
        ref: canvasRef
      }
    ),
    /* @__PURE__ */ jsx10(
      NodeContextMenu,
      {
        onAddToSession: onAddToSession ? (tgt, sessionKey) => onAddToSession(
          { _originalId: tgt._originalId, id: tgt.id, kind: tgt.kind, label: tgt.label, profile: tgt.profile, connectionId: tgt.connectionId },
          sessionKey
        ) : void 0,
        onClose: () => setMenuTarget(null),
        onInsertIntoProfile: onInsertIntoProfile ? (tgt, targetProfile) => onInsertIntoProfile(
          {
            id: tgt.id,
            kind: tgt.kind,
            label: tgt.label,
            profile: tgt.profile,
            connectionId: tgt.connectionId,
            _originalId: tgt._originalId
          },
          targetProfile
        ) : void 0,
        onNodeRemoved: () => {
          setMenuTarget(null);
          setSelectedId(null);
        },
        onRecallIntoChat: onRecallIntoChat ? (tgt) => onRecallIntoChat({
          _originalId: tgt._originalId,
          id: tgt.id,
          kind: tgt.kind,
          label: tgt.label,
          profile: tgt.profile,
          connectionId: tgt.connectionId
        }) : void 0,
        onShowProvenance: (id) => {
          const node = byIdRef.current.get(id) ?? null;
          setSelectedId(id);
          setSessionsTarget(node);
        },
        onStartConversation: onStartConversation ? (tgt) => onStartConversation({ id: tgt.id, label: tgt.label }) : void 0,
        recentSessions,
        target: menuTarget
      }
    ),
    /* @__PURE__ */ jsx10(
      NodeSessionsDialog,
      {
        onClose: () => setSessionsTarget(null),
        onOpenSession: (id, owner) => {
          setSessionsTarget(null);
          onOpenSession?.(id, owner);
        },
        target: sessionsTarget
      }
    ),
    /* @__PURE__ */ jsx10(
      "button",
      {
        "aria-label": t.starmap.filterTitle,
        className: `absolute right-2 top-14 z-20 cursor-pointer rounded-md border p-1.5 backdrop-blur-md transition-colors [-webkit-app-region:no-drag] ${searchOpen && searchTab === "filter" ? "border-(--ui-stroke-secondary) bg-(--ui-control-active-background) text-foreground" : "border-transparent text-muted-foreground hover:border-(--ui-stroke-secondary) hover:text-foreground"}`,
        onClick: () => {
          setSearchOpen((open) => !(open && searchTab === "filter"));
          setSearchTab("filter");
        },
        type: "button",
        children: /* @__PURE__ */ jsx10(SlidersHorizontal, { className: "size-4" })
      }
    ),
    /* @__PURE__ */ jsx10(
      "button",
      {
        "aria-label": t.starmap.searchTitle,
        className: `absolute right-2 top-[6.25rem] z-20 cursor-pointer rounded-md border p-1.5 backdrop-blur-md transition-colors [-webkit-app-region:no-drag] ${searchOpen && searchTab === "search" ? "border-(--ui-stroke-secondary) bg-(--ui-control-active-background) text-foreground" : "border-transparent text-muted-foreground hover:border-(--ui-stroke-secondary) hover:text-foreground"}`,
        onClick: () => {
          setSearchOpen((open) => !(open && searchTab === "search"));
          setSearchTab("search");
        },
        type: "button",
        children: /* @__PURE__ */ jsx10(Search, { className: "size-4" })
      }
    ),
    filterMatches ? /* @__PURE__ */ jsxs8("div", { className: "absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-(--ui-stroke-secondary) bg-[color-mix(in_srgb,var(--ui-bg-elevated)_92%,transparent)] px-3 py-1 text-[0.66rem] text-muted-foreground backdrop-blur-md [-webkit-app-region:no-drag]", children: [
      /* @__PURE__ */ jsx10("span", { children: t.starmap.filterShowing(filterMatches.size, graph.nodes.length) }),
      /* @__PURE__ */ jsx10(
        "button",
        {
          className: "cursor-pointer font-medium text-foreground hover:underline",
          onClick: () => clearFiltersRef.current?.(),
          type: "button",
          children: t.starmap.filterClear
        }
      )
    ] }) : null,
    searchOpen ? /* @__PURE__ */ jsx10("div", { className: "absolute inset-y-0 right-0 z-30", children: /* @__PURE__ */ jsx10(
      SearchSidebar,
      {
        conclusionColor,
        focusSection: searchTab,
        graph,
        memoryColor,
        onClose: () => setSearchOpen(false),
        onFocusNode: focusNode,
        onMatchesChange,
        onNodeMenu: openNodeMenuById,
        onRegisterClear: registerClearFilters,
        showConclusions
      }
    ) }) : null,
    /* @__PURE__ */ jsx10("div", { className: "pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-12", children: /* @__PURE__ */ jsx10(
      Timeline,
      {
        axis: timeAxis,
        memoryColor,
        onScrub,
        onTogglePlay,
        playing,
        revealStore,
        ringStops
      }
    ) }),
    /* @__PURE__ */ jsx10("div", { className: "pointer-events-auto absolute bottom-2 right-2 z-20 [-webkit-app-region:no-drag]", children: /* @__PURE__ */ jsx10(ShareControls, { imported, onImport: importCode, onResetMap, shareCode }) }),
    /* @__PURE__ */ jsx10("div", { className: "pointer-events-auto absolute left-2 top-14 z-20 [-webkit-app-region:no-drag]", children: /* @__PURE__ */ jsx10(ProfileSelector, { activeProfile }) }),
    /* @__PURE__ */ jsxs8("div", { className: "pointer-events-none absolute bottom-2 left-2 flex flex-col gap-1 text-[0.62rem] text-muted-foreground", children: [
      /* @__PURE__ */ jsxs8("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx10("span", { className: "inline-block size-2 rounded-full bg-[var(--theme-primary)]/80" }),
        " skill"
      ] }),
      /* @__PURE__ */ jsxs8("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx10("span", { className: "inline-block size-2 rotate-45", style: { backgroundColor: memoryColor } }),
        " memory"
      ] }),
      showConclusions ? /* @__PURE__ */ jsxs8("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx10(
          "span",
          {
            className: "inline-block size-2 shrink-0",
            style: {
              backgroundColor: conclusionColor,
              clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)"
            }
          }
        ),
        " ",
        t.starmap.conclusion
      ] }) : null,
      /* @__PURE__ */ jsx10("span", { className: "text-[0.58rem] text-muted-foreground/65", children: "core = oldest \xB7 outer = newer" }),
      /* @__PURE__ */ jsx10(RevealLabel, { axis: timeAxis, revealStore })
    ] })
  ] });
}

// src/app/starmap/index.tsx
import { Fragment as Fragment4, jsx as jsx11, jsxs as jsxs9 } from "react/jsx-runtime";
var RECENT_SESSIONS = 5;
function readCollapse() {
  try {
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}
function StarmapView({ onClose }) {
  const graph = useStore($starmapGraph);
  const loading = useStore($starmapLoading);
  const error = useStore($starmapError);
  const recallMode = useStore($starmapRecallMode);
  const activeProfile = useStore($activeProfile);
  const sessions = useStore($sessions);
  const [imported, setImported] = useState9(null);
  const [collapse, setCollapse] = useState9(readCollapse);
  const [collapseNote, setCollapseNote] = useState9("");
  useEffect9(() => watchStarmapGraph(), []);
  useEffect9(() => {
    void refreshRecentSessions(activeProfile);
  }, [activeProfile]);
  useEffect9(() => {
    setImported(null);
  }, [graph]);
  const shown = imported ?? graph;
  const view = shown && collapse ? collapseIdentical(shown) : { graph: shown, hidden: 0, texts: 0 };
  const closeAndReset = () => {
    clearStarmapRecall();
    onClose();
  };
  const recentSessions = sessions.slice(0, RECENT_SESSIONS).map((session) => ({
    key: session._lineage_root_id ?? session.id,
    title: sessionTitle(session)
  }));
  const fetchRecallText = async (node) => {
    const target = resolveRecallTarget(node);
    try {
      const draft = await getLearningRecallDraft(target.id, learningNodeScope(node));
      if (!draft.ok || !String(draft.text ?? "").trim()) {
        notify({ kind: "warning", message: "Could not load that memory to insert." });
        return null;
      }
      return String(draft.text);
    } catch {
      notify({ kind: "warning", message: "Could not load that memory to insert." });
      return null;
    }
  };
  return /* @__PURE__ */ jsx11("div", { className: "relative flex h-full min-h-0 flex-col", "data-context-menu-skip": true, "data-hermes-context-menu-trigger": true, children: error ? /* @__PURE__ */ jsxs9("div", { className: "flex h-full flex-col items-center justify-center gap-2 px-6 text-center", children: [
    /* @__PURE__ */ jsx11("div", { className: "text-sm text-(--ui-text-secondary)", children: "Could not load the star map" }),
    /* @__PURE__ */ jsx11("div", { className: "max-w-xl text-xs text-(--ui-text-tertiary)", children: error }),
    /* @__PURE__ */ jsx11(
      "button",
      {
        className: "mt-2 cursor-pointer rounded border border-(--ui-stroke-secondary) px-2 py-1 text-xs hover:bg-(--ui-control-active-background)",
        onClick: () => void loadStarmapGraph(true),
        type: "button",
        children: "Retry"
      }
    )
  ] }) : !shown && loading ? /* @__PURE__ */ jsx11("div", { className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsx11("span", { className: "animate-pulse text-xs text-(--ui-text-tertiary)", children: "Loading the journey graph\u2026" }) }) : shown && shown.nodes.length === 0 && !imported ? /* @__PURE__ */ jsxs9("div", { className: "flex h-full flex-col items-center justify-center gap-2 px-6 text-center", children: [
    /* @__PURE__ */ jsx11("div", { className: "text-sm text-(--ui-text-secondary)", children: "Nothing learned yet" }),
    /* @__PURE__ */ jsx11("div", { className: "max-w-xl text-xs text-(--ui-text-tertiary)", children: "As Hermes builds skills and memories for your work, they appear here." })
  ] }) : view.graph ? /* @__PURE__ */ jsxs9(Fragment4, { children: [
    /* @__PURE__ */ jsx11(
      StarMap,
      {
        graph: view.graph,
        imported: imported !== null,
        initialSearchFocus: recallMode,
        onAddToSession: async (node, sessionKey) => {
          const text = await fetchRecallText(node);
          if (!text) {
            return;
          }
          const existing = takeSessionDraft(sessionKey);
          const combined = existing.text.trim() ? `${existing.text.trimEnd()}

${text}` : text;
          stashSessionDraft(sessionKey, combined, existing.attachments);
          const composer = host3.composer;
          let delivered = false;
          try {
            delivered = await composer?.setDraft?.(sessionKey, combined);
          } catch {
            delivered = false;
          }
          if (!delivered) {
            try {
              await host3.openSession?.(sessionKey, { intent: "in-place" });
              await new Promise((resolve) => setTimeout(resolve, 350));
              delivered = await composer?.setDraft?.(sessionKey, combined);
            } catch {
              delivered = false;
            }
          }
          const target = recentSessions.find((s) => s.key === sessionKey);
          if (delivered) {
            notify({ kind: "success", message: `Added to "${target?.title ?? node.label}" \u2014 review and send.` });
          } else {
            notify({ kind: "warning", message: "Could not place the draft in that session\u2019s composer." });
          }
        },
        onImport: setImported,
        onInsertIntoProfile: async (node, targetProfile) => {
          if (!node.profile) {
            notify({ kind: "warning", message: "Could not insert into that bot's memory." });
            return;
          }
          try {
            const { id: nodeId } = resolveRecallTarget(node);
            const result = await crossInsertLearningNode(nodeId, node.profile, targetProfile, learningNodeScope(node));
            if (result.ok) {
              notify({ kind: "success", message: `Inserted into ${targetProfile}'s memory.` });
              void loadStarmapGraph(true);
            } else {
              notify({ kind: "warning", message: result.message || "Could not insert into that bot's memory." });
            }
          } catch {
            notify({ kind: "warning", message: "Could not insert into that bot's memory." });
          }
        },
        onOpenSession: (id, owner) => {
          ;
          host3.openSession?.(id, { intent: "stack", profile: owner?.profile });
          closeAndReset();
        },
        onRecallIntoChat: async (node) => {
          const text = await fetchRecallText(node);
          if (!text) {
            return;
          }
          try {
            await host3.composer?.insertText?.(null, text, { mode: "block" });
            closeAndReset();
            host3.navigate?.("/");
          } catch {
            notify({ kind: "warning", message: "No composer accepted the text." });
          }
        },
        onResetMap: () => setImported(null),
        onStartConversation: (conclusion) => {
          requestFreshSession();
          const seed = `I want to talk about something you've concluded about me:

> ${conclusion.label}

`;
          setTimeout(() => {
            void host3.composer?.insertText?.(null, seed, { mode: "block" });
          }, 0);
          closeAndReset();
          host3.navigate?.("/");
        },
        recentSessions
      }
    ),
    /* @__PURE__ */ jsxs9("div", { className: "pointer-events-auto absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-(--ui-stroke-secondary) bg-[color-mix(in_srgb,var(--ui-bg-elevated)_92%,transparent)] px-3 py-1 text-[0.66rem] text-(--ui-text-tertiary) backdrop-blur-md [-webkit-app-region:no-drag]", children: [
      /* @__PURE__ */ jsx11(
        "button",
        {
          className: "cursor-pointer font-medium text-(--ui-text-primary) hover:underline",
          onClick: () => {
            const next = !collapse;
            setCollapse(next);
            try {
              window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
            } catch {
            }
          },
          type: "button",
          children: collapse ? "Show duplicate conclusions" : "Collapse identical conclusions"
        }
      ),
      collapse && view.hidden > 0 ? /* @__PURE__ */ jsxs9("span", { className: "tabular-nums", children: [
        view.hidden,
        " duplicate rows hidden \xB7 ",
        view.texts,
        " repeated texts"
      ] }) : null,
      collapseNote ? /* @__PURE__ */ jsx11("span", { children: collapseNote }) : null
    ] })
  ] }) : null });
}

// src/entry.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
var ID = "journey-starmap";
var ENTRY_KEYS = {
  nav: "Star map (plugin)",
  open: "Open the star map",
  title: "Star map (plugin)"
};
var LOCALES = { en: { ...ENTRY_KEYS, ...EN } };
var $status = atom2("starmap: idle");
function StatusChip() {
  const graph = useValue2($starmapGraph);
  const loading = useValue2($starmapLoading);
  const error = useValue2($starmapError);
  const text = useValue2($status);
  const live = error ? `starmap: ERR ${error}` : graph ? `starmap: ${graph.nodes?.length ?? 0} nodes` : loading ? "starmap: loading" : text;
  return /* @__PURE__ */ jsx12("span", { className: "px-1 text-[11px] text-(--ui-text-tertiary)", children: live });
}
function Page() {
  usePluginI18n2(ID);
  return /* @__PURE__ */ jsx12(StarmapView, { onClose: () => host4.navigate("/") });
}
var entry_default = {
  defaultEnabled: true,
  id: ID,
  name: "Journey star map",
  register(ctx) {
    ctx.i18n.register(LOCALES);
    configureApi(ctx.rest.bind(ctx));
    const applyProfile = (profile) => {
      syncProfileState(profile);
      setRequestScope({ profile: profile?.trim() || void 0 });
      void refreshProfiles();
    };
    applyProfile(host4.state.profile.get());
    try {
      const unsubscribe = host4.state.profile.subscribe(applyProfile);
      ctx.onDispose?.(unsubscribe);
    } catch {
    }
    ctx.registerMany([
      { data: { path: "/starmap-plugin" }, area: ROUTES_AREA, id: "page", render: () => /* @__PURE__ */ jsx12(Page, {}) },
      { area: "statusBar.right", data: void 0, id: "chip", order: 4, render: () => /* @__PURE__ */ jsx12(StatusChip, {}) },
      {
        area: SIDEBAR_NAV_AREA,
        data: { codicon: "map", label: ctx.i18n.t("nav"), path: "/starmap-plugin" },
        id: "nav",
        order: 60
      },
      {
        area: PALETTE_AREA,
        data: { id: "journey-starmap.open", label: ctx.i18n.t("open"), run: () => host4.navigate("/starmap-plugin") },
        id: "open"
      }
    ]);
  }
};
export {
  entry_default as default
};
