(() => {
  const DISCORD_EPOCH = 1420070400000n;

  /**
   * @typedef {Object} CsvRow
   * @property {string | Date} time
   * @property {string} author
   * @property {string} text
   */

  /**
   * Converts date-only input into a full-day time range.
   * @param {string} fromDay - Start date (YYYY-MM-DD).
   * @param {string} toDay - End date (YYYY-MM-DD).
   * @returns {{ from: Date, to: Date }}
   */
  function parseDayRange(fromDay, toDay) {
    const from = new Date(fromDay + "T00:00:00");
    const to = new Date(toDay + "T23:59:59");
    return { from, to };
  }

  /**
   * Builds a unique key for CSV rows or messages.
   * @param {CsvRow} row - Row or message data.
   * @returns {string}
   */
  function uniqueKey(row) {
    const timeValue = row?.time instanceof Date ? row.time.toISOString() : String(row?.time ?? "");
    return `${timeValue}|${row?.author ?? ""}|${row?.text ?? ""}`;
  }

  /**
   * Converts message rows to CSV.
   * @param {CsvRow[]} rows - Export rows.
   * @returns {string}
   */
  function toCsv(rows) {
    const header = ["Дата", "Автор", "Текст"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(",")];
    for (const r of rows) lines.push([r.time, r.author, r.text].map(esc).join(","));
    return lines.join("\n");
  }

  /**
   * Generates a Discord snowflake from a timestamp.
   * @param {number} timestampMs - Timestamp in milliseconds.
   * @returns {string}
   */
  function snowflakeFromTimestamp(timestampMs) {
    const safeMs = Number.isFinite(timestampMs) ? timestampMs : Date.now();
    const clamped = Math.max(safeMs, Number(DISCORD_EPOCH));
    return ((BigInt(clamped) - DISCORD_EPOCH) << 22n).toString();
  }

  const api = {
    parseDayRange,
    uniqueKey,
    toCsv,
    snowflakeFromTimestamp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  if (typeof window !== "undefined") {
    window.DiscordExporterShared = api;
  }
})();