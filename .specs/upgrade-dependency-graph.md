# Package Upgrade Dependency Graph

## Overview

This document visualizes the dependencies between package upgrade specifications.

## Dependency Graph

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Foundation"]
        SPEC001["SPEC-001<br/>Foundation & Build System<br/><small>TypeScript, Turbo, Vite, Vitest</small><br/><br/>⏱️ 2-4h | 🟢 Low Risk"]
    end

    subgraph Phase2["Phase 2: Parallel Work"]
        SPEC002["SPEC-002<br/>ESLint Migration<br/><small>ESLint 9, Flat Config</small><br/><br/>⏱️ 2-4h | 🟡 Medium Risk"]
        SPEC003["SPEC-003<br/>Core Dependencies<br/><small>Zod, Drizzle, Marked, ws</small><br/><br/>⏱️ 3-5h | 🟡 Medium Risk"]
        SPEC004["SPEC-004<br/>AI SDK Migration<br/><small>ai v6, Provider packages</small><br/><br/>⏱️ 8-16h | 🔴 HIGH Risk"]
    end

    subgraph Phase3["Phase 3: Final Integration"]
        SPEC005["SPEC-005<br/>Frontend Stack<br/><small>React, Router, Tailwind, UI</small><br/><br/>⏱️ 8-12h | 🔴 HIGH Risk"]
    end

    SPEC001 --> SPEC002
    SPEC001 --> SPEC003
    SPEC001 --> SPEC004
    SPEC003 --> SPEC005
    SPEC004 --> SPEC005

    style SPEC001 fill:#90EE90,stroke:#228B22
    style SPEC002 fill:#FFE4B5,stroke:#FF8C00
    style SPEC003 fill:#FFE4B5,stroke:#FF8C00
    style SPEC004 fill:#FFB6C1,stroke:#DC143C
    style SPEC005 fill:#FFB6C1,stroke:#DC143C
```

## Execution Timeline

```mermaid
gantt
    title Package Upgrade Execution Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    SPEC-001 Foundation      :a1, 2026-01-15, 1d
    section Phase 2 (Parallel)
    SPEC-002 ESLint          :a2, after a1, 1d
    SPEC-003 Core Deps       :a3, after a1, 1d
    SPEC-004 AI SDK          :a4, after a1, 3d
    section Phase 3
    SPEC-005 Frontend        :a5, after a3 a4, 2d
```

## Critical Path

The critical path (longest path) is:

```
SPEC-001 → SPEC-004 → SPEC-005
```

**Critical Path Duration:** 18-32 hours

This is determined by:
1. SPEC-001 must complete first (2-4h)
2. SPEC-004 (AI SDK) is the longest task (8-16h)
3. SPEC-005 depends on both SPEC-003 and SPEC-004

## Parallelization Opportunities

After SPEC-001 completes, these specs can run in parallel:

| Spec | Can Run With | Reason |
|------|--------------|--------|
| SPEC-002 | SPEC-003, SPEC-004 | No shared files |
| SPEC-003 | SPEC-002, SPEC-004 | Different packages |
| SPEC-004 | SPEC-002, SPEC-003 | Different packages |

## Risk Assessment

```mermaid
quadrantChart
    title Specs by Risk vs Effort
    x-axis Low Effort --> High Effort
    y-axis Low Risk --> High Risk
    quadrant-1 Careful Planning
    quadrant-2 Quick Wins
    quadrant-3 Do First
    quadrant-4 Major Undertaking

    SPEC-001: [0.25, 0.3]
    SPEC-002: [0.35, 0.5]
    SPEC-003: [0.45, 0.5]
    SPEC-004: [0.85, 0.9]
    SPEC-005: [0.75, 0.85]
```

## Dependency Matrix

| Spec | Depends On | Blocks |
|------|------------|--------|
| SPEC-001 | - | SPEC-002, 003, 004 |
| SPEC-002 | SPEC-001 | - |
| SPEC-003 | SPEC-001 | SPEC-005 |
| SPEC-004 | SPEC-001 | SPEC-005 |
| SPEC-005 | SPEC-003, SPEC-004 | - |

## Impact Analysis

### If SPEC-001 Fails
- **Impact:** All other specs blocked
- **Mitigation:** Low risk, well-understood changes

### If SPEC-004 Fails
- **Impact:** SPEC-005 blocked, AI features broken
- **Mitigation:** Keep backup, extensive testing, rollback plan

### If SPEC-005 Fails (React 19 path)
- **Impact:** UI broken
- **Mitigation:** Fallback to React 18, defer Tailwind 4

## Recommended Execution Order

1. **Day 1**: SPEC-001 (Foundation)
2. **Day 2-3**: SPEC-002, SPEC-003, SPEC-004 in parallel
   - Assign different developers if available
   - SPEC-004 will take longest
3. **Day 4-5**: SPEC-005 (Frontend)
4. **Day 6**: Integration testing, bug fixes

## Notes

- SPEC-002 is independent after SPEC-001 and can be done by a different team member
- SPEC-004 is on the critical path and has highest risk—should start as soon as SPEC-001 completes
- Consider doing SPEC-005 in two parts: stable updates first, then React 19/Tailwind 4 decisions
