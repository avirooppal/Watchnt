# Legacy Windows recorder

Current recordings use the browser recorder described in the [main README](../README.md). This optional companion is retained for older native sessions and recovery; normal browser capture does not require installation.

The extension sends Start and Stop through Chrome Native Messaging. This companion
records the display containing the browser at Start, the default Windows speaker
output (WASAPI loopback), and the default microphone. Switching tabs does not stop
recording; other visible content on that display is also recorded. Use headphones
to prevent speaker audio from being picked up again by the microphone.

Video is encoded locally as WebM. Separate speaker/microphone PCM channels feed the
existing `/ws/transcribe` endpoint. Stop finalizes video, uploads it through the
existing recording API, and saves the transcript. AI outputs are generated only when selected in the meeting dashboard. No screen picker,
browser stream ID, public listening port, cloud recorder, or meeting bot is used.

## One-time installation

Python 3.10+ on Windows and the existing local WatchNT backend are required.
From PowerShell, using the extension ID shown in Chrome/Edge's extension details:

```powershell
.\companion\install.ps1 -ExtensionId YOUR_EXTENSION_ID
```

Keep this checkout in place: the per-user launcher points to its companion files.
The installer registers only the supplied extension ID. It does not install a
Windows service or enable recording at login. Native Messaging launches the helper
on demand. Reload the extension once after installation.

Windows must allow desktop applications to access the microphone. Recording never
starts automatically. The toolbar shows REC while recording. Backend/network errors
retain local files in `%LOCALAPPDATA%\WatchNT\recordings\<meeting-id>`; use
**Recover native recording** in Settings. Successful uploads remove the redundant
local video. A browser exit/reload interrupts its native host: recover any retained
partial file before starting a new capture.
