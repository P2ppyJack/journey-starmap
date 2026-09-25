# Security policy

## Supported version

Version 0.3.x is the supported package line. Earlier package revisions remain historical source snapshots.

## Report a vulnerability

Use GitHub's private **Report a vulnerability** flow:

<https://github.com/P2ppyJack/journey-starmap/security/advisories/new>

Do not publish credentials, private memory content, personal data, or exploit details in a public issue. Include the package version, affected file, reproduction steps, expected impact, and whether the issue also affects upstream Hermes Agent.

## Security model

- The apply helper validates the exact upstream base, target cleanliness, patch SHA-256, and resulting Git tree before changing the target index or worktree.
- SHA-256 detects accidental corruption. It does not authenticate a repository when an attacker can replace both the patch and manifest.
- Applying a patch is not installation. Dependency installation, building, deployment, data backup, and process restart remain separate operator actions.
- Provider nodes are read-only through Journey, but the external provider remains its own trust boundary.
- Provider messages and recalled content are treated as untrusted reference data. Delimiter hardening and review-before-send reduce risk but do not guarantee that content is safe.
