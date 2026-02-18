# GitHub Copilot Instructions for Discord Exporter

This repository is a lightweight **Chrome/Edge extension** (Manifest v3) that exports Discord chat history to CSV. There is no build tool – the code runs as plain ES modules injected by the extension.

---

## Big picture

- **manifest.json** declares one `action` popup (`public/popup.html`) and a `content_scripts` entry that injects `src/lib/content-utils.js` + `src/content.js` on `https://discord.com/channels/*` pages.
- The UI lives in `public/` (HTML/CSS/icons). JavaScript logic is split:
  * `src/lib/popup-utils.js` – all the DOM manipulation / theme handling / CSV conversion / messaging logic used by the popup.
  * `src/lib/content-utils.js` – scroll logic, message extraction, date filtering and the `exportChat()` driver.
  * `src/popup.js` and `src/content.js` simply call `window.DiscordExporterPopup.init()` / `window.DiscordExporterContent.init()` so they can be re‑injected without re‑evaluating the entire library.
- Communication: popup uses `chrome.tabs.sendMessage` to ask the content script to start exporting; content script listens with `chrome.runtime.onMessage` and replies with `{ok,data}` payload. Popup also uses `chrome.scripting.executeScript` to run `scrapeChannelInfo()` inside the Discord page for metadata.

> Data flow: user selects dates ➜ popup sends `START_EXPORT` message ➜ content script auto‑scrolls, collects messages, returns array ➜ popup converts to CSV and triggers download.

## Key patterns & conventions

- Code wrapped in an IIFE to avoid globals. Shared public APIs are attached to `window.DiscordExporterPopup` / `window.DiscordExporterContent` with an `init()` method.
- Configuration values (`stepPx`, `waitMs`, `maxLoops`, `noProgressLimit`) live at the top of `content-utils.js` in a `CFG` object – tweak there when Discord scrolling behavior changes.
- DOM selectors have multiple fallbacks; expect them to break when Discord updates. See comments in utils. Keep selectors simple and query only when necessary.
- Message deduplication uses `Map` with a `uniqueKey(m)` combining ISO timestamp, author and text.
- `parseDayRange()` treats input dates as full days (`T00:00:00` to `T23:59:59`).
- Theme toggling in popup uses `data-theme` on `<html>` and persists choice to `localStorage` under `discordExporterTheme`.
- Channel scraping logic is defined inline inside `popup-utils.js` so it can be serialized and executed via `chrome.scripting.executeScript` (no external file).
- Errors in background tabs are surfaced via `chrome.runtime.lastError` checks in response handlers; the user‑facing messages are Russian with occasional English comments (see README).

## Developer workflows

1. **Load/unload extension**: open `chrome://extensions` (or `edge://extensions`), enable Developer Mode, click *Load unpacked* and point at the repository root. Use the reload button after code changes.
2. **Debugging**:
   - Content script executes in the Discord page – open DevTools on that page to inspect `window.DiscordExporterContent` or watch console logs added for troubleshooting.
   - Popup logic runs in the popup frame; use its DevTools (right‑click the popup and choose "Inspect").
3. **Editing exported CSV**: modify `toCsv()` in `popup-utils.js` if column order/headers need adjusting.
4. There is **no automated test suite**; manual testing is the norm.

## External dependencies / integrations

- Relies only on standard **Chrome extension APIs** (`tabs`, `scripting`, `runtime`), no npm packages or bundlers.
- Must be run on a Discord channel page (`https://discord.com/channels/*` – other subdomains included). Host permissions are set accordingly in the manifest.

## Troubleshooting notes (copied from README)

- "Receiving end does not exist" → refresh Discord page and retry.
- Changes to selectors require updates to `content-utils.js` and/or `popup-utils.js`.
- CSV download may be blocked by browser settings – ensure file downloads are allowed.

---

Feel free to ask for clarification or point out missing details if you need additional guidance.