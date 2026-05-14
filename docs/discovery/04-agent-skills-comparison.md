# 04 Agent Skills Comparison

## Current Codex/OpenAI-style skill pattern

The current agent-skill pattern packages a skill directory with a `SKILL.md` containing name/description/instructions and optional supporting files/scripts/assets. Codex-style progressive disclosure initially exposes only metadata and paths, then loads the full skill body only when selected. This is operationally similar to a registry entry plus lazily loaded implementation.

## What SKILL.md solves well

- Cheap discovery: name, description, and path can be indexed without loading all content.
- Human legibility: Markdown instructions are easy to review and edit.
- Progressive disclosure: agents avoid flooding context until a skill is relevant.
- Optional scripts/assets: skills can ship executable helpers without making every instruction executable.
- Low ceremony: a skill can be useful before a runtime exists.

## What SKILL.md cannot enforce

- Typed input and output contracts.
- Declared capabilities before execution.
- Immutable validator cells.
- Deterministic pass/fail gates.
- Replayable run traces.
- Dependency-aware cell execution.
- Separation between human guidance, model-editable code, authoritative validators, and observed artifacts.

## Optional scripts vs executable notebook cells

Optional scripts are opaque tools invoked from instructions. Notebook cells are visible, ordered, explainable runtime units. For agent skills, cells could expose role metadata (`instruction`, `setup`, `model_call`, `transform`, `validator`, `artifact`) and capability declarations. That makes executable behavior inspectable and allows the runtime to log and replay each step.

## Progressive disclosure implications

A notebook skill should expose a cheap manifest before loading full cells:

- `name`, `description`, `version`.
- input/output schemas.
- capability summary.
- validator summary.
- estimated cost/runtime.
- compatibility tags.

Only after selection should the agent/runtime load prose, code cells, model prompts, fixtures, and validators.

## Extending the format

Proposed extensions over Markdown skills:

- Manifest with Zod/JSON Schema input and output contracts.
- Cell roles and authority flags.
- Capability declarations for `FileSystem`, `Shell`, `Network`, `PackageManager`, `ModelProvider`, `Secrets`, `ArtifactStore`, and `HumanReview`.
- Validator cells with immutability or reviewer signatures.
- Trace schema for outputs, artifacts, model calls, and repairs.

## Interop paths

- Compile notebook-skill manifest + intro prose into a `SKILL.md` for discovery-only use.
- Allow a Markdown skill to call a notebook skill by name when typed execution is needed.
- Import existing `SKILL.md` as prose/instruction cells, then add typed wrappers over time.

## Where Markdown remains better

Markdown skills remain better for lightweight guidance, policy reminders, workflows that do not need execution, and skills whose value is in explanation rather than verified artifacts. Notebook skills should not replace those; they should cover cases where an agent must run, verify, repair, and return evidence.
