"""Behavior tests for the Journey patch helper."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "patches/apply.py"
TEST_TMP = ROOT / ".test-tmp"


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True
    )
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout.strip()


class ApplyTests(unittest.TestCase):
    def setUp(self):
        TEST_TMP.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=TEST_TMP)
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / "target"
        self.repo.mkdir()
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.name", "Journey Patch")
        git(
            self.repo,
            "config",
            "user.email",
            "19334922+P2ppyJack@users.noreply.github.com",
        )
        git(self.repo, "config", "commit.gpgsign", "false")

        (self.repo / "sample.txt").write_text("before\n", encoding="utf-8")
        git(self.repo, "add", "sample.txt")
        git(self.repo, "commit", "-qm", "base fixture")
        self.base = git(self.repo, "rev-parse", "HEAD")
        base_tree = git(self.repo, "rev-parse", "HEAD^{tree}")

        (self.repo / "sample.txt").write_text("after\n", encoding="utf-8")
        git(self.repo, "commit", "-qam", "feature fixture")
        self.feature = git(self.repo, "rev-parse", "HEAD")
        result_tree = git(self.repo, "rev-parse", "HEAD^{tree}")
        patch = subprocess.check_output(
            ["git", "-C", str(self.repo), "format-patch", "-1", "-U0", "--stdout"]
        )
        git(self.repo, "reset", "--hard", self.base)

        self.package = self.root / "package"
        self.package.mkdir()
        shutil.copy2(HELPER, self.package / "apply.py")
        self.patch = self.package / "feature.patch"
        self.patch.write_bytes(patch)
        self.manifest = {
            "schema_version": 1,
            "package_version": "0.3.0",
            "upstream_base": self.base,
            "upstream_base_tree": base_tree,
            "feature_commit": self.feature,
            "result_tree": result_tree,
            "patch": {
                "path": self.patch.name,
                "sha256": hashlib.sha256(patch).hexdigest(),
            },
        }
        self.write_manifest()

    def write_manifest(self):
        (self.package / "manifest.json").write_text(
            json.dumps(self.manifest), encoding="utf-8"
        )

    def apply(self, repo=None, *extra):
        target = repo or self.repo
        return subprocess.run(
            [sys.executable, str(self.package / "apply.py"), str(target), *extra],
            cwd=self.root,
            env=dict(os.environ, TMPDIR=str(TEST_TMP)),
            capture_output=True,
            text=True,
        )

    def snapshot(self, repo=None):
        target = repo or self.repo
        return (
            git(target, "rev-parse", "HEAD"),
            git(target, "write-tree"),
            git(target, "status", "--porcelain=v1", "--untracked-files=all"),
            subprocess.check_output(["git", "-C", str(target), "diff", "--binary"]),
            subprocess.check_output(
                ["git", "-C", str(target), "diff", "--cached", "--binary"]
            ),
        )

    def test_exact_apply_stages_expected_tree(self):
        result = self.apply()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(git(self.repo, "write-tree"), self.manifest["result_tree"])
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), self.base)
        self.assertEqual((self.repo / "sample.txt").read_text(), "after\n")

    def test_linked_worktree_is_supported(self):
        linked = self.root / "linked"
        git(self.repo, "worktree", "add", "--detach", str(linked), self.base)
        result = self.apply(linked)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(git(linked, "write-tree"), self.manifest["result_tree"])
        self.assertEqual((self.repo / "sample.txt").read_text(), "before\n")

    def test_dirty_target_is_refused_without_change(self):
        (self.repo / "untracked.txt").write_text("unrelated\n", encoding="utf-8")
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_wrong_base_is_refused_without_change(self):
        git(self.repo, "commit", "--allow-empty", "-qm", "other base fixture")
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("base", result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_checksum_mismatch_is_refused_without_change(self):
        with self.patch.open("ab") as stream:
            stream.write(b"\n")
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("checksum", result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_result_tree_mismatch_is_refused_without_change(self):
        self.manifest["result_tree"] = "0" * 40
        self.write_manifest()
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("result", result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_extra_argument_is_refused_without_change(self):
        before = self.snapshot()
        result = self.apply(None, "unexpected")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())


if __name__ == "__main__":
    unittest.main()
