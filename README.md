# Claude Prompt Forge

A Chrome/Edge extension that transforms a plain-language request into a **structured, Claude-optimized prompt** — instantly, from your browser toolbar.

It follows the "Anatomy of a Perfect Claude Prompt" structure, expanding whatever you type into eight ordered sections that Claude responds to well: **Purpose → Task → Context → Effort → Boundaries → Verification Rules → Stop Conditions → Output Format**. Copy gives you a paste-ready prompt; the raw JSON is one click away if you want it.

## Features

- **One-click prompt engineering** — describe what you want in the popup, click **Forge**, get a fully structured prompt back.
- **Claude-optimized structure** — short, plain, imperative sections addressed to Claude, grounded in your actual request (no invented facts or numbers).
- **Two providers** — Anthropic Claude API, or NVIDIA NIM (OpenAI-compatible, free tier available).
- **Copy or download** — Copy assembles a paste-ready prompt; Download and the raw-JSON toggle give you the structured object.
- **Keys stay local** — your API key is stored in `chrome.storage.local` and sent only to the provider you chose. Nothing is hardcoded and nothing is shared.

## Models

| Provider | Models |
|---|---|
| Anthropic | Claude Opus 4.8 (most capable), Claude Sonnet 5 (balanced, faster), Claude Haiku 4.5 (fastest) |
| NVIDIA NIM | Llama 3.3 70B, Nemotron Ultra 253B, Nemotron 70B, Mistral Large 2, DeepSeek R1, Gemma 3 27B |

> Tip: Haiku 4.5 is by far the fastest for this structured-rewrite task; Opus 4.8 produces the most thoughtful prompts but takes the longest.

## Install (unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Click the extension icon, open ⚙ **Settings**, choose a provider, and paste your API key:
   - Anthropic: [console.anthropic.com](https://console.anthropic.com/settings/keys)
   - NVIDIA NIM: [build.nvidia.com](https://build.nvidia.com/explore/discover)

## Usage

1. Type a request, e.g. *"Build a 12-week launch plan for an AI task manager for founders."*
2. Click **Forge Prompt** (or press `Ctrl`/`Cmd` + `Enter`).
3. Review the eight structured sections, then **Copy** the paste-ready prompt into Claude.

## Project structure

```
manifest.json    # MV3 manifest
background.js    # service worker — provider dispatch + system prompt + JSON parsing
popup.html       # popup UI
popup.css        # styles
popup.js         # popup logic — settings, forge, render, copy/download
icons/           # 16/48/128 px icons
```

## Privacy

The extension makes network requests only to the provider you select (`api.anthropic.com` or `integrate.api.nvidia.com`). Your prompt text and API key are sent to that provider to generate the structured prompt. No analytics, no third-party servers, no telemetry.

## License

[MIT](LICENSE)
