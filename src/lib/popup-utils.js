(() => {
  const THEME_KEY = "discordExporterTheme";
  const rootEl = document.documentElement;

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
      channelName: "Проверяю активную вкладку...",
      channelPrefix: "#"
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isDiscordChannelsUrl(tab.url)) {
      setChannelCard({
        guildName: "Открытый канал",
        channelName: "Открой Discord Web и нужный канал",
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
          "Сделай так:\n" +
          "1) Открой канал Discord в браузере\n" +
          "2) Нажми F5 (обновить)\n" +
          "3) Открой расширение и попробуй снова\n\n" +
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
   * Handles the export button click.
   * @async
   * @returns {Promise<void>}
   */
  async function onExportClick() {
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!fromDate || !toDate) {
      setStatus("Укажи обе даты.");
      return;
    }
    if (fromDate > toDate) {
      setStatus("Дата 'С' не может быть позже даты 'По'.");
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("Не удалось определить активную вкладку.");
      return;
    }
    if (!isDiscordChannelsUrl(tab.url)) {
      setStatus(
        "Открой Discord Web именно на странице канала:\nhttps://discord.com/channels/..."
      );
      return;
    }

    setStatus("Внедряю скрипт на страницу...");

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/content.js"]
      });
    } catch (e) {
      setStatus(
        "Не удалось внедрить скрипт.\n" +
        "Попробуй обновить вкладку Discord (F5) и повторить.\n\n" +
        String(e)
      );
      return;
    }

    setStatus("Запускаю экспорт (автопрокрутка вверх)...");

    chrome.tabs.sendMessage(
      tab.id,
      { action: "START_EXPORT", from: fromDate, to: toDate },
      createExportResponseHandler(fromDate, toDate)
    );
  }

  /**
   * Initializes the popup UI and listeners.
   * @returns {void}
   */
  function initPopup() {
    cacheElements();
    applyTheme(getPreferredTheme(THEME_KEY));

    if (themeToggle) {
      themeToggle.addEventListener("change", onThemeToggleChange);
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