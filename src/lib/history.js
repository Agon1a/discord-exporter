/**
 * Export History tracking system.
 * 
 * Maintains a searchable history of all exports with:
 * - Timestamps and metadata
 * - File information (name, size, format)
 * - Search and filtering capabilities
 * - Statistics and analytics
 */

(() => {
  /**
   * @typedef {Object} HistoryEntry
   * @property {string} id - Unique entry ID
   * @property {Date} timestamp - When export occurred
   * @property {string} channelId - Discord channel ID
   * @property {string} channelName - Channel name
   * @property {string} serverId - Discord server/guild ID
   * @property {string} serverName - Server name
   * @property {string} fileName - Downloaded file name
   * @property {number} messageCount - Number of messages exported
   * @property {string} format - Export format (csv, json, markdown)
   * @property {number} size - File size in bytes
   * @property {Object} filters - Applied filters
   * @property {Object} dateRange - {from: Date, to: Date}
   * @property {string} template - Template used
   * @property {number} duration - Export duration in milliseconds
   * @property {boolean} success - Whether export succeeded
   * @property {string} error - Error message if failed
   */

  const HISTORY_KEY = 'discordExporterHistory';
  const MAX_HISTORY_ENTRIES = 500; // Limit to prevent storage overflow
  const DEFAULT_PAGE_SIZE = 50;

  /**
   * Creates a new history entry.
   * @param {Object} data - Entry data
   * @returns {Object} Created entry
   */
  function createHistoryEntry(data) {
    const entry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      channelId: data.channelId || '',
      channelName: data.channelName || '',
      serverId: data.serverId || '',
      serverName: data.serverName || '',
      fileName: data.fileName || '',
      messageCount: data.messageCount || 0,
      format: data.format || 'csv',
      size: data.size || 0,
      filters: data.filters || {},
      dateRange: {
        from: data.dateRange?.from || null,
        to: data.dateRange?.to || null
      },
      template: data.template || 'standard',
      duration: data.duration || 0,
      success: data.success !== false,
      error: data.error || null
    };

    addHistoryEntry(entry);
    return entry;
  }

  /**
   * Adds entry to history storage.
   * @param {Object} entry - Entry to add
   * @returns {void}
   */
  function addHistoryEntry(entry) {
    const stored = localStorage.getItem(HISTORY_KEY);
    let history = stored ? JSON.parse(stored) : [];

    // Add new entry to beginning (most recent first)
    history.unshift(entry);

    // Trim to max entries
    if (history.length > MAX_HISTORY_ENTRIES) {
      history = history.slice(0, MAX_HISTORY_ENTRIES);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  /**
   * Gets all history entries.
   * @param {Object} options - {page: int, pageSize: int, sortBy: string}
   * @returns {Object} {entries: Array, total: int, page: int, pageSize: int}
   */
  function getHistory(options = {}) {
    const stored = localStorage.getItem(HISTORY_KEY);
    let entries = stored ? JSON.parse(stored) : [];

    const page = options.page || 1;
    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const sortBy = options.sortBy || 'timestamp'; // 'timestamp', 'messageCount', 'size'

    // Sort
    if (sortBy === 'messageCount') {
      entries.sort((a, b) => b.messageCount - a.messageCount);
    } else if (sortBy === 'size') {
      entries.sort((a, b) => b.size - a.size);
    } else {
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedEntries = entries.slice(start, end);

    return {
      entries: paginatedEntries,
      total: entries.length,
      page,
      pageSize
    };
  }

  /**
   * Searches history by query.
   * @param {string} query - Search query (channel name, server name, file name)
   * @param {Object} options - {page, pageSize}
   * @returns {Object} Search results
   */
  function searchHistory(query, options = {}) {
    const stored = localStorage.getItem(HISTORY_KEY);
    let entries = stored ? JSON.parse(stored) : [];

    const q = query.toLowerCase();
    const filtered = entries.filter(entry => 
      entry.channelName.toLowerCase().includes(q) ||
      entry.serverName.toLowerCase().includes(q) ||
      entry.fileName.toLowerCase().includes(q) ||
      entry.id.includes(q)
    );

    const page = options.page || 1;
    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      entries: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      query
    };
  }

  /**
   * Gets history entries for a specific channel.
   * @param {string} channelId - Channel ID
   * @param {Object} options - {page, pageSize}
   * @returns {Object} Channel history
   */
  function getChannelHistory(channelId, options = {}) {
    const stored = localStorage.getItem(HISTORY_KEY);
    let entries = stored ? JSON.parse(stored) : [];

    const filtered = entries.filter(e => e.channelId === channelId);
    const page = options.page || 1;
    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      entries: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      channelId
    };
  }

  /**
   * Gets history entries for a date range.
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {Object} options - {page, pageSize}
   * @returns {Object} Results
   */
  function getHistoryByDateRange(fromDate, toDate, options = {}) {
    const stored = localStorage.getItem(HISTORY_KEY);
    let entries = stored ? JSON.parse(stored) : [];

    const from = new Date(fromDate).getTime();
    const to = new Date(toDate).getTime();

    const filtered = entries.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time >= from && time <= to;
    });

    const page = options.page || 1;
    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      entries: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize
    };
  }

  /**
   * Deletes a history entry.
   * @param {string} entryId - Entry ID
   * @returns {boolean} Success
   */
  function deleteHistoryEntry(entryId) {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return false;

    let entries = JSON.parse(stored);
    const filtered = entries.filter(e => e.id !== entryId);

    if (filtered.length === entries.length) return false;

    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * Clears all history.
   * @returns {boolean} Success
   */
  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  }

  /**
   * Gets history statistics.
   * @returns {Object} {totalExports, successCount, failureCount, totalMessages, totalSize, averageSize}
   */
  function getHistoryStats() {
    const stored = localStorage.getItem(HISTORY_KEY);
    const entries = stored ? JSON.parse(stored) : [];

    const stats = {
      totalExports: entries.length,
      successCount: 0,
      failureCount: 0,
      totalMessages: 0,
      totalSize: 0,
      averageSize: 0,
      averageDuration: 0,
      formatDistribution: {},
      topChannels: []
    };

    let totalDuration = 0;

    entries.forEach(e => {
      if (e.success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }

      stats.totalMessages += e.messageCount || 0;
      stats.totalSize += e.size || 0;
      totalDuration += e.duration || 0;
      stats.formatDistribution[e.format] = (stats.formatDistribution[e.format] || 0) + 1;
    });

    // Calculate averages
    if (stats.successCount > 0) {
      stats.averageSize = Math.round(stats.totalSize / stats.successCount);
      stats.averageDuration = Math.round(totalDuration / stats.successCount);
    }

    // Top channels
    const channelMap = {};
    entries.forEach(e => {
      const key = `${e.channelId}|${e.channelName}|${e.serverName}`;
      if (!channelMap[key]) {
        channelMap[key] = { count: 0, messages: 0, size: 0 };
      }
      channelMap[key].count++;
      channelMap[key].messages += e.messageCount || 0;
      channelMap[key].size += e.size || 0;
    });

    stats.topChannels = Object.entries(channelMap)
      .map(([key, data]) => {
        const [channelId, channelName, serverName] = key.split('|');
        return { channelId, channelName, serverName, ...data };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Exports history to CSV.
   * @returns {string} CSV content
   */
  function exportHistoryToCSV() {
    const stored = localStorage.getItem(HISTORY_KEY);
    const entries = stored ? JSON.parse(stored) : [];

    let csv = 'ID,Timestamp,Channel,Server,Format,Messages,Size (KB),Duration (s),Success\n';

    entries.forEach(e => {
      const row = [
        e.id,
        e.timestamp,
        `"${e.channelName}"`,
        `"${e.serverName}"`,
        e.format,
        e.messageCount,
        Math.round(e.size / 1024),
        Math.round(e.duration / 1000),
        e.success ? 'Yes' : 'No'
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Downloads history as CSV file.
   * @returns {void}
   */
  function downloadHistoryCSV() {
    const csv = exportHistoryToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const api = {
    createHistoryEntry,
    getHistory,
    searchHistory,
    getChannelHistory,
    getHistoryByDateRange,
    deleteHistoryEntry,
    clearHistory,
    getHistoryStats,
    exportHistoryToCSV,
    downloadHistoryCSV,
    MAX_HISTORY_ENTRIES,
    DEFAULT_PAGE_SIZE
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterHistory = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
