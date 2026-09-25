"""Metadata and scope checks for the Journey patch package."""

import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "patches/manifest.json").read_text(encoding="utf-8"))
PATCH_NAME = "0001-feat-journey-star-map-provider-memory-nodes-multi-profile.patch"
SCREENSHOTS = {
    "01-slash-journey-composer.png": "e049a515fca55d2962be09604b49db604f8f0d65e5ff84173adff07a8411e855",
    "02-star-map-overview.png": "29f927745fdbff31f217df5692fd9a503f8dcf55abf7ef0608c1fdf540634e0f",
    "03-search-sidebar.png": "0c7442b7864c33b0afaee7ceba598f517892690f836bc1d769e3c6bbcedcbe4c",
    "04-search-results.png": "498186e72dc5cf5c26337a2f0553cc8a8716af9cb56ed4069940b7da1639dc23",
    "05-filter-conclusions.png": "9aa52c441344e516947602ad20857f1b84ff909496836d88f0b0a55650bd84d4",
    "06-node-context-menu.png": "0672cc29bcf03e04e6676c387c5cc926d001f0cf94e0be8b0b7391447f8fec7d",
    "07-provenance-sessions.png": "7552fb9e17cb539522ae562c7eccc3d52ee0d77118ccab75932c1eab19ce1035",
    "08-source-corpus.png": "84fe657eec56fd15e234919540ab2551fddd26505afa0ec39f819354a0e3470e",
    "09-recall-mode.png": "85b3bb5ca35562ea6ee71cffa1bc70d3545c4091be3c42248151cfe061e0532b",
    "10-recall-menu.png": "a21cd67601a13b4c0c18fe5412f18e11aab20b01c89e2ba6af1671dce31cd771",
    "11-recall-inserted-composer.png": "fd69eada7dc838fd011c16b38188dc63e40fbd8a159ce07f4dae1b3064ac58fd",
    "12-multi-profile-selector.png": "92bc20bd5b5fa0e865f727617e8d53fd422cff0048bfa6276e454bf1674337f9",
    "13-cross-profile-insert.png": "e744d3ca1af099db6ce09f39d647105b596f2e4869a6dd8a706009bb933a0fc4",
}


class MetadataTests(unittest.TestCase):
    def test_manifest_and_version(self):
        self.assertEqual((ROOT / "VERSION").read_text().strip(), "0.4.0")
        self.assertEqual(MANIFEST["schema_version"], 1)
        self.assertEqual(MANIFEST["package_version"], "0.4.0")
        self.assertEqual(
            MANIFEST["upstream_base"],
            "7b761da2de4979e424510ca7022bf9527aa65b68",
        )
        self.assertEqual(
            MANIFEST["result_tree"],
            "4ba1584dc86292dca24d16b9d6f4ce420467c3bd",
        )

    def test_exactly_one_patch_is_declared(self):
        patches = sorted(path.name for path in (ROOT / "patches").glob("*.patch"))
        self.assertEqual(patches, [PATCH_NAME])
        self.assertEqual(MANIFEST["patch"]["path"], PATCH_NAME)
        payload = (ROOT / "patches" / PATCH_NAME).read_bytes()
        self.assertEqual(
            hashlib.sha256(payload).hexdigest(), MANIFEST["patch"]["sha256"]
        )
        for removed in ("SOURCE.txt", "full.patch", "apply.sh"):
            self.assertFalse((ROOT / "patches" / removed).exists(), removed)

    def test_patch_scope_is_journey_only(self):
        result = subprocess.run(
            ["git", "apply", "--numstat", str(ROOT / "patches" / PATCH_NAME)],
            capture_output=True,
            check=True,
            text=True,
        )
        paths = [line.split("\t", 2)[-1] for line in result.stdout.splitlines()]
        self.assertEqual(len(paths), 44)
        self.assertEqual(len(paths), len(set(paths)))
        excluded = (
            "gateway/",
            "tui_gateway/",
            "ui-tui/",
            "web/",
            "docs/web-starjourney",
        )
        self.assertFalse([path for path in paths if path.startswith(excluded)])
        self.assertFalse([path for path in paths if "native_turn" in path])
        self.assertFalse([path for path in paths if "desktop_backend_attach" in path])

    def test_screenshots_are_byte_identical(self):
        directory = ROOT / "docs/screenshots"
        self.assertEqual(sorted(path.name for path in directory.glob("*.png")), sorted(SCREENSHOTS))
        for name, expected in SCREENSHOTS.items():
            self.assertEqual(hashlib.sha256((directory / name).read_bytes()).hexdigest(), expected)

    def test_readme_describes_screenshots(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("Screenshots 12 and 13", text)
        self.assertNotIn("excluded features", text)
        credit = (
            "Prepared by "
            + "Hermes ("
            + "agentic AI "
            + "assistant) under the direction of Tobias Musser."
        )
        self.assertEqual(text.count(credit), 1)

    def test_license_preserves_both_notices(self):
        text = (ROOT / "LICENSE").read_text(encoding="utf-8")
        self.assertIn("Copyright (c) 2025 Nous Research", text)
        self.assertIn("Copyright (c) 2026 Tobias Musser", text)

    def test_workflow_uses_pinned_actions_and_read_only_permissions(self):
        text = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
        self.assertIn("permissions:\n  contents: read", text)
        refs = re.findall(r"uses:\s+[^@\s]+@([0-9a-f]+)", text)
        self.assertTrue(refs)
        self.assertTrue(all(len(ref) == 40 for ref in refs))


if __name__ == "__main__":
    unittest.main()
