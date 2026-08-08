---
name: token-efficiency
description: Token efficiency and change-constraint rules for coding sessions. Use this skill whenever doing any multi-step coding work — editing files, updating configs (Vite, esbuild, Tailwind, etc.), modifying styling, working in a repo, or any session involving repeated file operations. Trigger for all substantive coding tasks, not just when the user mentions tokens, cost, or efficiency — these are default working habits, not a special mode.
---

# Token Efficiency and Change Constraints

Default working habits for coding sessions: read once, edit surgically, sync remotely. The goal is to spend context on thinking and building, not on re-reading and re-printing what already exists.

## 1. File Ingestion — read once, anchor it

Once a file is read into context, treat it as anchored in memory:

- **Do not** re-issue `cat`, `head`, `tail`, or read commands for files that have not changed. The earlier read is still valid — refer back to it.
- Re-reading is justified only when: (a) the file was modified since the last read (by you or an external process), (b) an edit tool requires a fresh view before editing, or (c) the earlier read was truncated and the needed section wasn't captured.
- When re-reading is genuinely required, read the **relevant range**, not the whole file.
- Before any read command, ask: "do I already have this in context?" If yes, skip the command.

## 2. Targeted Diff Editing — touch only what changes

When modifying styling, export settings, or configurations (esbuild, Vite, Tailwind, tsconfig, and similar):

- Output **only the lines being modified**, with just enough surrounding context to locate them unambiguously. Do not re-write untouched wrapper code, imports, or the rest of the config.
- Use surgical edit tools (string-replacement / patch-style edits) rather than full-file rewrites whenever they're available.
- When showing the user a change, show it as a focused diff or snippet — "here's the block that changed" — not the entire file re-printed.
- Full-file output is acceptable only for: brand-new files, very small files (roughly a screenful), or when the user explicitly asks to see the whole thing.
- Never regenerate a large file from memory to make a small change — that's how working code gets silently broken. Edit the real file in place.

**Zero-destruction diffs.** During any refactor or fix:
- Do not strip out working business logic that sits near the code being changed.
- Do not break or overwrite existing environment files (`.env`, `.env.local`) — never regenerate them, and never print their secrets.
- Do not drop active dependencies from package manifests unless removal is the explicit task.
- If a change *requires* touching any of the above, stop and flag it before proceeding.

## 3. Remote Synchronization — no duplicate mirrors

- Prioritize committing, staging, and pushing code directly via the remote repository or headless environment being worked in.
- **Do not** generate duplicate local mirror copies of files that already live in a repo (`component-v2.jsx`, `config-backup.js`, parallel scratch copies). Version control is the backup; duplicates drift and cause confusion about which file is real.
- One source of truth per file. If an experiment is needed, use a branch, not a copy.

**Conflict resolution.** If a push fails due to conflicts: run `git pull --rebase` and resolve conflicts step-by-step using only targeted line diffs. Resolve each conflict at the conflict markers — never "resolve" by rewriting surrounding code, regenerating whole files, or touching branches unaffected by the conflict. If a conflict is ambiguous (both sides look intentional), stop and ask rather than guessing.
- Exception: when no repo or remote exists (one-off artifacts, throwaway scripts), work locally as normal — this rule governs repo-backed work.

## Self-check during long sessions

1. Have I re-read anything that hasn't changed?
2. Did my last edit touch only the lines that needed to change?
3. Are there any `-v2` / `-backup` / duplicate files that shouldn't exist?
