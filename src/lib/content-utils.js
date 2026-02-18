(() => {
  const CFG = {
    stepPx: 2200,
    waitMs: 1400,
    maxLoops: 1200,
    noProgressLimit: 12
  };
  const shared = window.DiscordExporterShared || {};
  const parseDayRange = shared.parseDayRange;
  const uniqueKey = shared.uniqueKey;

  /**
   * @typedef {Object} DiscordMessage
   * @property {Date} time
   * @property {string} author
   * @property {string} text
   */

  /**
   * Waits for a given number of milliseconds.
   * @param {number} ms - Delay in milliseconds.
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  /**
   * Finds the Discord messages list.
   * @returns {HTMLOListElement | null}
   */
  function findMessagesList() {
    return document.querySelector('ol[data-list-id="chat-messages"]');
  }

  /**
   * Finds the nearest scrollable ancestor of the given element.
   * @param {HTMLElement} el - Element inside the scroll container.
   * @returns {HTMLElement | null}
   */
  function findScrollableAncestor(el) {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      try {
        const st = getComputedStyle(cur);
        const overflowY = st.overflowY;
        const canScroll =
          (overflowY === "auto" || overflowY === "scroll") &&
          cur.scrollHeight > cur.clientHeight + 50;
        if (canScroll) return cur;
      } catch {
        // ignore
      }
      cur = cur.parentElement;
    }
    return null;
  }

  /**
   * Extracts message info from a list item.
   * @param {HTMLLIElement} li - List item element.
   * @returns {DiscordMessage | null}
   */
  function extractFromLi(li) {
    const timeEl = li.querySelector("time[datetime]");
    if (!timeEl) return null;

    const dt = timeEl.getAttribute("datetime");
    const time = new Date(dt);
    if (Number.isNaN(time.getTime())) return null;

    const authorEl =
      li.querySelector('h3 span[class*="username"]') ||
      li.querySelector('span[class*="username"]') ||
      li.querySelector("h3");

    const author = (authorEl?.textContent || "").trim();

    const textEl =
      li.querySelector('[id^="message-content-"]') ||
      li.querySelector('div[class*="messageContent"]') ||
      li.querySelector('div[class*="markup"]');

    const text = (textEl?.textContent || "").trim();
    if (!text) return null;

    return { time, author, text };
  }

  /**
   * Returns messages that are currently visible in the list.
   * @param {HTMLOListElement} listEl - Message list element.
   * @returns {DiscordMessage[]}
   */
  function getVisibleMessages(listEl) {
    const out = [];
    for (const li of listEl.querySelectorAll("li")) {
      const m = extractFromLi(li);
      if (m) out.push(m);
    }
    return out;
  }

  /**
   * Gets the earliest visible message timestamp.
   * @param {HTMLOListElement} listEl - Message list element.
   * @returns {Date | null}
   */
  function getEarliestVisibleTime(listEl) {
    const times = listEl.querySelectorAll("time[datetime]");
    let min = null;
    for (const t of times) {
      const d = new Date(t.getAttribute("datetime"));
      if (!Number.isNaN(d.getTime())) {
        if (!min || d < min) min = d;
      }
    }
    return min;
  }


  /**
   * Dispatches a wheel event to scroll up.
   * @param {HTMLElement} scrollerEl - Scroll container.
   * @returns {void}
   */
  function dispatchWheelUp(scrollerEl) {
    try {
      scrollerEl.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -1200, bubbles: true, cancelable: true })
      );
    } catch {
      // ignore
    }
  }

  /**
   * Scrolls up one step in the given scroller element.
   * @async
   * @param {HTMLElement} scrollerEl - The scroller element to scroll up.
   * @returns {Promise<void>}
   */
  async function scrollUpOneStep(scrollerEl) {
    const prev = scrollerEl.scrollTop;
    const next = Math.max(0, prev - CFG.stepPx);
    scrollerEl.scrollTop = next;
    dispatchWheelUp(scrollerEl);
    if (prev === 0) dispatchWheelUp(scrollerEl);
  }

  /**
   * Waits until the earliest visible message changes.
   * @async
   * @param {HTMLOListElement} listEl - Message list element.
   * @param {Date | null} prevEarliest - Previous earliest timestamp.
   * @returns {Promise<boolean>}
   */
  async function waitUntilEarliestChanges(listEl, prevEarliest) {
    const start = Date.now();
    while (Date.now() - start < CFG.waitMs) {
      const nowEarliest = getEarliestVisibleTime(listEl);
      if (nowEarliest && prevEarliest && nowEarliest < prevEarliest) return true;
      if (nowEarliest && !prevEarliest) return true;
      await sleep(120);
    }
    return false;
  }

  /**
   * Waits for the Discord message list to appear.
   * @async
   * @param {number} [timeoutMs=10000] - Timeout in milliseconds.
   * @returns {Promise<HTMLOListElement | null>}
   */
  async function waitForListReady(timeoutMs = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const list = findMessagesList();
      if (list) return list;
      await sleep(200);
    }
    return null;
  }

  /**
   * Exports messages for the given date range.
   * @async
   * @param {string} fromDay - Start date (YYYY-MM-DD).
   * @param {string} toDay - End date (YYYY-MM-DD).
   * @returns {Promise<{ time: string, author: string, text: string }[]>}
   */
  async function exportChat(fromDay, toDay) {
    const { from, to } = parseDayRange(fromDay, toDay);

    const listEl = await waitForListReady();
    if (!listEl) {
      throw new Error("Не найден список сообщений: ol[data-list-id='chat-messages'].");
    }

    const scrollerEl = findScrollableAncestor(listEl);
    if (!scrollerEl) {
      throw new Error("Не найден скроллер сообщений (scrollable ancestor).");
    }

    const map = new Map();

    let noProgress = 0;
    let loops = 0;

    while (loops++ < CFG.maxLoops) {
      const visible = getVisibleMessages(listEl);
      for (const m of visible) {
        if (m.time >= from && m.time <= to) {
          map.set(uniqueKey(m), m);
        }
      }

      const earliest = getEarliestVisibleTime(listEl);

      if (earliest && earliest <= from) break;

      await scrollUpOneStep(scrollerEl);
      const progressed = await waitUntilEarliestChanges(listEl, earliest);

      if (!progressed) {
        noProgress++;
        if (scrollerEl.scrollTop === 0 && noProgress >= 3) break;
        if (noProgress >= CFG.noProgressLimit) break;
      } else {
        noProgress = 0;
      }
    }

    return Array.from(map.values())
      .sort((a, b) => a.time - b.time)
      .map((m) => ({
        time: m.time.toISOString(),
        author: m.author,
        text: m.text
      }));
  }

  /**
   * Handles runtime messages from the popup.
   * @param {{ action?: string, from?: string, to?: string }} msg - Request payload.
   * @param {chrome.runtime.MessageSender} _sender - Message sender (unused).
   * @param {(response: { ok: boolean, data?: { time: string, author: string, text: string }[], error?: string }) => void} sendResponse - Response callback.
   * @returns {boolean | void}
   */
  function handleRuntimeMessage(msg, _sender, sendResponse) {
    if (msg?.action !== "START_EXPORT") return;

    (async () => {
      try {
        const data = await exportChat(msg.from, msg.to);
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();

    return true;
  }

  /**
   * Initializes the content script and message listener.
   * @returns {void}
   */
  function initContentExporter() {
    if (window.__discordExporterInstalled) return;
    window.__discordExporterInstalled = true;
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  }

  window.DiscordExporterContent = {
    init: initContentExporter
  };
})();
