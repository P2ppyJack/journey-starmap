"""Behavioral safety tests for the patch package, using disposable Git repos.

Run: python3 -m unittest discover -s tests -v
No network or Hermes installation is required.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1] / 'patches'


def git(path, *args):
    result = subprocess.run(['git', '-C', str(path), *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


class ApplyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'target'
        self.repo.mkdir()
        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'user.name', 'Patch Test')
        git(self.repo, 'config', 'user.email', 'patch-test@example.invalid')
        git(self.repo, 'config', 'commit.gpgsign', 'false')
        (self.repo/'sample.txt').write_text('before\n')
        git(self.repo, 'add', 'sample.txt')
        git(self.repo, 'commit', '-qm', 'base fixture')
        self.base = git(self.repo, 'rev-parse', 'HEAD')
        base_tree = git(self.repo, 'rev-parse', 'HEAD^{tree}')
        (self.repo/'sample.txt').write_text('after\n')
        git(self.repo, 'commit', '-qam', 'head fixture')
        self.head = git(self.repo, 'rev-parse', 'HEAD')
        head_tree = git(self.repo, 'rev-parse', 'HEAD^{tree}')
        patch = subprocess.check_output(['git', '-C', str(self.repo), 'diff', '--binary', '--full-index', self.base, self.head])
        git(self.repo, 'checkout', '-q', self.base)
        self.package = self.root/'package'
        self.package.mkdir()
        for name in ('apply.sh', 'apply.py'):
            if (PACKAGE/name).exists():
                shutil.copy2(PACKAGE/name, self.package/name)
        (self.package/'full.patch').write_bytes(patch)
        self.manifest = {
            'schema_version': 1, 'base_commit': self.base, 'head_commit': self.head,
            'base_tree': base_tree, 'head_tree': head_tree,
            'full_patch': {'path': 'full.patch', 'sha256': hashlib.sha256(patch).hexdigest()},
        }
        (self.package/'manifest.json').write_text(json.dumps(self.manifest))

    def apply(self, *args, repo=None):
        return subprocess.run(['bash', str(self.package/'apply.sh'), *args], cwd=repo or self.repo, capture_output=True, text=True)

    def snapshot(self, repo=None):
        p = repo or self.repo
        return (git(p, 'rev-parse', 'HEAD'), git(p, 'write-tree'), git(p, 'status', '--porcelain'),
                subprocess.check_output(['git', '-C', str(p), 'diff', '--binary']),
                (p/'sample.txt').read_bytes())

    def test_linked_worktree_supported(self):
        linked = self.root/'linked'
        git(self.repo, 'worktree', 'add', '--detach', str(linked), self.base)
        self.assertTrue((linked/'.git').is_file())
        result = self.apply(repo=linked)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(git(linked, 'write-tree'), self.manifest['head_tree'])
        self.assertEqual((self.repo/'sample.txt').read_text(), 'before\n')

    def test_unstaged_change_refused_without_change(self):
        (self.repo/'sample.txt').write_text('unrelated edit\n')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_partial_staged_change_refused_without_change(self):
        (self.repo/'sample.txt').write_text('partial edit\n')
        git(self.repo, 'add', 'sample.txt')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_published_head_is_exact_noop(self):
        git(self.repo, 'checkout', '-q', self.head)
        before = self.snapshot()
        result = self.apply()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('already', result.stdout.lower())
        self.assertEqual(before, self.snapshot())

    def test_applied_tree_with_unstaged_edit_is_refused(self):
        self.assertEqual(self.apply().returncode, 0)
        (self.repo/'sample.txt').write_text('edit after applying\n')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_unknown_arguments_cannot_apply(self):
        before = self.snapshot()
        result = self.apply('--check')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_expected_tree_mismatch_refused_before_apply(self):
        self.manifest['head_tree'] = '0' * 40
        (self.package/'manifest.json').write_text(json.dumps(self.manifest))
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('tree', result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_exact_apply_and_repeat_are_idempotent(self):
        result = self.apply()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(git(self.repo, 'write-tree'), self.manifest['head_tree'])
        self.assertEqual(git(self.repo, 'rev-parse', 'HEAD'), self.base)
        self.assertEqual((self.repo/'sample.txt').read_text(), 'after\n')
        before = self.snapshot()
        again = self.apply()
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn('already', again.stdout.lower())
        self.assertEqual(before, self.snapshot())

    def test_wrong_base_refused_without_change(self):
        git(self.repo, 'commit', '--allow-empty', '-qm', 'unsupported base fixture')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('base', result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_checksum_mismatch_refused_without_change(self):
        with (self.package/'full.patch').open('ab') as out:
            out.write(b'\n')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('checksum', result.stderr.lower())
        self.assertEqual(before, self.snapshot())

    def test_dirty_target_refused_without_change(self):
        (self.repo/'untracked.txt').write_text('unrelated user work\n')
        before = self.snapshot()
        result = self.apply()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(before, self.snapshot())
        self.assertEqual((self.repo/'untracked.txt').read_text(), 'unrelated user work\n')


if __name__ == '__main__':
    unittest.main()
