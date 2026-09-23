# Execution Directives
Upon intercepting the trigger, immediately process the trailing text in the prompt using the strict guardrails mapped below. Bypass default greeting hooks, execute immediately, and only halt when user approval is natively required by the terminal.
## Core Directives
### 1. COMMUNICATION GATE (Caveman Protocol)
- Do not use conversational filler, pleasantries, or polite transitions.
- Respond in punchy, direct text fragments or raw command execution blocks.
- Never summarize code in natural language unless explicitly asked.
- Let the written code or terminal output speak for itself.
### 2. CODE DESIGN GATE (Ponytail Protocol)
Before writing any code or introducing a change, evaluate it against the strict minimalist ladder:
1. YAGNI: Is this code or abstraction strictly necessary for the current instruction?
2. STDLIB: Can this be solved using only native platform capabilities or standard libraries?
3. NATIVE: Is there a built-in feature, HTML5 attribute, or modern runtime utility to handle this?
4. EXISTING: Can an existing dependency or helper function already in the codebase solve this?
5. ONE-LINER: Can this logic be cleanly compressed without reducing readability?
*Exception:* Never compromise on explicit security, robust input validation, or core error handling.
### 3. AUTOMATED PLANNING PROTOCOL
- Automatically map a single, flat architectural execution sequence before touching any files.
- Run an unprompted self-review step against the "Ponytail Protocol" to erase complex wrappers before they hit the codebase.
### 4. VALIDATION PROTOCOL
- Write a highly contained, one-shot test script or assertion block alongside any logical code changes.
- Automatically execute the test suite or target script inside the integrated terminal to verify success before declaring the task complete.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

### Repository-specific safeguards
- Use the project skills at `.agents/skills/graphify/SKILL.md` and `.agents/skills/caveman/SKILL.md` (Codex and other Agent Skills-compatible agents).
- Graph-first applies to architecture, dependencies, symbol relationships, call flows, impact, ownership, and schema relationships. Prefer scoped query/explain/path output; do not recursively grep or read the whole repository when the graph answers the question.
- Read source for exact implementation, graph-identified files, stale/incomplete graph coverage, or verification. EXTRACTED edges are source-derived evidence; INFERRED edges are hypotheses requiring verification when correctness matters.
- Build a missing graph with `graphify extract . --code-only --max-workers 2 --no-cluster`; refresh after substantial changes with `graphify update . --no-cluster`. Optional local clustering: `graphify cluster-only . --no-label --no-viz`.
- Respect `.gitignore` and `.graphifyignore`. Keep indexing local and code-only; never index meeting data, audio, credentials, environment files, private keys, or local secret stores. Do not enable semantic/cloud extraction without explicit user authorization.
- Caveman controls response style only: result first, concise technical prose, no filler or repetitive summaries. Preserve commands, paths, identifiers, errors, and code exactly. Never reduce correctness, engineering rigor, required warnings, reasoning/results, or test-failure reporting. Expand when asked.
- Tool setup on another machine: `uv tool install graphifyy==0.9.57` (or `pipx install graphifyy==0.9.57`). Both portable skills are checked into `.agents/skills/`; generated `graphify-out/` is local and ignored by Git. Build it using the command above. Application dependencies are independent of this tool.
