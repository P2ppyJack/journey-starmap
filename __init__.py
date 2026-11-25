"""Journey star map — plugin package.

The desktop half lives in desktop/plugin.js; the backend router in
dashboard/plugin_api.py. This package registers no agent hooks or tools, so
``register`` is intentionally a no-op.
"""

from __future__ import annotations


def register(ctx):  # noqa: D401 - Hermes plugin entry point
    """No agent-side registrations: the backend is the dashboard router."""
    return None
