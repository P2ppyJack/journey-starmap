#!/usr/bin/env python3
"""Apply the verified Journey patch to an isolated Git checkout."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

PACKAGE = Path(__file__).resolve().parent
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def git(repo: Path, *args: str, env=None) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        env=env,
        text=True,
    )
    if result.returncode:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(message or f"git failed: {args[0]}")
    return result.stdout.strip()


def load_package() -> tuple[dict, Path]:
    manifest = json.loads((PACKAGE / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise RuntimeError("unsupported manifest schema; target was not changed")

    item = manifest.get("patch")
    if not isinstance(item, dict):
        raise RuntimeError("invalid patch manifest; target was not changed")
    relative = Path(str(item.get("path", "")))
    if relative.is_absolute() or relative.parent != Path(".") or relative.name != str(relative):
        raise RuntimeError("unsafe patch path; target was not changed")

    digest = str(item.get("sha256", ""))
    if not SHA256.fullmatch(digest):
        raise RuntimeError("invalid patch checksum; target was not changed")
    patch = PACKAGE / relative
    if hashlib.sha256(patch.read_bytes()).hexdigest() != digest:
        raise RuntimeError("patch checksum mismatch; target was not changed")
    return manifest, patch


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("usage: apply.py PATH_TO_PINNED_HERMES_CHECKOUT")

    manifest, patch = load_package()
    repo = Path(sys.argv[1]).resolve()
    if git(repo, "rev-parse", "HEAD") != manifest["upstream_base"]:
        raise RuntimeError("unsupported base commit; use the pinned checkout")
    if git(repo, "status", "--porcelain=v1", "--untracked-files=all"):
        raise RuntimeError("target must be clean, including untracked files")
    if git(repo, "rev-parse", "HEAD^{tree}") != manifest["upstream_base_tree"]:
        raise RuntimeError("base tree mismatch; target was not changed")

    with tempfile.TemporaryDirectory(prefix="journey-patch-") as tmp:
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp) / "index"))
        git(repo, "read-tree", manifest["upstream_base_tree"], env=env)
        git(repo, "apply", "--3way", "--unidiff-zero", "--cached", str(patch), env=env)
        if git(repo, "write-tree", env=env) != manifest["result_tree"]:
            raise RuntimeError("patch result mismatch; target was not changed")

    git(repo, "apply", "--3way", "--unidiff-zero", "--index", str(patch))
    if git(repo, "write-tree") != manifest["result_tree"]:
        raise RuntimeError("applied tree mismatch; inspect the target")
    print("OK: Journey patch applied and staged.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
