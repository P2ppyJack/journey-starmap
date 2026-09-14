#!/usr/bin/env python3
"""Apply a hash-verified Journey source patch to an isolated Git checkout."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

PACKAGE = Path(__file__).resolve().parent


def git(repo, *args, env=None, payload=None):
    result = subprocess.run(['git', '-C', str(repo), *args], capture_output=True, env=env, input=payload)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace').strip() or f'git failed: {args[0]}')
    return result.stdout.decode().strip()


def main():
    if len(sys.argv) != 1:
        raise RuntimeError('no arguments supported; run from the root of the isolated target checkout')
    repo = Path.cwd()
    manifest = json.loads((PACKAGE/'manifest.json').read_text())
    payload = (PACKAGE/'full.patch').read_bytes()
    if hashlib.sha256(payload).hexdigest() != manifest['full_patch']['sha256']:
        raise RuntimeError('patch checksum mismatch; target was not changed')
    head = git(repo, 'rev-parse', 'HEAD')
    if head not in (manifest['base_commit'], manifest['head_commit']):
        raise RuntimeError('unsupported base commit; use the pinned isolated checkout')
    if git(repo, 'diff', '--no-ext-diff') or git(repo, 'ls-files', '--others', '--exclude-standard'):
        raise RuntimeError('target must be clean, including untracked files')
    tree = git(repo, 'write-tree')
    if tree == manifest['head_tree']:
        print('OK: exact source tree already applied; nothing changed.')
        return
    if head != manifest['base_commit'] or tree != manifest['base_tree']:
        raise RuntimeError('target index is not the pinned clean base or exact applied tree')
    # Reconstruct in a temporary index first; no target index/worktree writes.
    with tempfile.TemporaryDirectory(prefix='journey-preflight-') as tmp:
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp)/'index'))
        git(repo, 'read-tree', manifest['base_tree'], env=env)
        git(repo, 'apply', '--cached', env=env, payload=payload)
        if git(repo, 'write-tree', env=env) != manifest['head_tree']:
            raise RuntimeError('package does not produce the expected source tree; target unchanged')
    git(repo, 'apply', '--check', '--index', payload=payload)
    git(repo, 'apply', '--index', payload=payload)
    if git(repo, 'write-tree') != manifest['head_tree']:
        raise RuntimeError('applied tree mismatch; inspect target without retrying')
    print('OK: patch applied and staged. Runtime installation was not performed.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        print(f'error: {exc}', file=sys.stderr)
        sys.exit(1)
