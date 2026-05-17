# Discord Exporter

[![Tests](https://github.com/Agon1a/discord-exporter/actions/workflows/tests.yml/badge.svg)](https://github.com/Agon1a/discord-exporter/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Discord Exporter is a Chrome and Edge browser extension based on Manifest V3. It exports Discord Web messages for a selected date range to CSV, JSON, or Markdown.

Message processing runs locally in the active browser tab. Message data is not sent to project servers.

## Features

- Message export for a selected date range.
- Output formats: CSV, JSON, Markdown.
- Default mode with upward channel-history scrolling.
- Fast mode through the current Discord Web session when the API is available.
- Automatic fallback to default mode when fast mode is unavailable.
- Filtering by author and keywords.
- AND/OR keyword matching.
- Bot-message exclusion.
- Duplicate removal by date, author, and text.
- Current server and channel detection.
- Export progress indicator.
- Light and dark theme with preference stored in `localStorage`.
- Quick date presets: today, 7 days, 30 days, year.
- Supported domains: `discord.com`, `ptb.discord.com`, `canary.discord.com`.

## Installation

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Select **Load unpacked**.
4. Select the `discord-exporter` repository folder.
5. Open Discord Web after the extension is loaded.

## Usage

1. Open Discord Web and navigate to a channel.
2. Open the extension popup.
3. Set the **From** and **To** dates.
4. Select an export format: CSV, JSON, or Markdown.
5. Configure **Advanced filters** when filtering is required.
6. Leave fast mode disabled for scroll-based export.
7. Enable fast mode for API-based export.
8. Select **Export**.
9. A file with exported messages is downloaded after completion.

## Export Modes

| Mode | Behavior | Limits |
|---|---|---|
| Default | The page scrolls upward and messages are collected from the DOM | Speed depends on history size, network conditions, and browser performance |
| Fast | Messages are requested through the current Discord Web session | May be unavailable; direct messages are not supported |

When fast mode is unavailable, the extension switches to default export.

## Formats

| Format | Purpose |
|---|---|
| CSV | Spreadsheet processing in Excel, Google Sheets, and similar tools |
| JSON | Structured data with export metadata |
| Markdown | Readable text archive of messages |

### CSV

```csv
"Дата","Автор","Текст"
"2024-01-15T10:30:45.000Z","Alice","Hello!"
"2024-01-15T10:31:12.000Z","Bob","Hi there!"
```

### JSON

```json
{
  "exportDate": "2024-01-15T10:30:45.000Z",
  "format": "json",
  "metadata": {
    "channelName": "general",
    "serverName": "My Server",
    "messageCount": 2,
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    }
  },
  "messages": [
    {
      "timestamp": "2024-01-15T10:30:45Z",
      "author": "Alice",
      "content": "Hello!"
    }
  ]
}
```

### Markdown

```markdown
# My Server - general

> **Exported:** Jan 15, 2024
> **Date Range:** 2024-01-01 to 2024-01-31
> **Messages:** 2

#### Alice - 2024-01-15T10:30:45.000Z
Hello!
```

## Filters

Filters are available in the **Advanced filters** popup section.

| Filter | Description |
|---|---|
| Author | Author-name search; plain text or regular expression |
| Keywords | Comma-separated phrases searched in message text |
| Keyword AND | All specified keywords are required |
| Keyword OR | Any specified keyword is enough |
| Exclude bot messages | Bot messages are removed from the result |
| Remove duplicates | Repeated messages are removed by date + author + text |

## Privacy

- Processing runs in the browser.
- Message history is not sent to project servers.
- Fast mode uses the active Discord Web session in the current tab.
- The extension runs only on Discord domains listed in `manifest.json`.

## Limitations

- Export depends on the Discord Web DOM structure.
- Selector updates may be required after Discord markup changes.
- Long history exports are slower because scrolling is performed in steps.
- Fast mode is not available in all channels and does not support DMs.
- Firefox is not listed in `manifest.json` as a target platform.

## Troubleshooting

| Problem | Resolution |
|---|---|
| `Receiving end does not exist` | Refresh the Discord page and retry the export |
| No messages found | Check the date range and wait until the channel is fully loaded |
| CSV is not downloaded | Check browser download settings |
| Progress does not change | Wait for several scroll iterations; refresh the page if the export is stuck |
| Fast mode does not work | Use default mode |

## Project Structure

- `manifest.json` - extension configuration, permissions, content scripts, popup.
- `public/popup.html` - popup markup.
- `public/styles.css` - popup styles.
- `public/icons/` - extension icons.
- `src/popup.js` - popup bootstrap.
- `src/content.js` - content script bootstrap.
- `src/background.js` - extension background handlers.
- `src/lib/popup-utils.js` - popup logic, fast mode, file download.
- `src/lib/content-utils.js` - scrolling, message collection, progress.
- `src/lib/shared-utils.js` - shared utilities for dates, CSV, and unique keys.
- `src/lib/selectors.js` - centralized Discord DOM selectors.
- `src/lib/error-handler.js` - error handling and normalization.
- `src/lib/filters.js` - message filtering.
- `src/lib/i18n.js` - interface localization.
- `src/lib/performance.js` - performance helper functions.
- `src/lib/templates.js` - export templates.
- `src/lib/batch.js` - batch export model.
- `src/lib/history.js` - export history model.
- `src/lib/exporters/` - CSV, JSON, and Markdown exporters.
- `tests/` - unit and e2e tests.
- `scripts/release.js` - release preparation script.

## Localization

Russian and English contain the primary interface translations. German, French, and Spanish contain a basic string set. `ja` and `zh` are present in the supported language list; without dedicated translation tables, fallback strings are used.

## Development

Install dependencies:

```bash
npm install
```

Run unit tests:

```bash
npm run test:all
```

Check code style:

```bash
npm run lint:check
```

## Release

Release scripts are defined in `package.json`.

```bash
npm run release 1.2.0
npm run release:auto 1.2.0
npm run release:github 1.2.0
```

## License

MIT. See [LICENSE](LICENSE).
