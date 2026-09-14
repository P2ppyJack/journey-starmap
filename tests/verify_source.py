"""Prove both package formats reproduce the pinned source tree.

Usage: python3 tests/verify_source.py /path/to/source-hermes-agent
The source clone must contain the exact base and head in manifest.json.
Only new temporary clones are modified. No network requests are made.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(*args, cwd=None):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(f'{args[0]} failed ({p.returncode}): {p.stderr}\n{p.stdout}')
    return p.stdout.strip()


def main():
    if len(sys.argv) != 2:
        raise RuntimeError('Provide the path to an existing source clone')
    source = Path(sys.argv[1]).resolve()
    m = json.loads((ROOT/'patches/manifest.json').read_text())
    for item in [m['full_patch'], *m['format_patches']]:
        if hashlib.sha256((ROOT/'patches'/item['path']).read_bytes()).hexdigest() != item['sha256']:
            raise RuntimeError('Package checksum mismatch: '+item['path'])
    for name in ('base', 'head'):
        tree = run('git','-C',str(source),'rev-parse',m[name+'_commit']+'^{tree}')
        if tree != m[name+'_tree']:
            raise RuntimeError('Source tree does not match manifest: '+name)
    expected_paths = run('git','-C',str(source),'diff','--name-only',m['base_commit'],m['head_commit']).splitlines()
    if expected_paths != m['changed_files']:
        raise RuntimeError('Changed-file set mismatch')
    results = []
    with tempfile.TemporaryDirectory(prefix='journey-source-proof-') as tmp:
        for mode in ('full', 'format-patch'):
            target = Path(tmp)/mode
            run('git','clone','--shared','--no-checkout',str(source),str(target))
            run('git','checkout','--detach',m['base_commit'],cwd=target)
            if run('git','status','--porcelain',cwd=target):
                raise RuntimeError('Fresh target is not clean')
            if mode == 'full':
                run(sys.executable,str(ROOT/'patches/apply.py'),cwd=target)
                run(sys.executable,str(ROOT/'patches/apply.py'),cwd=target)
            else:
                run('git','-c','commit.gpgsign=false','-c','user.name=Source Verification',
                    '-c','user.email=source-check@example.invalid','am',
                    *[str(ROOT/'patches'/p['path']) for p in m['format_patches']],cwd=target)
            tree = run('git','write-tree',cwd=target)
            if tree != m['head_tree'] or run('git','diff','--no-ext-diff',cwd=target):
                raise RuntimeError('Applied checkout does not match exact source tree')
            files = run('git','ls-tree','-r','--name-only',tree,cwd=target).splitlines()
            results.append({'format':mode,'tree':tree,'tracked_files':len(files),'changed_source_files':len(expected_paths)})
    for path, digest in m['preserved_files_sha256'].items():
        if hashlib.sha256((ROOT/path).read_bytes()).hexdigest() != digest:
            raise RuntimeError('Preserved file changed: '+path)
    print(json.dumps({'verified':True,'results':results,'preserved_files':len(m['preserved_files_sha256'])},indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        print(f'error: {exc}',file=sys.stderr)
        sys.exit(1)
