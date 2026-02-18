# Discord Exporter

Browser extension (Chrome/Edge, Manifest v3) that exports Discord Web messages to CSV for a chosen date range.

## Features
- Export messages in a selected date range to CSV.
- Auto-scrolls upward to load channel history.
- Shows the currently opened channel (server + channel) in the popup UI.
- Light/dark theme toggle with saved preference.
- Works on `discord.com`, `ptb.discord.com`, and `canary.discord.com`.

## Installation (Load unpacked)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `discord-exporter` folder.

## Usage
1. Open Discord Web and go to a channel (URL like `https://discord.com/channels/...`).
2. Open the extension and set the **From** and **To** dates.
3. Click **Export**. A file named `discord_export_YYYY-MM-DD_to_YYYY-MM-DD.csv` will be downloaded.

## Project Structure
- `public/popup.html` — popup UI.
- `public/styles.css` — popup styles.
- `public/icons/` — extension icons.
- `src/lib/popup-utils.js` — popup logic (theme, CSV, messaging, channel metadata).
- `src/lib/content-utils.js` — scrolling and message collection logic.
- `src/popup.js` — bootstraps `window.DiscordExporterPopup.init()`.
- `src/content.js` — bootstraps `window.DiscordExporterContent.init()`.
- `manifest.json` — extension manifest.

## Export Tuning
You can tweak behavior in `src/lib/content-utils.js`:
- `stepPx` — scroll step (px).
- `waitMs` — wait time after each step.
- `maxLoops` — maximum iterations.
- `noProgressLimit` — retry limit when no progress is detected.

## Limitations and Notes
- Export depends on Discord DOM structure. If Discord changes it, selectors may break.
- Long history takes time because scrolling happens in steps.
- Channel display relies on available selectors and may occasionally fail to resolve.

## Troubleshooting
- **“Receiving end does not exist”**: refresh Discord (F5) and try again.
- **No messages found**: verify date range and wait for the channel to load.
- **CSV doesn’t download**: make sure the browser isn’t blocking downloads.

## License
MIT