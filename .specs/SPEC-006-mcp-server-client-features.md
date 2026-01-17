# SPEC-006: MCP Server & Client Features Implementation

> **Status**: Ready for Implementation
> **Priority**: P1
> **Estimated Effort**: 12-16 hours
> **Risk Level**: Medium
> **Dependencies**: SPEC-003 (Zod 4 completed)
> **MCP Specification**: 2025-11-25

## Overview

Complete the implementation of the Model Context Protocol (MCP) server and client features to make Srcbook a full "MCP Peer" - an entity that can both serve capabilities to the ecosystem and consume capabilities from other MCP servers. This enables Srcbook to participate in an agentic mesh.

**What's Already Done:**
- ✅ Type refactoring (all types extend SDK types)
- ✅ Tasks utility (long-running operations)
- ✅ Logging utility (structured logs)
- ✅ Progress notifications (operation progress)
- ✅ Pagination support (cursor-based)
- ✅ MCP SDK upgraded to 1.25.2 (Zod 4 compatible)

**What Needs Implementation:**
- ⏳ Complete server features (Tools, Resources, Prompts)
- ⏳ Complete client features (Sampling, Roots)
- ⏳ Integration with utilities
- ⏳ End-to-end testing

## Architecture Context

### MCP Peer Model

Srcbook implements the **MCP Peer** architecture:

```
┌─────────────────────────────────────────┐
│          Srcbook (MCP Peer)             │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────┐   ┌──────────────┐  │
│  │  MCP Server   │   │  MCP Client  │  │
│  │               │   │              │  │
│  │ • Tools (12)  │   │ • Sampling   │  │
│  │ • Resources   │   │ • Roots      │  │
│  │ • Prompts (3) │   │ • Tool calls │  │
│  └───────────────┘   └──────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │    Shared Utilities             │   │
│  │ • Tasks • Logging • Progress    │   │
│  │ • Pagination                     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
           │               │
           │               │
    Serves to        Consumes from
    external         external
    clients          servers
```

## Objectives

1. **Complete Server Features**: Implement full Tools, Resources, and Prompts specifications
2. **Complete Client Features**: Implement Sampling and Roots capabilities
3. **Integrate Utilities**: Use Tasks, Logging, Progress, and Pagination throughout
4. **Test Integration**: Verify full MCP Peer functionality

## Requirements

### Part 1: Server Features

#### REQ-001: Complete Tools Implementation

**Description**: Enhance existing tools implementation to full MCP spec compliance

**Current State**:
- Basic tool registration exists in `mcp/server/tools.mts`
- 12 tools defined (notebook operations, cell management, execution)
- Uses SDK's `server.tool()` method

**What Needs Implementation**:

1. **Tool Annotations** (Per spec section on Tools)
   - Add `annotations` object with hints:
     - `title`: Human-readable display name
     - `readOnlyHint`: Indicates read-only operations
     - `destructiveHint`: Warns about destructive operations
     - `idempotentHint`: Marks idempotent operations
     - `openWorldHint`: Indicates if tool accesses external systems

2. **Output Schema** (Optional but recommended)
   - Define expected output structure for each tool
   - Helps clients understand what to expect
   - Improves error handling

3. **Task Support** (Experimental)
   - Mark long-running tools with `execution.taskSupport`
   - Options: `"required"`, `"optional"`, `"forbidden"`
   - Integrate with our Tasks utility for:
     - Cell execution (long-running code)
     - AI code generation
     - Multi-step operations

4. **Tools List Changed Notification**
   - Emit `notifications/tools/list_changed` when tools change
   - Already declared in capabilities

**Acceptance Criteria**:
- [ ] All 12 tools have proper annotations
- [ ] Long-running tools support task execution
- [ ] Tools integrate with Progress utility for updates
- [ ] Tools integrate with Logging utility
- [ ] `list_changed` notifications work
- [ ] Tool results use proper content types (text, image, audio, embedded resources)

**Files to Modify**:
- `packages/api/mcp/server/tools.mts`
- `packages/api/mcp/server/index.mts`

---

#### REQ-002: Complete Resources Implementation

**Description**: Enhance existing resources implementation to full MCP spec compliance

**Current State**:
- Basic resource registration exists in `mcp/server/resources.mts`
- 5 resources defined (notebook state, cells, outputs, deps)
- Subscription support exists

**What Needs Implementation**:

1. **Resource Templates** (Dynamic URIs)
   - Implement template resources with URI parameters
   - Example: `srcbook://notebooks/{sessionId}/cells/{cellId}`
   - Allow clients to construct URIs dynamically

2. **Resource Annotations**
   - Add metadata to resources:
     - `audience`: Who should use this (`["user"]`, `["assistant"]`)
     - `priority`: Importance (0.0 to 1.0)

3. **Binary Content Support**
   - Handle images, PDFs, other binary data
   - Base64 encoding for blob content
   - Proper MIME type declaration

4. **Subscription Enhancements**
   - Use our Logging utility for subscription events
   - Implement proper cleanup on unsubscribe
   - Rate limiting for resource updates

5. **Pagination Integration**
   - Use our Paginator for large resource lists
   - Support cursor-based navigation

**Acceptance Criteria**:
- [ ] Resource templates work for dynamic URIs
- [ ] Binary content (cell outputs with images) works
- [ ] Annotations properly set for all resources
- [ ] Subscriptions integrate with utilities
- [ ] Pagination works for resource listing
- [ ] `list_changed` notifications work

**Files to Modify**:
- `packages/api/mcp/server/resources.mts`
- `packages/api/mcp/server/index.mts`

---

#### REQ-003: Complete Prompts Implementation

**Description**: Enhance existing prompts implementation to full MCP spec compliance

**Current State**:
- 3 prompts defined in `mcp/server/prompts.mts`
- Basic argument handling
- Simple text-based prompt templates

**What Needs Implementation**:

1. **Multi-Modal Prompts**
   - Support image content in prompt messages
   - Support audio content if applicable
   - Proper content type handling

2. **Prompt Arguments Schema**
   - Use proper JSON Schema for argument validation
   - Required vs optional arguments
   - Argument descriptions for UI hints

3. **Prompt Icons** (Optional)
   - Add icons for better UI presentation
   - Support SVG, PNG formats
   - Multiple sizes if needed

4. **Embedded Resources in Prompts**
   - Allow prompts to reference notebook resources
   - Include cell content, outputs in prompts
   - Use resource links for dynamic content

5. **Pagination Integration**
   - Use our Paginator for prompt listing

**Acceptance Criteria**:
- [ ] All 3 prompts have proper argument schemas
- [ ] Prompts can embed images/resources
- [ ] Pagination works for prompt listing
- [ ] `list_changed` notifications work
- [ ] Prompts produce properly formatted `GetPromptResult`

**Files to Modify**:
- `packages/api/mcp/server/prompts.mts`
- `packages/api/mcp/server/index.mts`

---

### Part 2: Client Features

#### REQ-004: Implement Sampling Capability

**Description**: Enable Srcbook to request AI completions from connected clients

**MCP Spec Reference**: `client/sampling`

**Why This Matters**:
- Allows notebook code to request AI completions
- Enables agentic behaviors within notebooks
- Supports tool use during sampling
- Integrates with external LLMs via client

**What Needs Implementation**:

1. **Sampling Request Handler** (Server-initiated)
   - Create `sampling/createMessage` request capability
   - Send sampling requests when notebook needs AI
   - Handle response with generated text

2. **Sampling Types** (Already in shared types)
   - `MCPSamplingMessage` - message format
   - `MCPSamplingRequest` - request structure
   - `MCPSamplingResponse` - response structure

3. **Model Preferences**
   - Support `intelligencePriority`, `speedPriority`, `costPriority`
   - Allow hints for model selection
   - Support `maxTokens`, `temperature`, `stopSequences`

4. **Tool Use in Sampling** (Advanced)
   - Declare `sampling.tools` capability
   - Allow AI to use Srcbook tools during completion
   - Multi-turn tool execution loop

5. **Integration Points**
   - Notebook AI cells can trigger sampling
   - AI code generation uses sampling
   - Debug/optimization features use sampling

6. **Task Integration**
   - Long-running AI generations use Tasks
   - Progress updates during generation
   - Cancellation support

**Acceptance Criteria**:
- [ ] `sampling/createMessage` requests work
- [ ] Model preferences properly sent
- [ ] Responses properly parsed
- [ ] Integration with notebook AI features
- [ ] Task support for long generations
- [ ] Progress tracking works

**Files to Create/Modify**:
- `packages/api/mcp/client/sampling.mts` (enhance existing)
- `packages/api/mcp/client/index.mts`
- `packages/shared/src/types/mcp.mts` (types exist)

---

#### REQ-005: Implement Roots Capability

**Description**: Expose Srcbook's workspace roots to servers

**MCP Spec Reference**: `client/roots`

**Why This Matters**:
- Servers need context about workspace structure
- File system access requires root information
- Multi-workspace support

**What Needs Implementation**:

1. **Roots List Request Handler**
   - Respond to `roots/list` requests
   - Return list of workspace roots
   - Each root has:
     - `uri`: File URI or custom scheme
     - `name`: Human-readable name

2. **Roots Changed Notification**
   - Emit `notifications/roots/list_changed`
   - When workspace folders change
   - When roots are added/removed

3. **Root Types**
   - File system roots (`file://`)
   - Git repository roots (`git://`)
   - Custom Srcbook roots (`srcbook://`)

4. **Integration Points**
   - Notebook session directories
   - User workspace folders
   - Project roots

**Acceptance Criteria**:
- [ ] `roots/list` requests work
- [ ] All active workspaces reported as roots
- [ ] `list_changed` notifications work
- [ ] Proper URI schemes used

**Files to Create/Modify**:
- `packages/api/mcp/client/roots.mts` (new)
- `packages/api/mcp/client/index.mts`

---

### Part 3: Integration & Testing

#### REQ-006: Utility Integration

**Description**: Integrate all utilities into server and client features

**Tasks Utility Integration**:
- [ ] Long-running tool calls use Tasks
- [ ] Cell execution wrapped in Tasks
- [ ] AI generation uses Tasks
- [ ] Proper task status updates

**Logging Utility Integration**:
- [ ] All MCP operations log appropriately
- [ ] Log levels: debug, info, warning, error
- [ ] Structured log data for debugging
- [ ] `notifications/message` sent to clients

**Progress Utility Integration**:
- [ ] Long operations report progress
- [ ] Progress tokens tracked properly
- [ ] `notifications/progress` sent
- [ ] Progress integrates with Tasks

**Pagination Utility Integration**:
- [ ] `tools/list` supports pagination
- [ ] `resources/list` supports pagination
- [ ] `prompts/list` supports pagination
- [ ] `tasks/list` supports pagination (if capability declared)
- [ ] Cursors are opaque and time-limited

**Acceptance Criteria**:
- [ ] All features use appropriate utilities
- [ ] No utility feature unused
- [ ] Logging visible in client
- [ ] Progress tracked for long operations

---

#### REQ-007: End-to-End Testing

**Description**: Comprehensive testing of MCP Peer functionality

**Test Scenarios**:

1. **Server Mode Tests**
   - [ ] External client connects to Srcbook server
   - [ ] Client discovers all tools/resources/prompts
   - [ ] Client calls notebook tools successfully
   - [ ] Client receives resource updates
   - [ ] Client uses prompts

2. **Client Mode Tests**
   - [ ] Srcbook connects to external MCP server
   - [ ] Discovers server capabilities
   - [ ] Calls external tools from notebook
   - [ ] Subscribes to external resources
   - [ ] Uses external prompts

3. **Bidirectional Tests** (True Peer)
   - [ ] Srcbook server ↔ Srcbook client
   - [ ] Server tools + client sampling
   - [ ] Cross-server tool orchestration

4. **Utility Tests**
   - [ ] Tasks work for long operations
   - [ ] Logging appears in client
   - [ ] Progress updates received
   - [ ] Pagination cursors work

5. **Edge Cases**
   - [ ] Connection drops handled gracefully
   - [ ] Invalid requests return proper errors
   - [ ] Rate limiting works
   - [ ] Auth/access control works

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Implementation Plan

### Phase 1: Server Features (4-6 hours)

**Day 1:**
1. Enhance Tools with annotations, task support
2. Add output schemas to tools
3. Integrate Tasks/Progress/Logging

**Day 2:**
1. Enhance Resources with templates, binary content
2. Add resource annotations
3. Integrate Pagination

**Day 3:**
1. Enhance Prompts with schemas, multi-modal
2. Add embedded resources to prompts
3. Test all server features

### Phase 2: Client Features (4-5 hours)

**Day 4:**
1. Implement Sampling capability
2. Add model preferences support
3. Integrate with notebook AI features

**Day 5:**
1. Implement Roots capability
2. Add roots changed notifications
3. Test client features

### Phase 3: Integration & Testing (4-5 hours)

**Day 6:**
1. Integrate all utilities across features
2. Write integration tests
3. Test bidirectional communication

**Day 7:**
1. End-to-end testing
2. Bug fixes
3. Documentation updates

---

## Success Criteria

**Must Have**:
- [ ] All server features fully implemented
- [ ] All client features fully implemented
- [ ] All utilities integrated
- [ ] Core tests passing
- [ ] No TypeScript errors

**Should Have**:
- [ ] Comprehensive test coverage
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Example notebooks demonstrating features

**Nice to Have**:
- [ ] Demo video showing MCP Peer capabilities
- [ ] External tool integrations (filesystem, database, etc.)
- [ ] Multi-server orchestration examples

---

## Technical Debt & Future Work

1. **Performance Optimization**
   - Connection pooling for multiple servers
   - Request batching
   - Caching strategies

2. **Security Enhancements**
   - Fine-grained access control
   - Tool execution sandboxing
   - Resource access policies

3. **Developer Experience**
   - MCP server development SDK for Srcbook
   - Testing utilities for MCP servers
   - Debugging tools

4. **Documentation**
   - MCP integration guide
   - Server development tutorial
   - Client usage examples

---

## References

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Srcbook MCP Documentation](./00-mcp-foundation.md)
- [MCP Security Spec](./03-mcp-security.md)

---

## Notes

- This spec assumes SPEC-003 (Zod 4 upgrade) is complete
- MCP SDK 1.25.2 is already installed and Zod 4 compatible
- All utility foundations are in place (Tasks, Logging, Progress, Pagination)
- Focus is on completing the feature surface area, not foundational infrastructure
- The goal is to make Srcbook a **full MCP Peer**, not just a server or just a client

---

## Appendix A: Current File Structure

```
packages/api/mcp/
├── server/
│   ├── index.mts           # Server initialization, capabilities
│   ├── tools.mts           # 12 tools (needs enhancement)
│   ├── resources.mts       # 5 resources (needs enhancement)
│   └── prompts.mts         # 3 prompts (needs enhancement)
├── client/
│   ├── index.mts           # Client manager
│   ├── sampling.mts        # Sampling (needs completion)
│   ├── tools.mts           # Tool invocation
│   ├── resources.mts       # Resource access
│   └── (roots.mts)         # NEEDS CREATION
├── utilities/
│   └── index.mts           # ✅ Tasks, Logging, Progress, Pagination
├── tasks/
│   └── index.mts           # ✅ Task manager
├── registry/
│   └── index.mts           # Capability registry
├── security/
│   └── index.mts           # Auth & approval
└── index.mts               # Main exports
```

## Appendix B: Tools to Implement

All 12 tools need proper annotations and task support:

1. `notebook_create` - Create new notebook
2. `notebook_open` - Open existing notebook
3. `notebook_list` - List all notebooks
4. `cell_create` - Create code/markdown cell
5. `cell_update` - Update cell content
6. `cell_delete` - Delete cell
7. `cell_execute` - Execute cell (LONG-RUNNING → Task)
8. `cell_stop` - Stop execution
9. `deps_install` - Install dependencies (LONG-RUNNING → Task)
10. `deps_list` - List dependencies
11. `generate_code` - AI code generation (LONG-RUNNING → Task)
12. `fix_errors` - AI error fixing (LONG-RUNNING → Task)

## Appendix C: Resources to Implement

All 5 resources need templates and proper content:

1. `srcbook://sessions` - Active sessions list
2. `srcbook://sessions/{id}` - Session details (TEMPLATE)
3. `srcbook://sessions/{id}/cells` - Cells list (TEMPLATE)
4. `srcbook://sessions/{id}/cells/{cellId}` - Cell content (TEMPLATE)
5. `srcbook://sessions/{id}/output/{cellId}` - Execution output (TEMPLATE, may include images)

## Appendix D: Prompts to Implement

All 3 prompts need proper schemas:

1. `create_analysis_notebook` - Data analysis notebook template
2. `debug_code_cell` - Debug failing code
3. `optimize_notebook` - Performance optimization suggestions
