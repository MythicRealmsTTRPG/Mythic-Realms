# Contributing to Mythic Realms

Thank you for your interest in contributing to **Mythic Realms** — a comprehensive, lore-rich, and technically extended Dungeons & Dragons system and compendium built for Foundry VTT.

Both **code** and **content** contributions are welcome. You may submit issues, proposals, or pull requests depending on the scope of your contribution. All submissions are reviewed for **technical correctness**, **rules intent**, **compatibility with Foundry VTT**, and **narrative/lore cohesion**.

Before contributing, please read this document carefully.

---

## Philosophy & Scope

Mythic Realms is not a simple SRD mirror.

It is:

* Exhaustively curated across **all TSR and WotC eras**
* Extended to support **Epic Levels**, **CR 50+ entities**, and restored legacy mechanics
* Manually authored for **soul, clarity, and narrative weight**
* Designed explicitly for **Foundry VTT**, not D&D Beyond parity

As such, contributions are evaluated not only on correctness, but on whether they **serve the vision of Mythic Realms**.

---

## Before You Contribute

Please ensure the following **before** opening a Pull Request (PR):

1. There is an **open issue** describing the change, addition, or fix.
2. The contribution does **not duplicate** existing or in-progress work.
3. You have read the relevant section of this document (Code vs Content).

If you are unsure, open an issue first.

---

## Developer Tooling

To work on Mythic Realms locally:

1. Clone the repository
2. Place or symlink it into your Foundry user data directory:

```
Data/systems/mythic-realms
```

### Node / NPM Setup

If your system supports `npm`, run the following from the project root:

#### `npm install`

* Installs all tooling dependencies
* Compiles CSS and database assets

#### `npm run build`

Runs all build steps:

* LESS → CSS
* JSON → LevelDB (Compendia)

#### CSS Only

* `npm run build:css`
* `npm run build:watch`

---

## Compendia as JSON

All compendium content is maintained in **human-readable JSON** for reviewability, lore editing, and long-term maintenance.

### Compile JSON → Packs

```
npm run build:db
```

Options:

* `npm run build:db` — Compile all packs
* `npm run build:db -- classes` — Compile a single pack

### Extract Packs → JSON

```
npm run build:json
```

Options:

* Extract all packs
* Extract a single pack
* Extract a single entry

### Clean & Normalize JSON

```
npm run build:clean
```

This will:

* Remove unnecessary flags and permissions
* Normalize spacing and ordering
* Ensure Mythic Realms formatting standards

---

## Issues

### Bug Reports

Bug reports must:

* Reproduce with **no external modules enabled**
* Include Foundry version and hosting details
* Provide clear reproduction steps
* Describe **expected vs actual behavior**

If the bug only occurs with a module enabled, report it to the module author.

### Feature Requests

All feature requests should answer:

* Does this support **RAW**, **legacy TSR rules**, or **Epic extensions**?
* Does it materially help a GM run Mythic Realms in Foundry?
* Is this foundational, or better suited as an external module?

Large or experimental systems may be deferred or declined if they conflict with design goals.

---

## Content Contributions

### Canonical Content

Canonical content must:

* Be sourced from **official TSR or WotC material**
* Be restored faithfully (including pre-nerf statblocks where applicable)
* Include corrected math, traits, and descriptions

### Mythic / Homebrew Content

Homebrew is accepted **only if** it:

* Is clearly marked
* Aligns with Mythic Realms power scaling
* Includes narrative flavor and mechanical justification

Low-effort or flavorless entries will not be merged.

### Common Content Fixes

Most content PRs involve:

* Fixing typos or math errors
* Restoring missing traits or actions
* Correcting legacy inconsistencies
* Expanding descriptions with lore-accurate text

---

## Translations

Mythic Realms does **not** include translations directly.

Translations should be implemented as **separate localization modules** compatible with Foundry VTT.

---

## Code Contributions

### Workflow

1. Fork the repository
2. Create a feature branch
3. Submit a PR against the correct development branch

### Style & Quality

* Follow existing project conventions
* ESLint must pass with **zero warnings**

Commands:

* `npm run lint`
* `npm run lint:fix`

### Linked Issues

All PRs must reference an open issue:

```
Closes #42
```

If you are working on an issue, comment first to avoid duplicate effort.

---

## Review Priority

PRs are reviewed based on:

### High Priority

* Bug fixes
* Critical system stability
* Content corrections

### Medium Priority

* Major features aligned with current milestones
* Significant content expansions

### Low Priority

* Large experimental systems
* Features outside current roadmap

---

## Pull Request Review Stages

1. **Triage & Scope Check**
2. **Technical Review** (structure, performance, correctness)
3. **Lore & Design Review**
4. **Final Maintainer Approval**

Large PRs may be requested to split into smaller, reviewable units.

---

## Releases

Releases are automated via GitHub Actions when a tag is pushed in the format:

```
release-x.x.x
```

### Release Requirements

* `system.json` version must match the tag
* Download URL must match the release artifact

Example:

```
https://github.com/your-org/mythic-realms/releases/download/release-1.0.0/mythic-realms-1.0.0.zip
```

### Release Process

1. Verify migration version
2. Update `system.json` version and download URL
3. Create release tag
4. Merge development branch to `master`
5. Update Foundry admin listing

---

## Final Note

Mythic Realms is built deliberately, manually, and with intent.

If you contribute here, you are helping preserve, restore, and expand the full legacy of Dungeons & Dragons — not just its modern surface.

Welcome to the Codex.
