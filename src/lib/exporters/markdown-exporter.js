/**
 * Exports chat messages to Markdown format.
 * Creates human-readable markdown files with formatted messages.
 */

(() => {
  /**
   * Escapes markdown special characters.
   * @param {string} text - Text to escape.
   * @returns {string}
   */
  function escapeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
      .replace(/\n/g, '\n\n'); // Preserve line breaks
  }

  /**
   * Formats a single message as markdown.
   * @param {Object} msg - Message object.
   * @returns {string}
   */
  function formatMessage(msg) {
    const timestamp = msg.timestamp || 'Unknown time';
    const author = msg.author || 'Unknown User';
    const content = escapeMarkdown(msg.text || msg.content || '');
    
    let markdown = `#### ${author} — ${timestamp}\n`;
    markdown += `${content}\n\n`;

    // Add metadata if available
    if (msg.isEdited) {
      markdown += `> *Edited*\n\n`;
    }

    if (msg.attachments && msg.attachments.length > 0) {
      markdown += `**Attachments:**\n`;
      msg.attachments.forEach(att => {
        markdown += `- [${att.name || 'File'}](${att.url || '#'})\n`;
      });
      markdown += '\n';
    }

    if (msg.reactions && msg.reactions.length > 0) {
      markdown += `**Reactions:** ${msg.reactions.join(' ')}\n\n`;
    }

    return markdown;
  }

  /**
   * Converts messages array to Markdown format.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {Object} metadata - Export metadata.
   * @returns {string} Markdown string.
   */
  function toMarkdown(messages, metadata = {}) {
    let markdown = '';

    // Header
    const channel = metadata.channelName || 'Unknown Channel';
    const server = metadata.serverName || 'Unknown Server';
    markdown += `# ${escapeMarkdown(server)} — ${escapeMarkdown(channel)}\n\n`;

    // Metadata
    markdown += `> **Exported:** ${new Date().toLocaleString()}\n`;
    if (metadata.dateFrom || metadata.dateTo) {
      const from = metadata.dateFrom || 'Beginning';
      const to = metadata.dateTo || 'Present';
      markdown += `> **Date Range:** ${from} to ${to}\n`;
    }
    markdown += `> **Messages:** ${messages.length}\n\n`;

    // Divider
    markdown += '---\n\n';

    // Messages
    if (messages.length === 0) {
      markdown += '*No messages found in this date range.*\n';
    } else {
      messages.forEach(msg => {
        markdown += formatMessage(msg);
      });
    }

    // Footer
    markdown += '\n---\n';
    markdown += `*Exported with [Discord Exporter](https://github.com/dimon90/discord-exporter)*\n`;

    return markdown;
  }

  /**
   * Downloads Markdown data as a file.
   * @param {string} markdownContent - Markdown string content.
   * @param {string} [filename] - Output filename.
   * @returns {void}
   */
  function downloadMarkdown(markdownContent, filename) {
    const link = document.createElement('a');
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = filename || `export_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates filename for markdown export.
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

    return `discord_${sanitized}${datePart}_${timestamp}.md`;
  }

  /**
   * Parses markdown export back to structured messages (basic).
   * Note: Full reverse parsing is complex; this extracts basic message structure.
   * @param {string} markdownString - Markdown content.
   * @returns {Array<Object>}
   */
  function parseMarkdown(markdownString) {
    const messages = [];
    const lines = markdownString.split('\n');
    let currentMessage = null;

    lines.forEach(line => {
      if (line.startsWith('#### ')) {
        if (currentMessage && currentMessage.content.trim()) {
          messages.push(currentMessage);
        }
        const match = line.match(/#### (.+) — (.+)/);
        if (match) {
          currentMessage = {
            author: match[1].trim(),
            timestamp: match[2].trim(),
            content: ''
          };
        }
      } else if (currentMessage) {
        currentMessage.content += line + '\n';
      }
    });

    if (currentMessage && currentMessage.content.trim()) {
      messages.push(currentMessage);
    }

    return messages;
  }

  const api = {
    toMarkdown,
    downloadMarkdown,
    generateFilename,
    parseMarkdown,
    escapeMarkdown,
    formatMessage
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterMarkdownExporter = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
