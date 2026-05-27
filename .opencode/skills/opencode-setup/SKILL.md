---
name: opencode-setup
description: Use when configuring opencode agents, rules, skills, plugins, or opencode.json for this project
---

# opencode Setup

## Agent structure
- `.opencode/agents/orchestrator.md` — primary agent (mode: primary)
- `.opencode/agents/*.md` — 15 subagents (mode: subagent, hidden)
- All agents registered in `opencode.json`

## Rules
- `.opencode/rules/rules.md` — entry point
- `.opencode/rules/*.md` — architecture, signals, UI, etc.

## Adding a new agent
1. Create `.opencode/agents/<name>.md` with frontmatter
2. Add permission in `orchestrator.md` frontmatter
3. Add to `opencode.json` instructions if needed
4. Register in `AGENTS.md`

## Cursor bridge
- `.cursor/rules/*.mdc` — краткие rules; не дублировать целиком agents/
- После нового agent/rule — при необходимости строка в `kppdf-agents-router.mdc`

## Adding a new rule
1. Create `.opencode/rules/<name>.md`
2. Add reference to `.opencode/rules/rules.md`
3. Add to `opencode.json` instructions
