"""Verify the packaged patch against an existing Hermes Agent clone.

Usage: python3 tests/verify_source.py PATH_TO_HERMES_CLONE
The source worktree and index are not modified.
"""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(*args: str, env=None) -> str:
    result = subprocess.run(args, capture_output=True, env=env, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("usage: verify_source.py PATH_TO_HERMES_CLONE")

    source = Path(sys.argv[1]).resolve()
    manifest = json.loads((ROOT / "patches/manifest.json").read_text(encoding="utf-8"))
    patch = ROOT / "patches" / manifest["patch"]["path"]
    if hashlib.sha256(patch.read_bytes()).hexdigest() != manifest["patch"]["sha256"]:
        raise RuntimeError("patch checksum mismatch")

    base_tree = run(
        "git", "-C", str(source), "rev-parse", manifest["upstream_base"] + "^{tree}"
    )
    if base_tree != manifest["upstream_base_tree"]:
        raise RuntimeError("upstream base tree mismatch")

    scratch = ROOT / ".test-tmp"
    scratch.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="source-check-", dir=scratch) as tmp:
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp) / "index"))
        run("git", "-C", str(source), "read-tree", base_tree, env=env)
        run(
            "git",
            "-C",
            str(source),
            "apply",
            "--3way",
            "--unidiff-zero",
            "--cached",
            str(patch),
            env=env,
        )
        result_tree = run("git", "-C", str(source), "write-tree", env=env)

    if result_tree != manifest["result_tree"]:
        raise RuntimeError("patch did not reproduce the declared tree")
    print(json.dumps({"verified": True, "result_tree": result_tree}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
