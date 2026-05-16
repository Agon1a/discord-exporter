/**
 * Centralized Discord DOM selectors.
 * Discord frequently changes its DOM structure, so keeping selectors in one place helps with maintenance.
 * When Discord updates, modify these selectors and everything else works.
 */

(() => {
  const Selectors = {
    /**
     * Messages list container.
     * This is the main ordered list that displays all messages in a channel.
     * Updated: 2026-03-26
     */
    messagesList: 'ol[data-list-id="chat-messages"]',

    /**
     * Individual message item (list item).
     * Each message in the list is wrapped in an <li> element.
     */
    messageItem: 'li',

    /**
     * Message timestamp.
     * Located in the message item, used to extract when the message was sent.
     * Fallbacks for different Discord versions.
     */
    messageTime: [
      'time[datetime]',
      '[data-timestamp]',
      'span[aria-label*="Today at"]',
      'span[aria-label*="Yesterday"]'
    ],

    /**
     * Message author/username.
     * Multiple selectors due to frequent DOM changes.
     */
    messageAuthor: [
      'h3 span[class*="username"]',
      'span[class*="username"]',
      'h3',
      '[data-testid="message_username"]'
    ],

    /**
     * Message content/text.
     * The actual text content of the message.
     */
    messageContent: [
      '[id^="message-content-"]',
      'div[class*="messageContent"]',
      'div[class*="markup"]',
      '[data-testid="message_content"]'
    ],

    /**
     * Channel title in the header.
     * Used to extract channel name for display.
     */
    channelTitle: [
      '[data-testid="channel-title"]',
      'h1[aria-label]',
      'header h1',
      'h1'
    ],

    /**
     * Server/Guild selector button.
     * Used to find current selected server in sidebar.
     */
    serverButton: [
      'a[aria-current="page"]',
      '[aria-selected="true"]',
      'button[aria-current="page"]'
    ],

    /**
     * Server avatar image.
     * Displayed in the sidebar for the current server.
     */
    serverAvatar: [
      'img',
      'svg image',
      '[data-testid="guild_icon"]'
    ]
  };

  /**
   * Finds an element using multiple selector fallbacks.
   * Returns the first element that matches any selector.
   * @param {HTMLElement} container - Container element to search within.
   * @param {string | string[]} selectors - CSS selector or array of selectors.
   * @returns {HTMLElement | null}
   */
  function querySelector(container, selectors) {
    if (!container) return null;

    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      try {
        const element = container.querySelector(selector);
        if (element) return element;
      } catch {
        // Invalid selector, continue to next
      }
    }

    return null;
  }

  /**
   * Finds all elements using multiple selector fallbacks.
   * Returns elements from the first selector that matches anything.
   * @param {HTMLElement} container - Container element to search within.
   * @param {string | string[]} selectors - CSS selector or array of selectors.
   * @returns {HTMLElement[]}
   */
  function querySelectorAll(container, selectors) {
    if (!container) return [];

    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      try {
        const elements = container.querySelectorAll(selector);
        if (elements.length > 0) return Array.from(elements);
      } catch {
        // Invalid selector, continue to next
      }
    }

    return [];
  }

  const api = {
    Selectors,
    querySelector,
    querySelectorAll
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterSelectors = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
