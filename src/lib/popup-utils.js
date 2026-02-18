(() => {
  const THEME_KEY = "discordExporterTheme";
  const API_MODE_KEY = "discordExporterApiMode";
  const API_BATCH_SIZE = 100;
  const API_MAX_PAGES = 400;
  const rootEl = document.documentElement;
  const shared = window.DiscordExporterShared || {};
  const parseDayRange = shared.parseDayRange;
  const toCsv = shared.toCsv;

  /** @type {HTMLElement | null} */
  let statusEl = null;
  /** @type {HTMLInputElement | null} */
  let themeToggle = null;
  /** @type {HTMLElement | null} */
  let channelAvatarEl = null;
  /** @type {HTMLElement | null} */
  let channelGuildEl = null;
  /** @type {HTMLElement | null} */
  let channelNameEl = null;
  /** @type {HTMLElement | null} */
  let channelPrefixEl = null;
  /** @type {HTMLButtonElement | null} */
  let exportBtn = null;
  /** @type {HTMLInputElement | null} */
  let apiModeToggle = null;
  /** @type {HTMLElement | null} */
  let apiBody = null;

  /**
   * @typedef {"light" | "dark"} Theme
   */

  /**
   * @typedef {Object} ChannelInfo
   * @property {string} guildName
   * @property {string} channelName
   * @property {string} [iconUrl]
   * @property {string} [channelPrefix]
   */

  /**
   * @typedef {Object} CsvRow
   * @property {string} time
   * @property {string} author
   * @property {string} text
   */

  /**
   * @typedef {Object} ExportResponse
   * @property {boolean} ok
   * @property {CsvRow[]} [data]
   * @property {string} [error]
   */

  /**
   * @typedef {Object} DiscordChannelUrl
   * @property {string} guildId
   * @property {string} channelId
   * @property {boolean} isDM
   */

  /**
   * @typedef {Object} ApiFetchResult
   * @property {boolean} ok
   * @property {CsvRow[]} [data]
   * @property {string} [error]
   */

  /**
   * Caches DOM elements used by the popup.
   * @returns {void}
   */
  function cacheElements() {
    statusEl = document.getElementById("status");
    themeToggle = document.getElementById("themeToggle");
    channelAvatarEl = document.getElementById("channelAvatar");
    channelGuildEl = document.getElementById("channelGuild");
    channelNameEl = document.getElementById("channelName");
    channelPrefixEl = document.getElementById("channelPrefix");
    exportBtn = document.getElementById("exportBtn");
    apiModeToggle = document.getElementById("apiModeToggle");
    apiBody = document.getElementById("apiBody");
  }

  /**
   * Updates the status line.
   * @param {string} message - Status text.
   * @returns {void}
   */
  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
  }

  /**
   * Applies the selected theme.
   * @param {Theme} theme - Theme name.
   * @returns {void}
   */
  function applyTheme(theme) {
    rootEl.dataset.theme = theme;
    if (themeToggle) {
      themeToggle.checked = theme === "dark";
    }
  }

  /**
   * Reads the preferred theme from storage or the system.
   * @param {string} themeKey - LocalStorage key.
   * @returns {Theme}
   */
  function getPreferredTheme(themeKey) {
    const saved = localStorage.getItem(themeKey);
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  /**
   * Handles the theme toggle change.
   * @returns {void}
   */
  function onThemeToggleChange() {
    if (!themeToggle) return;
    const theme = themeToggle.checked ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }

  /**
   * Reads the saved API mode value.
   * @returns {boolean}
   */
  function getSavedApiMode() {
    const value = localStorage.getItem(API_MODE_KEY);
    if (value === null) return true;
    return value === "true";
  }

  /**
   * Applies API mode UI state.
   * @param {boolean} isEnabled - Whether API mode is enabled.
   * @param {boolean} [persist=false] - Whether to persist the value.
   * @returns {void}
   */
  function applyApiMode(isEnabled, persist = false) {
    if (apiModeToggle) {
      apiModeToggle.checked = isEnabled;
    }
    if (apiBody) {
      apiBody.hidden = !isEnabled;
    }
    if (persist) {
      localStorage.setItem(API_MODE_KEY, isEnabled ? "true" : "false");
    }
  }

  /**
   * Handles the API mode toggle change.
   * @returns {void}
   */
  function onApiModeToggleChange() {
    const enabled = !!apiModeToggle?.checked;
    applyApiMode(enabled, true);
  }

  /**
   * Checks whether the URL points to a Discord channel page.
   * @param {string} url - URL to validate.
   * @returns {boolean}
   */
  function isDiscordChannelsUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      const hostOk = ["discord.com", "ptb.discord.com", "canary.discord.com"].includes(u.host);
      return hostOk && u.pathname.startsWith("/channels/");
    } catch {
      return false;
    }
  }

  /**
   * Parses channel information from a Discord URL.
   * @param {string} url - Discord channel URL.
   * @returns {DiscordChannelUrl | null}
   */
  function parseDiscordChannelUrl(url) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] !== "channels") return null;
      const guildId = parts[1];
      const channelId = parts[3] || parts[2];
      if (!guildId || !channelId) return null;
      return { guildId, channelId, isDM: guildId === "@me" };
    } catch {
      return null;
    }
  }


  /**
   * Updates the channel card in the UI.
   * @param {ChannelInfo} info - Channel metadata.
   * @returns {void}
   */
  function setChannelCard(info) {
    if (!channelGuildEl || !channelNameEl || !channelAvatarEl) return;
    const safeGuild = info.guildName || "Открытый канал";
    const safeChannel = info.channelName || "Не удалось определить канал";
    const safePrefix = info.channelPrefix || "#";

    channelGuildEl.textContent = safeGuild;
    channelNameEl.textContent = safeChannel;
    if (channelPrefixEl) channelPrefixEl.textContent = safePrefix;

    if (info.iconUrl) {
      channelAvatarEl.style.backgroundImage = `url("${info.iconUrl}")`;
      channelAvatarEl.classList.add("has-image");
      channelAvatarEl.textContent = "";
      return;
    }

    channelAvatarEl.style.backgroundImage = "";
    channelAvatarEl.classList.remove("has-image");
    const fallback = safeGuild.trim().charAt(0).toUpperCase() || "D";
    channelAvatarEl.textContent = fallback;
  }

  /**
   * Reads channel information from the active Discord tab.
   * @async
   * @returns {Promise<void>}
   */
  async function refreshChannelInfo() {
    if (!channelGuildEl || !channelNameEl) return;
    setChannelCard({
      guildName: "Открытый канал",
      channelName: "Проверяется активная вкладка...",
      channelPrefix: "#"
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isDiscordChannelsUrl(tab.url)) {
      setChannelCard({
        guildName: "Открытый канал",
        channelName: "Откройте Discord Web и нужный канал",
        channelPrefix: "#"
      });
      return;
    }

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeChannelInfo
      });

      if (!result) {
        setChannelCard({
          guildName: "Открытый канал",
          channelName: "Не удалось определить канал",
          channelPrefix: "#"
        });
        return;
      }

      setChannelCard(result);
    } catch {
      setChannelCard({
        guildName: "Открытый канал",
        channelName: "Не удалось прочитать данные",
        channelPrefix: "#"
      });
    }
  }

  /**
   * Scrapes channel information from the Discord page.
   * @returns {ChannelInfo}
   */
  function scrapeChannelInfo() {
    /**
     * Normalizes whitespace.
     * @param {string} value - Raw text.
     * @returns {string}
     */
    function clean(value) {
      return (value || "").replace(/\s+/g, " ").trim();
    }

    /**
     * Picks the first non-empty text from selectors.
     * @param {string[]} selectors - CSS selectors to search.
     * @returns {string}
     */
    function pickText(selectors) {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        const text = clean(el?.textContent);
        if (text) return text;
      }
      return "";
    }

    const parts = location.pathname.split("/").filter(Boolean);
    const guildId = parts[1];
    const isDM = guildId === "@me";

    let channelName = pickText([
      '[data-testid="channel-title"]',
      'h1[aria-label]',
      'header h1',
      'h1'
    ]);

    if (!channelName) {
      const title = clean(document.title);
      if (title && title.toLowerCase() !== "discord") {
        const titleParts = title.split(" - ").map((p) => p.trim()).filter(Boolean);
        const hashPart = titleParts.find((p) => p.startsWith("#") || p.startsWith("@"));
        channelName = hashPart || titleParts[0] || "";
        if (/discord/i.test(channelName) && titleParts.length > 1) {
          channelName = titleParts[1] || "";
        }
      }
    }

    channelName = clean(channelName);
    let channelPrefix = "#";
    if (channelName.startsWith("@")) channelPrefix = "@";
    if (channelName.startsWith("#")) channelPrefix = "#";
    channelName = channelName.replace(/^[@#]\s*/, "");

    let guildName = "";
    let iconUrl = "";
    const serverNav = document.querySelector('nav[aria-label="Servers"]');
    const selected = serverNav?.querySelector('a[aria-current="page"], [aria-selected="true"]');
    const label = clean(selected?.getAttribute("aria-label"));
    if (label) guildName = label.split(",")[0];

    const img = selected?.querySelector("img");
    if (img?.src) iconUrl = img.src;

    if (!iconUrl) {
      const svgImage = selected?.querySelector("svg image");
      iconUrl =
        svgImage?.getAttribute("href") ||
        svgImage?.getAttribute("xlink:href") ||
        "";
    }

    if (!guildName) {
      guildName = pickText([
        '[data-testid="guild-header"] h1',
        'header[aria-label*="Server"] h1',
        'header h2'
      ]);
    }

    if (isDM) {
      guildName = guildName || "Личные сообщения";
      channelPrefix = "@";
    }

    return {
      guildName,
      channelName,
      iconUrl,
      channelPrefix
    };
  }


  /**
   * Fetches messages through the Discord web session.
   * Runs inside the Discord tab via executeScript.
   * @async
   * @param {string} channelId - Channel id.
   * @param {number} fromMs - Start timestamp (ms).
   * @param {number} toMs - End timestamp (ms).
   * @param {number} batchSize - Page size.
   * @param {number} maxPages - Max number of pages.
   * @returns {Promise<ApiFetchResult>}
   */
  async function fetchMessagesViaApiInPage(channelId, fromMs, toMs, batchSize, maxPages) {
    const DISCORD_EPOCH_LOCAL = 1420070400000n;

    /**
     * Builds a snowflake from timestamp.
     * @param {number} timestamp - Timestamp in milliseconds.
     * @returns {string}
     */
    function snowflakeFromTimestampLocal(timestamp) {
      const safeMs = Number.isFinite(timestamp) ? timestamp : Date.now();
      const clamped = Math.max(safeMs, Number(DISCORD_EPOCH_LOCAL));
      return ((BigInt(clamped) - DISCORD_EPOCH_LOCAL) << 22n).toString();
    }

    /**
     * Waits for a given number of milliseconds.
     * @param {number} ms - Delay in milliseconds.
     * @returns {Promise<void>}
     */
    function sleepLocal(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Performs a fetch request with rate-limit handling.
     * @async
     * @param {string} url - Request URL.
     * @param {string} token - Authorization token.
     * @returns {Promise<any>}
     */
    async function fetchJson(url, token) {
      while (true) {
        const res = await fetch(url, {
          headers: {
            Authorization: token
          }
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          const retryAfter = Number(data?.retry_after || 1);
          const waitMs = Math.max(1000, Math.ceil(retryAfter * 1000));
          await sleepLocal(waitMs);
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          let message = text;
          try {
            const parsed = JSON.parse(text);
            if (parsed?.message) message = parsed.message;
          } catch {
            // ignore
          }
          throw new Error(`API ${res.status}: ${message || res.statusText}`);
        }

        return res.json();
      }
    }

    const rawToken = localStorage.getItem("token") || "";
    const token = rawToken.replace(/^"|"$/g, "");
    if (!token) {
      return { ok: false, error: "TOKEN_MISSING" };
    }

    const from = Number.isFinite(fromMs) ? fromMs : Date.now();
    const to = Number.isFinite(toMs) ? toMs : Date.now();

    const rowsMap = new Map();
    let before = snowflakeFromTimestampLocal(to + 1);
    let pages = 0;
    let done = false;
    const apiBase = `${location.origin}/api/v10`;

    while (!done && pages < maxPages) {
      const url = `${apiBase}/channels/${channelId}/messages?limit=${batchSize}&before=${before}`;
      const batch = await fetchJson(url, token);

      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const msg of batch) {
        const messageTime = Date.parse(msg.timestamp);
        if (Number.isNaN(messageTime)) continue;
        if (messageTime > to) continue;
        if (messageTime < from) {
          done = true;
          break;
        }

        const text = (msg.content || "").trim();
        if (!text) continue;

        const author = msg.author?.global_name || msg.author?.username || "Unknown";
        const row = { time: msg.timestamp, author, text };
        rowsMap.set(`${row.time}|${row.author}|${row.text}`, row);
      }

      pages += 1;
      const last = batch[batch.length - 1];
      before = last?.id || before;
    }

    const rows = Array.from(rowsMap.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    return { ok: true, data: rows };
  }

  /**
   * Exports messages via Discord API using the current session.
   * @async
   * @param {string} fromDate - Start date (YYYY-MM-DD).
   * @param {string} toDate - End date (YYYY-MM-DD).
   * @returns {Promise<boolean>}
   */
  async function exportViaApi(fromDate, toDate) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      setStatus("Быстрый режим: не удалось определить активную вкладку.");
      return false;
    }

    if (!isDiscordChannelsUrl(tab.url)) {
      setStatus("Быстрый режим: откройте Discord Web на странице канала.");
      return false;
    }

    const parsed = parseDiscordChannelUrl(tab.url);
    if (!parsed) {
      setStatus("Быстрый режим: не удалось определить канал из URL.");
      return false;
    }

    if (parsed.isDM) {
      setStatus("Быстрый режим не поддерживает личные сообщения.");
      return false;
    }

    const { from, to } = parseDayRange(fromDate, toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setStatus("Быстрый режим: неверный формат дат.");
      return false;
    }

    setStatus("Быстрый режим: выполняется загрузка сообщений...");

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fetchMessagesViaApiInPage,
        args: [parsed.channelId, from.getTime(), to.getTime(), API_BATCH_SIZE, API_MAX_PAGES]
      });

      if (!result?.ok) {
        if (result?.error === "TOKEN_MISSING") {
          setStatus("Быстрый режим: нет доступа к сессии. Выполняется переключение на обычный экспорт...");
        } else {
          setStatus("Быстрый режим: не удалось получить сообщения. Выполняется переключение...");
        }
        return false;
      }

      const rows = result.data || [];
      if (!rows.length) {
        setStatus("Быстрый режим: сообщения не найдены.");
        return true;
      }

      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discord_export_${fromDate}_to_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(`Готово: сообщений ${rows.length}\nCSV скачан.`);
      return true;
    } catch (e) {
      const message = String(e?.message || e);
      if (message.includes("401") || message.includes("403")) {
        setStatus("Быстрый режим: нет доступа. Выполняется переключение на обычный экспорт...");
      } else {
        setStatus("Быстрый режим: ошибка запроса. Выполняется переключение...");
      }
      return false;
    }
  }

  /**
   * Builds a response handler for export completion.
   * @param {string} fromDate - From date.
   * @param {string} toDate - To date.
   * @returns {(response: ExportResponse | undefined) => void}
   */
  function createExportResponseHandler(fromDate, toDate) {
    return (response) => {
      if (chrome.runtime.lastError) {
        setStatus(
          "Нет ответа от страницы.\n" +
          "Сделайте так:\n" +
          "1) Откройте канал Discord в браузере\n" +
          "2) Нажмите F5 (обновить)\n" +
          "3) Откройте расширение и попробуйте снова\n\n" +
          chrome.runtime.lastError.message
        );
        return;
      }

      if (!response?.ok) {
        setStatus("Ошибка: " + (response?.error || "неизвестно"));
        return;
      }

      const msgs = response.data || [];
      if (!msgs.length) {
        setStatus(
          "Сообщения не найдены.\n" +
          "Возможные причины:\n" +
          "- в выбранные дни нет сообщений\n" +
          "- Discord еще не успел полностью загрузить канал\n" +
          "- селекторы поменялись (редко, но бывает)"
        );
        return;
      }

      const csv = toCsv(msgs);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discord_export_${fromDate}_to_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(`Готово: сообщений ${msgs.length}\nCSV скачан.`);
    };
  }

  /**
   * Exports messages using the existing scroll-based approach.
   * @async
   * @param {string} fromDate - Start date.
   * @param {string} toDate - End date.
   * @returns {Promise<void>}
   */
  async function exportViaScroll(fromDate, toDate) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("Не удалось определить активную вкладку.");
      return;
    }
    if (!isDiscordChannelsUrl(tab.url)) {
      setStatus(
        "Откройте Discord Web именно на странице канала:\nhttps://discord.com/channels/..."
      );
      return;
    }

    setStatus("Выполняется внедрение скрипта на страницу...");

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/content.js"]
      });
    } catch (e) {
      setStatus(
        "Не удалось внедрить скрипт.\n" +
        "Попробуйте обновить вкладку Discord (F5) и повторить.\n\n" +
        String(e)
      );
      return;
    }

    setStatus("Запуск экспорта (автопрокрутка вверх)...");

    chrome.tabs.sendMessage(
      tab.id,
      { action: "START_EXPORT", from: fromDate, to: toDate },
      createExportResponseHandler(fromDate, toDate)
    );
  }

  /**
   * Handles the export button click.
   * @async
   * @returns {Promise<void>}
   */
  async function onExportClick() {
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!fromDate || !toDate) {
      setStatus("Укажите обе даты.");
      return;
    }
    if (fromDate > toDate) {
      setStatus("Дата 'С' не может быть позже даты 'По'.");
      return;
    }

    if (apiModeToggle?.checked) {
      const apiSucceeded = await exportViaApi(fromDate, toDate);
      if (!apiSucceeded) {
        await exportViaScroll(fromDate, toDate);
      }
      return;
    }

    await exportViaScroll(fromDate, toDate);
  }

  /**
   * Initializes the popup UI and listeners.
   * @returns {void}
   */
  function initPopup() {
    cacheElements();
    applyTheme(getPreferredTheme(THEME_KEY));
    applyApiMode(getSavedApiMode());

    if (themeToggle) {
      themeToggle.addEventListener("change", onThemeToggleChange);
    }

    if (apiModeToggle) {
      apiModeToggle.addEventListener("change", onApiModeToggleChange);
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", onExportClick);
    }

    refreshChannelInfo();
  }

  window.DiscordExporterPopup = {
    init: initPopup
  };
})();
