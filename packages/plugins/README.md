# `@watchnt/plugins` — Plugin SDK

The plugin system lets third-party code run in an isolated Web Worker sandbox and communicate with the WatchNT host through a strictly permission-gated RPC bridge.

## Architecture

```
┌──────────────────────────────────┐
│         Host (main thread)       │
│  PluginHost  ←→  RpcMediator     │
└────────────┬─────────────────────┘
             │ postMessage (sandboxed)
┌────────────▼─────────────────────┐
│     Plugin Worker (untrusted)    │
│  WatchNtSDK  →  host methods     │
└──────────────────────────────────┘
```

- **`PluginHost`** – loads the plugin script into a Blob URL Worker and routes messages through `RpcMediator`.
- **`RpcMediator`** – each method is bound to a required `PluginPermission`; requests missing the permission throw before the handler runs.
- **SDK shim** – injected automatically; the plugin calls `self.watchnt.*` methods which transparently do the `postMessage` round-trip.

## Permissions

| Permission | Description |
|---|---|
| `storage:read` | Read notes and knowledge fragments |
| `storage:write` | Create / update content |
| `network` | Perform outbound fetch calls |
| `ai:invoke` | Run inference through the WatchNT AI abstraction |
| `retrieval:search` | Execute hybrid (vector + FTS) search |
| `prompt:read` | Read named prompt templates from the registry |
| `notes:generate` | Create notes from AI-generated structured data |

## Capabilities

| Capability | Description |
|---|---|
| `importer` | Plugin imports external content |
| `exporter` | Plugin exports notes to external formats |
| `ai-provider` | Plugin supplies its own AI backend |
| `retrieval-strategy` | Plugin supplies a custom search strategy |
| `prompt-template` | Plugin contributes prompt templates |
| `note-generator` | Plugin creates notes from AI output |

## Plugin Manifest Example

```json
{
  "id": "my-rag-plugin",
  "name": "My RAG Plugin",
  "version": "1.0.0",
  "permissions": ["retrieval:search", "ai:invoke", "notes:generate"],
  "capabilities": ["note-generator"]
}
```

## SDK API Reference

```js
// Available on self.watchnt inside the plugin Worker

// Storage
await self.watchnt.saveContent({ title, type, mimeType })  // requires storage:write
await self.watchnt.readNotes({ contentId })                 // requires storage:read

// AI
await self.watchnt.invokeAI(model, prompt)                  // requires ai:invoke

// Retrieval
await self.watchnt.search(query, limit?)                    // requires retrieval:search

// Prompts
await self.watchnt.readPrompt(key)                          // requires prompt:read

// Notes
await self.watchnt.generateNote(title, content)             // requires notes:generate
```

## Security

- Plugins run in a sandboxed Web Worker — no DOM access.
- All host API calls are intercepted by `RpcMediator` before any handler runs.
- Permissions are declared in the manifest and **cannot be escalated at runtime**.
- Revoke a plugin by calling `PluginHost.unload()`.
