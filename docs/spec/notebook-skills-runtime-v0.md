# Notebook Skills Runtime v0

## 1. Thesis

**Proposal.** Srcbook can evolve from a local TypeScript notebook plus app-builder into a runtime for executable, verifiable notebook skills for agents. A notebook skill is a human-legible artifact containing prose, executable cells, model-call cells, deterministic validators, typed inputs/outputs, declared capabilities, and replayable traces.

**Repo-derived basis.** The current repo already has notebooks, `.src.md` codecs, cell schemas, Node/tsx execution, model calls, dependency installation, app-builder plans, Git diffs, preview logs, and artifact export (`docs/discovery/00-repo-map.md`, `docs/discovery/01-notebook-runtime.md`, `docs/discovery/02-app-builder-archaeology.md`).

## 2. Non-goals

- Do not rebuild the app builder as the center of the product.
- Do not require all existing notebooks to become skills.
- Do not rewrite the entire API in Effect-TS before proving the runtime.
- Do not make Markdown skills obsolete.
- Do not claim deterministic replay for model calls; replay can preserve inputs/outputs and skip or reissue calls by policy.

## 3. User types

- **Skill author:** writes and reviews notebook skills.
- **Agent/runtime caller:** selects and runs existing skills with typed inputs.
- **Human reviewer:** approves capabilities, repairs, or promotion.
- **Repository maintainer:** curates skill registry entries and deprecations.

## 4. Core objects

**Proposal.**

- `NotebookSkill`: manifest plus cells and assets.
- `SkillManifest`: cheap discovery object with name, description, version, schemas, capabilities, and validator summary.
- `SkillCell`: current cell plus role/authority metadata.
- `CapabilityGrant`: approved side-effect scope.
- `SkillRun`: immutable run record.
- `TraceEvent`: ordered log of cell execution, model calls, artifacts, validator outcomes, and repair attempts.
- `Artifact`: content-addressed file/output produced by a run.

## 5. Notebook-skill file format

**Proposal.** Keep existing `.src.md` compatibility but add a manifest:

```yaml
skill:
  name: repo-readme-generator
  version: 0.1.0
  description: Generate and verify a TypeScript package README.
  inputs: ./schemas/input.schema.json
  outputs: ./schemas/output.schema.json
  capabilities:
    filesystem:
      read: ["package.json", "src/**"]
      write: ["README.generated.md", "dist/skill-artifacts/**"]
    modelProvider: ["text-generation"]
  validators:
    - cell: validate-readme-sections
    - cell: validate-examples-compile
```

Current `.src.md` notebooks remain importable as human notebooks. Promotion into a skill requires adding the manifest and cell roles.

## 6. Cell roles

**Proposal.** Roles:

- `instruction`: human/agent guidance, not executable.
- `setup`: deterministic prep.
- `input_binding`: validates and binds caller input.
- `model_call`: invokes a model through `ModelProvider`.
- `transform`: deterministic code cell producing intermediate output.
- `validator`: deterministic pass/fail check; authoritative by default.
- `artifact`: writes or packages final output.
- `review`: requires human decision.

Existing cells map as follows: `markdown` may become `instruction`; `code` may become `setup`, `transform`, `validator`, or `artifact`; `package.json` remains dependency metadata; `title` becomes display metadata (`docs/discovery/01-notebook-runtime.md`).

## 7. Typed input/output contracts

**Proposal.** Inputs and outputs use JSON Schema or Zod-derived JSON Schema. A run fails before side effects if inputs do not validate. A run fails after execution if declared outputs do not validate.

## 8. Capability model

**Proposal.** All side effects require manifest-declared capabilities and runtime grants:

- `FileSystem`
- `Shell`
- `Network`
- `PackageManager`
- `ModelProvider`
- `Secrets`
- `ArtifactStore`
- `NotebookStore`
- `ValidatorRunner`
- `HumanReview`

Repo-derived side effects are inventoried in `docs/discovery/03-execution-and-safety.md`.

## 9. Execution lifecycle

1. Discover skill manifest.
2. Load full notebook skill.
3. Validate input.
4. Resolve and approve capabilities.
5. Execute cells sequentially for MVP; later add dependency-aware execution.
6. Capture trace events for each side effect and cell result.
7. Validate outputs.
8. Run validators.
9. Produce artifacts and final response only if required validators pass.

## 10. Verification lifecycle

Validators are authoritative cells. MVP validators must be deterministic and cannot call models. A passing run requires all required validators to pass. Optional validators may warn but cannot mark the run successful if required validators fail.

## 11. Repair lifecycle

If validation fails:

1. Freeze failing trace and artifacts.
2. Determine if repair is permitted by manifest.
3. Allow edits only to cells marked agent-editable.
4. Re-run from the earliest invalidated cell or from scratch for MVP.
5. Append repair attempt events to the same run or link a child run.
6. Stop after configured attempt limit or human review.

## 12. Skill registry

**Proposal.** Registry entries store cheap metadata: name, description, path, version, input/output schema hashes, capabilities, validator summary, tags, and deprecation status. This borrows progressive disclosure from Markdown agent skills (`docs/discovery/04-agent-skills-comparison.md`).

## 13. Promotion/forking/deprecation

A one-off notebook becomes promotable when it has:

- manifest;
- typed inputs and outputs;
- declared capabilities;
- at least one required validator;
- traceable artifacts;
- passing sample run;
- reviewer approval.

Forks carry lineage metadata. Deprecation keeps old traces readable but hides the skill from default selection.

## 14. Runtime traces and replay

Trace events must include cell ID, role, start/end time, capability used, inputs/outputs hashes, stdout/stderr, model metadata, artifact hashes, validator result, and error class. Replay modes:

- `audit`: show recorded events only.
- `deterministic`: re-run deterministic cells against recorded inputs.
- `full`: reissue model/network/package operations if capabilities allow.

## 15. Human review points

Human review may be required for initial capability grant, validator changes, repair after failed validators, promotion to registry, deprecation, and any secret exposure.

## 16. Effect-TS architecture proposal

**Proposal.** Build the notebook-skill runner with Effect services for capabilities first, not the whole app. The discovery memo recommends a narrow vertical slice because Effect is justified only if typed capabilities and replayable traces are product requirements (`docs/discovery/05-effect-ts-feasibility.md`).

## 17. Compatibility with current Srcbook notebooks

Existing notebooks load as human notebooks. Compatibility layer:

- Preserve current `.src.md` import/export.
- Default all existing code cells to `transform` only after explicit promotion.
- Do not infer validators automatically.
- Generate a draft manifest from title/prose/package only as a starting point.

## 18. Compatibility with Markdown agent skills

Notebook skills should interoperate with `SKILL.md` by exposing a generated discovery Markdown and allowing Markdown skills to call notebook skills. Markdown remains better for lightweight instruction-only workflows (`docs/discovery/04-agent-skills-comparison.md`).

## 19. MVP vertical slice

Build one callable skill: **Generate a TypeScript package README from repo metadata**.

It must:

- read `package.json` and selected source files;
- call one model cell to draft README;
- write `README.generated.md`;
- validate required sections and local links;
- compile or type-check included examples if feasible;
- produce a trace and artifact;
- demonstrate one validator failure and repair path.

## 20. Migration plan from current repo

1. Add docs/spec only (this branch).
2. Add a runner module/package without replacing current notebook execution.
3. Add manifest schemas in shared package.
4. Add trace persistence.
5. Add one MVP skill fixture.
6. Expose CLI/API endpoint to run the skill.
7. Add UI trace view after runner works.
8. Gradually route existing notebook execution through capability services.

## 21. Open questions

- Should manifests live inside `.src.md` front matter, beside it as `skill.yaml`, or both?
- Should validators be signed/frozen, or is Git review sufficient for MVP?
- What trace retention policy protects privacy while preserving auditability?
- How should model-call replay behave by default?
- Which schema format should be canonical: Zod source, JSON Schema, or both?

## 22. Risks and failure modes

- Visionary spec detached from code: mitigated by discovery docs.
- Over-indexing on app-builder: mitigated by reusing only loops/review primitives.
- Under-specifying authority: mitigated by cell roles, validator authority, and capability grants.
- Effect overreach: mitigated by a runner-only vertical slice.
- Security theater: mitigated by deny-by-default side-effect logging and declared capabilities.
