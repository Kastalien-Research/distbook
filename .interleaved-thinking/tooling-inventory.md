# Tooling Inventory

## Built-in Tools

| Tool | Purpose |
|------|---------|
| Task | Launch specialized agents for complex tasks |
| TaskOutput | Get output from background tasks |
| Bash | Execute shell commands |
| Glob | Pattern-based file search |
| Grep | Content search using ripgrep |
| Read | Read file contents |
| Edit | Make precise string replacements in files |
| Write | Create/overwrite files |
| NotebookEdit | Edit Jupyter notebooks |
| WebFetch | Fetch and analyze web content |
| WebSearch | Search the web for information |
| TodoWrite | Task tracking and planning |
| KillShell | Terminate background shells |
| AskUserQuestion | Ask clarifying questions |
| Skill | Execute predefined skills |
| EnterPlanMode | Enter planning mode for complex tasks |
| ExitPlanMode | Exit planning mode with a plan |

## MCP Tools (Model Context Protocol)

### IDE Integration
| Tool | Purpose |
|------|---------|
| mcp__ide__getDiagnostics | Get language diagnostics from VS Code |
| mcp__ide__executeCode | Execute Python code in Jupyter kernel |

### Exa (Search & Code Context)
| Tool | Purpose |
|------|---------|
| mcp__exa__web_search_exa | Web search with AI |
| mcp__exa__get_code_context_exa | Get code context for libraries/SDKs |

### Firecrawl (Web Scraping)
| Tool | Purpose |
|------|---------|
| mcp__firecrawl-mcp__firecrawl_scrape | Scrape single URL |
| mcp__firecrawl-mcp__firecrawl_map | Discover URLs on a website |
| mcp__firecrawl-mcp__firecrawl_search | Web search with optional scraping |
| mcp__firecrawl-mcp__firecrawl_crawl | Crawl multiple pages |
| mcp__firecrawl-mcp__firecrawl_check_crawl_status | Check crawl job status |
| mcp__firecrawl-mcp__firecrawl_extract | Extract structured data |
| mcp__firecrawl-mcp__firecrawl_agent | Autonomous web data gathering |
| mcp__firecrawl-mcp__firecrawl_agent_status | Check agent job status |

### Context7 (Documentation)
| Tool | Purpose |
|------|---------|
| mcp__context7__resolve-library-id | Resolve package name to library ID |
| mcp__context7__query-docs | Query library documentation |

### YouTube
| Tool | Purpose |
|------|---------|
| mcp__youtube-transcript__get_transcript | Extract YouTube video transcript |

### Thoughtbox (Reasoning)
| Tool | Purpose |
|------|---------|
| mcp__thoughtbox-prod__thoughtbox | Step-by-step reasoning tool |
| mcp__thoughtbox-prod__list_sessions | List previous reasoning sessions |
| mcp__thoughtbox-prod__get_session | Get session details |
| mcp__thoughtbox-prod__search_sessions | Search sessions |
| mcp__thoughtbox-prod__analyze_session | Analyze session quality |
| mcp__thoughtbox-prod__extract_learnings | Extract learnings from sessions |
| mcp__thoughtbox-prod__thoughtbox_cipher | Get notation system |
| mcp__thoughtbox-prod__notebook | Interactive notebooks |
| mcp__thoughtbox-prod__mental_models | Access mental models |

## Tooling Sufficiency Assessment

**TASK**: Determine what it takes to update all packages in the project to their most recent versions.

**Required Capabilities**:
1. Read current package versions from package.json files ✅ (Read, Glob)
2. Search for latest package versions on npm ✅ (WebSearch, mcp__firecrawl-mcp__firecrawl_search, mcp__exa__web_search_exa)
3. Check documentation for breaking changes ✅ (mcp__context7__query-docs, mcp__firecrawl-mcp__firecrawl_scrape)
4. Analyze dependencies and potential conflicts ✅ (Bash for npm/pnpm commands)
5. Edit package.json files ✅ (Edit, Write)
6. Run verification commands ✅ (Bash)

**Assessment**: SUFFICIENT - All required capabilities are available.
