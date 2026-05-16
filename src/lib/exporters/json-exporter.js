/**
 * Exports chat messages to JSON format.
 * Provides structured data with metadata, timestamps, and message details.
 */

(() => {
  /**
   * Converts messages array to JSON format.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {Object} metadata - Export metadata (channel name, server, date range).
   * @returns {string} JSON string.
   */
  function toJson(messages, metadata = {}) {
    const data = {
      exportDate: new Date().toISOString(),
      format: 'json',
      metadata: {
        channelName: metadata.channelName || 'Unknown',
        serverName: metadata.serverName || 'Unknown',
        channelId: metadata.channelId || '',
        serverId: metadata.serverId || '',
        dateRange: {
          from: metadata.dateFrom || null,
          to: metadata.dateTo || null
        },
        messageCount: messages.length,
        exportedBy: 'Discord Exporter (github.com/dimon90/discord-exporter)'
      },
      messages: messages.map(msg => ({
        timestamp: msg.timestamp || '',
        author: msg.author || 'Unknown',
        authorId: msg.authorId || '',
        content: msg.text || msg.content || '',
        isBot: msg.isBot === true,
        isEdited: msg.isEdited === true,
        editedAt: msg.editedAt || null,
        attachments: msg.attachments || [],
        embeds: msg.embeds || [],
        reactions: msg.reactions || [],
        replyTo: msg.replyTo || null
      }))
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Downloads JSON data as a file.
   * @param {string} jsonContent - JSON string content.
   * @param {string} [filename] - Output filename (default: auto-generated).
   * @returns {void}
   */
  function downloadJson(jsonContent, filename) {
    const link = document.createElement('a');
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = filename || `export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates filename based on channel and date range.
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

    return `discord_${sanitized}${datePart}_${timestamp}.json`;
  }

  /**
   * Parses JSON export into messages array.
   * @param {string} jsonString - JSON export content.
   * @returns {Array<Object>}
   */
  function parseJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return Array.isArray(data.messages) ? data.messages : [];
    } catch (error) {
      console.error('Failed to parse JSON export:', error);
      return [];
    }
  }

  const api = {
    toJson,
    downloadJson,
    generateFilename,
    parseJson
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterJsonExporter = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
