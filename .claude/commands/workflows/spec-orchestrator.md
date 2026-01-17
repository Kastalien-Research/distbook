# /spec-orchestrator

Coordinate implementation of multiple specification documents from a folder, managing dependencies, tracking progress across sessions, and preventing implementation spirals through OR-informed (Operations Research) constraints.

## Usage

```bash
/spec-orchestrator <spec_folder> [--budget=N] [--max-iterations=N] [--plan-only] [--resume]
```

## Variables

```
SPEC_FOLDER: $ARGUMENTS (required)
BUDGET: $ARGUMENTS (default: 100 energy units)
MAX_ITERATIONS: $ARGUMENTS (default: 3 per spec)
CONFIDENCE_THRESHOLD: $ARGUMENTS (default: 0.9)
WORKTREE_MODE: $ARGUMENTS (default: false)
PLAN_ONLY: $ARGUMENTS (default: false)
```

## OR Concepts Applied

This command applies several Operations Research principles to software implementation:

| OR Concept | Application |
|------------|-------------|
| **Resource Allocation** | Budget units distributed across specs based on complexity and dependencies |
| **Topological Sorting** | Dependency graph analysis determines optimal implementation order |
| **Queuing Theory** | Specs processed through priority queue with blocking/ready states |
| **Constraint Satisfaction** | Gates enforce requirements before proceeding; commitment levels act as constraints |
| **Multi-Criteria Decision Analysis** | Multi-perspective evaluation (Completionist, Integrator, Shipper, Quality Guardian) for accept/reject decisions |
| **Project Scheduling** | Time-boxing phases, critical path through dependency chain |
| **Inventory Control** | Budget tracking with threshold warnings (50%, 75% depletion triggers) |

## OODA Loop Structure

The command implements nested OODA (Observe-Orient-Decide-Act) loops at three levels:

### Primary Loop: Per-Spec Implementation (Phase 4, fastest cycle)

```
┌─────────────────────────────────────────────────────────────────┐
│  OBSERVE: Collect signals                                       │
│  - checklist_score (completion %)                               │
│  - files_modified_history (per iteration)                       │
│  - checklist_progress_history (delta per iteration)             │
│  - time_spent_history                                           │
│  - scope_baseline vs actual modifications                       │
├─────────────────────────────────────────────────────────────────┤
│  ORIENT: Pattern detection                                      │
│  - OSCILLATION: same 3+ files in iterations N, N-1, N-2         │
│  - SCOPE_CREEP: files outside spec's scope_baseline             │
│  - DIMINISHING_RETURNS: <10% progress for 2 consecutive iters   │
│  - THRASHING: 2x time spent with zero/negative progress         │
├─────────────────────────────────────────────────────────────────┤
│  DECIDE: Evaluate options                                       │
│  - Continue iteration?                                          │
│  - Accept partial completion?                                   │
│  - Escalate to MCDA voting?                                     │
│  - Force exit due to spiral?                                    │
├─────────────────────────────────────────────────────────────────┤
│  ACT: Execute decision                                          │
│  - Implement next TODO item                                     │
│  - OR break loop and mark complete/partial                      │
│  - OR escalate to user                                          │
└─────────────────────────────────────────────────────────────────┘
         ↺ Repeats up to MAX_ITERATIONS per spec
```

### Secondary Loop: Orchestration Level (Phases 1-6, slower cycle)

```
OBSERVE: Scan folder, read state.json, check budget_remaining, queue status
ORIENT:  Topological sort, identify READY vs BLOCKED specs, assess commitment_level
DECIDE:  Which spec next? Resume or fresh? Merge or preserve?
ACT:     Advance phase, select spec, unblock dependents, generate artifacts
         ↺ Repeats once per spec in queue
```

### Tertiary Loop: Integration Verification (Phase 5, conditional)

```
OBSERVE: Run test suite, gather pass/fail, detect conflicts
ORIENT:  Map failures → responsible specs, assess severity
DECIDE:  Pass gate? Return to Phase 4? Accept with warnings?
ACT:     Proceed to completion OR create fix tasks and recurse
         ↺ Repeats until gate passes or user accepts
```

### Commitment Level as OODA Constraint

The commitment level (0-5) progressively restricts the OODA loop's decision space:

| Level | Effect on OODA |
|-------|----------------|
| 0-1 | Full flexibility in Orient/Decide phases |
| 2 | Orient narrows: hard budget constraint active |
| 3 | Decide narrows: only incomplete specs, no new scope |
| 4 | Decide narrows further: bug fixes only |
| 5 | **Loop collapse**: Act without Observe/Orient/Decide → FORCE COMPLETE |

This acts as a circuit breaker, preventing infinite OODA cycling by reducing optionality until termination is the only remaining action.

## What This Solves

When you have a folder of specification documents (like `specs/observability/`) that describe related changes to implement:

- **Dependency Hell**: Specs may reference or depend on each other
- **Progress Blindness**: No visibility into what's done vs. remaining
- **Implementation Spirals**: Over-engineering or endless iteration on single specs
- **Conflict Collision**: Changes from different specs may contradict
- **Session Discontinuity**: Work lost when context resets

## Protocol Phases

### Phase 0: Session Detection

```
OBJECTIVE: Check for existing session state

Session Directory Structure:
  .spec-orchestrator/
  ├── active-session.json          # Points to current session
  └── sessions/
      ├── {session-name-timestamp}/
      │   ├── state.json
      │   ├── manifest.md
      │   └── specs/...
      └── {another-session}/...

Session Naming: "{spec-folder-name}-{YYYY-MM-DD-HHMM}"
  Example: "package-upgrades-2026-01-14-0320"

1. Check if .spec-orchestrator/sessions/ exists
2. If exists:
   - List all sessions with their status and last activity
   - Display active session (from active-session.json) if any
   - Offer: [R]esume active | [L]ist all sessions | [S]tart fresh | [C]ancel
3. If listing sessions:
   - Show: session name, status, progress, last modified
   - Allow selecting any session to resume or view
4. If resuming, load that session's state and skip to last active phase
5. If starting fresh:
   - Create new session directory with timestamp
   - Update active-session.json to point to it
   - Proceed to Phase 1
6. CRITICAL: Never overwrite existing sessions - always create new directories

STATE_FILE: .spec-orchestrator/sessions/{session-name}/state.json
MANIFEST_FILE: .spec-orchestrator/sessions/{session-name}/manifest.md
ACTIVE_SESSION_FILE: .spec-orchestrator/active-session.json
```

### Phase 1: Discovery & Inventory (Time-boxed: 10% of budget)

```
OBJECTIVE: Scan and index all specification documents

1. Scan SPEC_FOLDER for files matching pattern (default: *.md)
2. For each spec file found:
   - Extract title/name
   - Parse requirements/acceptance criteria
   - Identify explicit dependencies (references to other specs)
   - Estimate complexity (low/medium/high based on requirements count)
   - Calculate initial budget allocation

3. Create manifest.md with discovered specs:

   | Spec | Requirements | Complexity | Est. Budget | Dependencies |
   |------|-------------|------------|-------------|--------------|
   | telemetry.md | 8 | medium | 25 | None |
   | metrics.md | 12 | high | 35 | telemetry.md |
   | alerts.md | 5 | low | 15 | metrics.md |

GATE: Discovery complete?
- [ ] All spec files found and parsed
- [ ] No parse errors (or errors documented)
- [ ] Initial complexity estimates assigned
- [ ] Manifest created

If GATE fails: Report parsing issues, ask user for guidance
```

### Phase 2: Dependency Analysis (Time-boxed: 10% of budget)

```
OBJECTIVE: Build dependency graph and determine implementation order

1. Analyze cross-references between specs:
   - Explicit: "See telemetry.md" or "Depends on metrics implementation"
   - Implicit: Shared entity/concept references

2. Build directed dependency graph:

   telemetry.md ──────┐
                      ├──> alerts.md
   metrics.md ────────┘
        │
        └──> dashboard.md

3. Detect circular dependencies:
   - If found: STOP and escalate to user
   - Circular deps require manual resolution

4. Topological sort for implementation order:
   - Independent specs first (no dependencies)
   - Then specs whose dependencies are satisfied
   - Identify parallelizable specs (no shared dependencies)

5. Update manifest with dependency graph visualization

GATE: Dependency analysis complete?
- [ ] All cross-references identified
- [ ] No circular dependencies (or user has resolved them)
- [ ] Topological order determined
- [ ] Parallelization opportunities identified

If GATE fails: Escalate circular dependencies to user
```

### Phase 3: Implementation Planning (Time-boxed: 5% of budget)

```
OBJECTIVE: Create detailed implementation queue with budget allocation

1. Allocate budget to each spec based on:
   - Complexity estimate
   - Number of requirements
   - Dependency depth (deeper = more risk = more budget)

   Formula: spec_budget = BASE_ALLOCATION * complexity_multiplier * (1 + dependency_depth * 0.1)

2. Create implementation queue in dependency order:

   QUEUE:
   1. telemetry.md (budget: 20, deps: none) - READY
   2. metrics.md (budget: 30, deps: none) - READY
   3. alerts.md (budget: 25, deps: telemetry, metrics) - BLOCKED
   4. dashboard.md (budget: 25, deps: metrics) - BLOCKED

3. Initialize state tracking:

   {
     "session_id": "uuid",
     "started_at": "ISO8601",
     "budget_total": 100,
     "budget_remaining": 100,
     "commitment_level": 0,
     "queue": [...],
     "completed": [],
     "current": null
   }

4. Set up tracking directories (session-specific):
   .spec-orchestrator/
   ├── active-session.json         # {"session": "package-upgrades-2026-01-14-0320"}
   └── sessions/
       └── {session-name}/
           ├── state.json
           ├── manifest.md
           ├── specs/
           │   ├── telemetry/
           │   ├── metrics/
           │   └── ...
           └── implementation-log.md

GATE: Planning complete?
- [ ] Budget allocated to all specs (total <= BUDGET)
- [ ] Queue ordered correctly
- [ ] State initialized
- [ ] Tracking directories created

If GATE fails: Re-adjust budget allocation
```

### Phase 4: Iterative Implementation Loop (Time-boxed: 60% of budget)

```
OBJECTIVE: Implement each spec with validation gates and spiral prevention

MAIN LOOP:
while queue is not empty AND budget_remaining > 0:

  # Step 4.1: Select Next Spec
  current_spec = first READY spec from queue
  if no READY specs:
    check if blocked specs can be unblocked
    if still blocked: wait or escalate

  mark current_spec as IN_PROGRESS
  log "Starting implementation of {current_spec}"

  # Step 4.2: Spec Implementation Sub-Loop
  iteration = 0
  while iteration < MAX_ITERATIONS:
    iteration += 1

    # 4.2.1: Extract Implementation Tasks
    if iteration == 1:
      Parse spec file for requirements
      Generate TODOS.md with actionable tasks
      Generate CHECKLIST.md with verification criteria
      Save to .spec-orchestrator/specs/{spec_name}/

    # 4.2.2: Implement Changes
    For each TODO item:
      - Make code changes
      - Write/update tests if specified
      - Document significant decisions
      - Track files modified

    # 4.2.3: Validation Gate
    Run CHECKLIST verification:
    - [ ] All requirements addressed
    - [ ] Tests pass (if applicable)
    - [ ] No regressions introduced
    - [ ] Code quality maintained

    checklist_score = completed_items / total_items

    if checklist_score >= CONFIDENCE_THRESHOLD:
      BREAK - spec complete
    else:
      log "Iteration {iteration}: {checklist_score * 100}% complete"
      remaining_items = unchecked checklist items
      continue to next iteration

    # 4.2.4: Spiral Detection (OODA: Observe)
    # Collect signals for pattern detection:

    signals = {
      files_modified_this_iteration: [...],
      files_modified_history: [[iter1], [iter2], ...],
      checklist_progress_history: [0.2, 0.4, 0.45, ...],
      scope_baseline: files_referenced_in_spec,
      time_spent_this_iteration: duration,
      time_spent_history: [dur1, dur2, ...]
    }

    # 4.2.5: Pattern Analysis (OODA: Orient)
    # Apply detection heuristics to signals:

    OSCILLATION detection:
      trigger: intersection(files_modified_history[-1], files_modified_history[-3]) >= 3 files
              AND those files also appear in files_modified_history[-2]
      meaning: Same files touched in iterations N, N-1, and N-2 → likely flip-flopping
      action: log warning, commitment_level += 1

    SCOPE_CREEP detection:
      trigger: len(files_modified_this_iteration - scope_baseline) > 0
              AND those files not in any spec's scope_baseline
      meaning: Modifying files not mentioned or implied by any spec
      action: revert out-of-scope changes, log warning, commitment_level += 1

    DIMINISHING_RETURNS detection:
      trigger: iteration >= 2
              AND (checklist_progress_history[-1] - checklist_progress_history[-2]) < 0.1
              AND (checklist_progress_history[-2] - checklist_progress_history[-3]) < 0.1
      meaning: Less than 10% progress in each of last 2 iterations
      action: flag for early MCDA evaluation

    THRASHING detection:
      trigger: time_spent_history[-1] > (2 * avg(time_spent_history[:-1]))
              AND checklist_progress_history[-1] <= checklist_progress_history[-2]
      meaning: Spending more time but making no progress
      action: immediate escalation to MCDA

    # 4.2.6: Decide & Act
    # Based on Orient phase, determine next action:

    if any spiral detected at commitment_level >= 3:
      FORCE early exit from iteration loop → proceed to MCDA
    elif diminishing_returns OR thrashing:
      reduce remaining iteration budget, flag for user attention
    else:
      continue normal iteration

  # Step 4.3: Iteration Limit Reached
  if iteration >= MAX_ITERATIONS AND not complete:
    log "Max iterations reached for {current_spec}"

    # Multi-Criteria Decision Analysis (MCDA)
    # Evaluate from multiple stakeholder perspectives:
    COMPLETIONIST: "Requirements not fully met"
    INTEGRATOR: "May affect dependent specs"
    SHIPPER: "Partial progress is still progress"
    QUALITY_GUARDIAN: "Tests passing?"

    votes = count_continue_votes()

    if votes >= 3:
      mark as PARTIAL_COMPLETE, continue to next spec
    else:
      ESCALATE to user:
        "Spec {current_spec} at {checklist_score}% after {MAX_ITERATIONS} iterations.
         [C]ontinue with more iterations
         [A]ccept partial completion
         [S]kip this spec
         [H]alt orchestration"

  # Step 4.4: Spec Completion
  mark current_spec as COMPLETED
  budget_remaining -= budget_spent
  update state.json
  unblock dependent specs

  # Step 4.5: Conflict Check
  Compare changes with previously completed specs:
  - File conflicts (same file, different changes)
  - Semantic conflicts (contradictory behavior)

  if conflicts detected:
    log to conflicts.md
    ask user for resolution strategy

END MAIN LOOP

COMMITMENT_LEVEL ENFORCEMENT:
  Level 0: No constraints
  Level 1: Soft warning at 50% budget
  Level 2: Hard stop at 75% budget
  Level 3: Only incomplete specs, no new work
  Level 4: Bug fixes only
  Level 5: FORCE COMPLETE - accept all current states
```

### Phase 5: Integration Verification (Time-boxed: 10% of budget)

```
OBJECTIVE: Verify all implementations work together

1. Run full test suite:
   - Unit tests
   - Integration tests (if available)
   - Type checking
   - Linting

2. Cross-spec validation:
   - Check for runtime conflicts
   - Verify shared dependencies
   - Test interaction points

3. Generate integration report:

   INTEGRATION STATUS:
   ✅ All tests passing
   ✅ No type errors
   ⚠️  2 lint warnings (non-blocking)
   ✅ No runtime conflicts detected

GATE: Integration verified?
- [ ] All tests pass
- [ ] No critical conflicts
- [ ] No regressions from baseline

If GATE fails:
  - Identify failing tests
  - Map to responsible spec(s)
  - Create fix tasks
  - Return to Phase 4 for targeted fixes
```

### Phase 6: Completion & Merge (Time-boxed: 5% of budget)

```
OBJECTIVE: Generate final report and handle merge

1. Generate final-report.md:

   # Spec Orchestrator Final Report

   ## Session Summary
   - Started: 2024-01-15 10:00
   - Completed: 2024-01-15 14:30
   - Duration: 4.5 hours
   - Budget used: 85/100 units

   ## Specs Implemented
   | Spec | Status | Iterations | Files Changed |
   |------|--------|------------|---------------|
   | telemetry.md | ✅ Complete | 1 | 3 |
   | metrics.md | ✅ Complete | 2 | 5 |
   | alerts.md | ⚠️ Partial | 3 | 4 |

   ## Files Modified
   - src/telemetry/index.ts (created)
   - src/metrics/collector.ts (modified)
   - src/alerts/rules.ts (created)
   - ...

   ## Conflicts Resolved
   - None

   ## Notes
   - alerts.md: Section 3.2 requirements ambiguous, implemented conservative interpretation

   ## Next Steps
   - Review alerts.md implementation with stakeholder
   - Consider follow-up spec for advanced alerting features

2. Present summary to user:

   📊 SPEC ORCHESTRATOR COMPLETE
   =============================

   Implemented: 3/3 specs
   Complete: 2 | Partial: 1
   Budget: 85/100 used
   Files: 12 modified, 4 created
   Tests: All passing

   Ready to merge? [Y]es | [N]o | [R]eview changes

3. If user confirms:
   - If worktree mode: merge branch to main
   - If in-place: commit changes
   - Clean up .spec-orchestrator/ (or archive)

4. If user declines:
   - Preserve .spec-orchestrator/ for manual review
   - Provide instructions for manual merge
   - Keep state for potential resume
```

## Anti-Patterns Prevented

### The Spec Soup Spiral
- **Symptom**: Jumping between specs without completing any
- **Prevention**: Queue-based ordering, completion gates before proceeding

### The Perfect Implementation Trap
- **Symptom**: Endless iteration seeking 100% on every spec
- **Prevention**: Iteration limits, multi-criteria decision analysis, partial completion acceptance

### The Dependency Deadlock
- **Symptom**: Stuck waiting for specs that depend on each other
- **Prevention**: Circular dependency detection in Phase 2

### The Scope Avalanche
- **Symptom**: Each spec grows to encompass more than intended
- **Prevention**: Scope tracking, out-of-scope change detection and revert

### The Context Amnesia
- **Symptom**: Losing track of what's done across sessions
- **Prevention**: Persistent state, detailed logging, resume capability

### The Session Overwrite Disaster
- **Symptom**: New orchestration destroys previous session state
- **Prevention**: Session-specific directories with timestamps, never overwrite existing sessions
- **Critical**: Each session is preserved in `.spec-orchestrator/sessions/{name-timestamp}/`

## Decision Framework

### When to Accept Partial Completion

**Accept if:**
- Core functionality implemented
- Tests for implemented parts pass
- Remaining items are enhancement-level
- User/time constraints require it
- Dependent specs can proceed with partial

**Don't accept if:**
- Core requirements unmet
- Tests failing
- Would break dependent specs
- Security/safety implications

### When to Escalate

**Escalate immediately if:**
- Circular dependencies detected
- Spec requirements contradict each other
- Implementation requires architectural changes beyond spec scope
- Security concerns identified
- Budget exhausted with critical specs incomplete

## Example Usage

```bash
# Basic: Implement all specs in observability folder
/spec-orchestrator specs/observability/

# With constraints
/spec-orchestrator specs/observability/ --budget=50 --max-iterations=2

# Plan only (analyze without implementing)
/spec-orchestrator specs/observability/ --plan-only

# Resume previous session
/spec-orchestrator specs/observability/ --resume

# With git worktree isolation
/spec-orchestrator specs/observability/ --worktree
```

## Integration with Other Commands

```bash
# Use within orchestrator for individual spec complexity
/implement-spec .spec-orchestrator/specs/telemetry/

# Debug implementation failures
/systematic-debug "metrics.md test failures"

# Visualize dependency relationships
/knowledge-graph "spec dependencies"

# Review before merge
/context-aware-review "spec implementations"

# Track evolution of implementations
/evolution-tracker "observability implementation"
```

## Output Artifacts

```
.spec-orchestrator/
├── active-session.json            # Points to current active session
└── sessions/
    └── {session-name-timestamp}/  # Each session is preserved
        ├── state.json             # Persistent orchestration state
        ├── manifest.md            # Human-readable spec inventory
        ├── dependency-graph.md    # Visual dependency relationships
        ├── implementation-log.md  # Detailed action log
        ├── conflicts.md           # Detected conflicts (if any)
        ├── final-report.md        # Completion summary
        └── specs/
            ├── telemetry/
            │   ├── TODOS.md       # Implementation tasks
            │   ├── CHECKLIST.md   # Verification criteria
            │   └── NOTES.md       # Implementation notes
            ├── metrics/
            │   └── ...
            └── alerts/
                └── ...
```

**Session Preservation Benefits:**
- Resume any past session at any time
- Audit what happened in previous orchestrations
- Compare different implementation approaches
- Never lose progress due to new sessions

## Meta-Learning

The orchestrator learns from each session:

- **Complexity Estimation**: Actual vs. estimated effort
- **Dependency Detection**: Patterns in spec cross-references
- **Spiral Triggers**: What causes implementation loops
- **Optimal Ordering**: Which sequences work best

Store learnings in vector memory for future sessions:
```
mcp__letta-memory__add_vector_memory("spec-orchestrator: observability specs - metrics before alerts reduces conflicts")
```

## Quality Gates Summary

| Phase | Gate | Failure Action |
|-------|------|----------------|
| 1. Discovery | All specs parsed | Report errors, ask for guidance |
| 2. Dependencies | No circular deps | Escalate to user |
| 3. Planning | Budget allocated | Re-adjust allocation |
| 4. Implementation | Confidence threshold | Iterate or escalate |
| 5. Integration | Tests pass | Return to Phase 4 |
| 6. Completion | User approval | Preserve for review |

---

*This command applies Operations Research principles to transform multi-spec implementation from chaotic juggling into systematic orchestration, ensuring progress visibility, preventing spirals, and maintaining quality across the entire spec set.*
