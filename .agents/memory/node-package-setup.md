---
name: Node package setup
description: Replit's Node package installer can resolve declared semver ranges to newer releases and rewrite project setup files.
---

When restoring missing Node dependencies through Replit's package installer, supplying existing ranged versions can still resolve newer compatible releases and rewrite `package.json`, the lockfile, and `.replit`.

**Why:** A dependency restore unexpectedly upgraded declared versions and added a Nix channel entry; the app built, but those changes were unrelated to the requested code work.

**How to apply:** After dependency setup, inspect `package.json`, the lockfile, and `.replit`; keep only necessary changes and validate that the lockfile still satisfies the declared ranges.