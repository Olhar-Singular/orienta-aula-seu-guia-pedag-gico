# Skip AI Mode

## What This Is

A "Skip AI" option in the existing adaptation wizard that lets teachers manually adapt questions without AI generation. Teachers choose between AI-assisted or manual adaptation after selecting their questions, giving them full control when they prefer to adapt content themselves.

## Core Value

Teachers can choose their workflow — AI assistance when helpful, manual control when preferred.

## Requirements

### Validated

- ✓ Multi-step adaptation wizard — existing
- ✓ AI-powered question adaptation — existing
- ✓ Structured content editor — existing
- ✓ PDF/DOCX export — existing
- ✓ Student barrier selection — existing

### Active

- [ ] Choice step after questions: "Generate with AI" or "Edit manually"
- [ ] Manual mode skips barriers step (not needed without AI)
- [ ] Manual mode goes directly to editor with original questions pre-filled
- [ ] Same editor interface for both AI and manual results
- [ ] Same export flow for manually adapted content

### Out of Scope

- New editor interface — reuse existing StructuredContentRenderer
- Barriers in manual mode — explicitly skipped per user request
- New route — stays within existing `/dashboard/adaptar` wizard

## Context

**Existing flow (5 steps):**
1. Activity Type → 2. Content/Questions → 3. Barriers → 4. AI Result → 5. Export

**New flow with Skip AI:**
1. Activity Type → 2. Content/Questions → **2.5. Choice (AI/Manual)** →
   - AI path: 3. Barriers → 4. AI Result → 5. Export
   - Manual path: Skip to Editor (with originals) → 5. Export

**Key components:**
- `AdaptationWizard.tsx` — manages wizard state and step progression
- `StructuredContentRenderer.tsx` — displays adapted content (reuse for manual)
- `WizardData` type — needs to track manual vs AI mode

## Constraints

- **Tech stack**: React + TypeScript + Tailwind (existing)
- **Integration**: Must work within existing wizard flow, not break AI path
- **Data format**: Manual adaptations must use same `StructuredActivity` type for export compatibility

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reuse existing editor | User confirmed same interface wanted | — Pending |
| Skip barriers in manual mode | User request — barriers only relevant for AI | — Pending |
| Choice appears after questions step | Logical point where paths diverge | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after initialization*
