/**
 * Message filtering utilities for discord-exporter.
 * Provides filtering by author, keywords, and other criteria.
 */

(() => {
  /**
   * Filters messages by author.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {string} authorPattern - Author name or regex pattern.
   * @param {boolean} [useRegex=false] - Use regex matching.
   * @returns {Array<Object>} Filtered messages.
   */
  function filterByAuthor(messages, authorPattern, useRegex = false) {
    if (!authorPattern) return messages;

    return messages.filter(msg => {
      const author = msg.author || '';
      if (useRegex) {
        try {
          const regex = new RegExp(authorPattern, 'i');
          return regex.test(author);
        } catch {
          return false;
        }
      }
      return author.toLowerCase().includes(authorPattern.toLowerCase());
    });
  }

  /**
   * Filters messages by keywords in content.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {string[]} keywords - Keywords to search for.
   * @param {boolean} [matchAll=false] - Require all keywords (AND) or any (OR).
   * @param {boolean} [useRegex=false] - Use regex matching.
   * @returns {Array<Object>} Filtered messages.
   */
  function filterByKeywords(messages, keywords, matchAll = false, useRegex = false) {
    if (!keywords || keywords.length === 0) return messages;

    return messages.filter(msg => {
      const content = (msg.text || msg.content || '').toLowerCase();

      if (useRegex) {
        if (matchAll) {
          return keywords.every(kw => {
            try {
              const regex = new RegExp(kw, 'i');
              return regex.test(content);
            } catch {
              return false;
            }
          });
        } else {
          return keywords.some(kw => {
            try {
              const regex = new RegExp(kw, 'i');
              return regex.test(content);
            } catch {
              return false;
            }
          });
        }
      }

      const searchTerms = keywords.map(kw => kw.toLowerCase());
      if (matchAll) {
        return searchTerms.every(term => content.includes(term));
      } else {
        return searchTerms.some(term => content.includes(term));
      }
    });
  }

  /**
   * Filters messages by minimum length.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {number} minLength - Minimum message length in characters.
   * @returns {Array<Object>} Filtered messages.
   */
  function filterByMinLength(messages, minLength) {
    if (!minLength || minLength <= 0) return messages;
    return messages.filter(msg => {
      const content = msg.text || msg.content || '';
      return content.length >= minLength;
    });
  }

  /**
   * Filters out bot messages.
   * @param {Array<Object>} messages - Array of message objects.
   * @returns {Array<Object>} Filtered messages.
   */
  function filterOutBots(messages) {
    return messages.filter(msg => !msg.isBot);
  }

  /**
   * Filters out edited messages.
   * @param {Array<Object>} messages - Array of message objects.
   * @returns {Array<Object>} Filtered messages.
   */
  function filterOutEdited(messages) {
    return messages.filter(msg => !msg.isEdited);
  }

  /**
   * Removes duplicate messages by content hash.
   * @param {Array<Object>} messages - Array of message objects.
   * @returns {Array<Object>} Messages with duplicates removed.
   */
  function removeDuplicates(messages) {
    const seen = new Set();
    return messages.filter(msg => {
      const key = `${msg.timestamp || msg.time}|${msg.author}|${msg.text || msg.content}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Applies multiple filters to messages.
   * @param {Array<Object>} messages - Array of message objects.
   * @param {Object} filterConfig - Filter configuration.
   * @property {string} [filterConfig.author] - Filter by author.
   * @property {string[]} [filterConfig.keywords] - Filter by keywords.
   * @property {boolean} [filterConfig.keywordsMatchAll=false] - AND/OR logic for keywords.
   * @property {number} [filterConfig.minLength=0] - Minimum message length.
   * @property {boolean} [filterConfig.excludeBots=false] - Exclude bot messages.
   * @property {boolean} [filterConfig.excludeEdited=false] - Exclude edited messages.
   * @property {boolean} [filterConfig.removeDuplicates=true] - Remove duplicates.
   * @returns {Array<Object>} Filtered messages.
   */
  function applyFilters(messages, filterConfig = {}) {
    let result = [...messages];

    if (filterConfig.author) {
      result = filterByAuthor(result, filterConfig.author, filterConfig.useRegex);
    }

    if (filterConfig.keywords && filterConfig.keywords.length > 0) {
      result = filterByKeywords(
        result,
        filterConfig.keywords,
        filterConfig.keywordsMatchAll,
        filterConfig.useRegex
      );
    }

    if (filterConfig.minLength && filterConfig.minLength > 0) {
      result = filterByMinLength(result, filterConfig.minLength);
    }

    if (filterConfig.excludeBots) {
      result = filterOutBots(result);
    }

    if (filterConfig.excludeEdited) {
      result = filterOutEdited(result);
    }

    if (filterConfig.removeDuplicates !== false) {
      result = removeDuplicates(result);
    }

    return result;
  }

  const api = {
    filterByAuthor,
    filterByKeywords,
    filterByMinLength,
    filterOutBots,
    filterOutEdited,
    removeDuplicates,
    applyFilters
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterFilters = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
