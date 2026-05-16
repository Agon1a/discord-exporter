/**
 * Exports chat messages to CSV format.
 * Refactored from the original toCsv() function in shared-utils.js.
 */

(() => {
  /**
   * Escapes CSV special characters.
   * @param {string|Date} value - Value to escape.
   * @returns {string}
   */
  function escapeCsv(value) {
    const str = value instanceof Date ? value.toISOString() : String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Converts message rows to CSV format.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {Object} metadata - Export metadata.
   * @returns {string} CSV string.
   */
  function toCsv(messages, metadata = {}) {
    const header = ['Дата', 'Автор', 'Текст'];
    const lines = [header.map(escapeCsv).join(',')];

    messages.forEach(msg => {
      const timestamp = msg.timestamp || msg.time || '';
      const author = msg.author || 'Unknown';
      const content = msg.text || msg.content || '';
      lines.push([timestamp, author, content].map(escapeCsv).join(','));
    });

    return lines.join('\n');
  }

  /**
   * Downloads CSV data as a file.
   * @param {string} csvContent - CSV string content.
   * @param {string} [filename] - Output filename (default: auto-generated).
   * @returns {void}
   */
  function downloadCsv(csvContent, filename) {
    const link = document.createElement('a');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = filename || `export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates filename for CSV export.
   * @param {string} channelName - Channel name.
   * @param {string} [dateFrom] - Start date (YYYY-MM-DD).
   * @param {string} [dateTo] - End date (YYYY-MM-DD).
   * @returns {string}
   */
  function generateFilename(channelName, dateFrom, dateTo) {
    const sanitized = (channelName || 'export')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);

    const datePart = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : '';
    const timestamp = new Date().toISOString().split('T')[0];

    return `discord_${sanitized}${datePart}_${timestamp}.csv`;
  }

  /**
   * Parses CSV export back to messages array (basic).
   * @param {string} csvString - CSV content.
   * @returns {Array<Object>}
   */
  function parseCsv(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];

    const messages = [];
    const parseValue = (val) => val.replace(/^"|"$/g, '').replace(/""/g, '"');

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;

      // Simple CSV parsing (handles quoted fields)
      const fields = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < row.length; j++) {
        const char = row[j];

        if (char === '"') {
          if (inQuotes && row[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          fields.push(parseValue(current));
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(parseValue(current));

      if (fields.length >= 3) {
        messages.push({
          timestamp: fields[0],
          author: fields[1],
          content: fields[2]
        });
      }
    }

    return messages;
  }

  const api = {
    toCsv,
    downloadCsv,
    generateFilename,
    parseCsv,
    escapeCsv
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterCsvExporter = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
