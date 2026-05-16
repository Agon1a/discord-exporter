/**
 * Internationalization (i18n) system for Discord Exporter.
 * 
 * Supports multiple languages with fallback to Russian/English.
 * Add translations by extending the TRANSLATIONS object.
 */

(() => {
  // Supported languages
  const SUPPORTED_LANGS = ['en', 'ru', 'de', 'fr', 'es', 'ja', 'zh'];

  // Translation strings
  const TRANSLATIONS = {
    en: {
      title: 'Discord Chat Exporter',
      description: 'Export Discord chat history by date range',
      exportBtn: 'Export',
      cancelBtn: 'Cancel',
      fromDate: 'From (date)',
      toDate: 'To (date)',
      fastMode: 'FAST',
      fastModeDesc: 'Fast mode without scrolling (uses current session)',
      quickLabel: 'Quick:',
      quickToday: 'Today',
      quick7Days: '7 days',
      quick30Days: '30 days',
      quickYear: 'Year',
      format: 'Format:',
      csv: 'CSV',
      json: 'JSON',
      markdown: 'Markdown',
      filters: '⚙️ Advanced Filters',
      filterAuthor: 'Author (name or pattern)',
      filterKeywords: 'Keywords (comma-separated)',
      filterMatchAll: 'Require all keywords (AND)',
      filterExcludeBots: 'Exclude bot messages',
      filterRemoveDuplicates: 'Remove duplicates',
      resetFilters: 'Reset Filters',
      darkTheme: 'Dark theme',
      channelInfo: 'Open channel',
      statusReady: 'Ready to export',
      statusExporting: 'Exporting...',
      statusDone: 'Done: {count} messages exported',
      statusError: 'Error: {error}',
      noMessages: 'No messages found'
    },
    ru: {
      title: '💬 Discord Exporter',
      description: 'Экспорт чата Discord по диапазону дат',
      exportBtn: 'Экспортировать',
      cancelBtn: 'Отмена',
      fromDate: 'С (дата)',
      toDate: 'По (дата)',
      fastMode: 'FAST',
      fastModeDesc: 'Быстрый режим без прокрутки (использует текущую сессию)',
      quickLabel: 'Быстро:',
      quickToday: 'Сегодня',
      quick7Days: '7 дней',
      quick30Days: '30 дней',
      quickYear: 'Год',
      format: 'Формат:',
      csv: 'CSV',
      json: 'JSON',
      markdown: 'Markdown',
      filters: '⚙️ Расширенные фильтры',
      filterAuthor: 'Автор (имя или pattern)',
      filterKeywords: 'Ключевые слова (через запятую)',
      filterMatchAll: 'Требовать все ключевые слова (AND)',
      filterExcludeBots: 'Исключить сообщения ботов',
      filterRemoveDuplicates: 'Удалить дубликаты',
      resetFilters: 'Сбросить фильтры',
      darkTheme: 'Тёмная тема',
      channelInfo: 'Открытый канал',
      statusReady: 'Готово к экспорту',
      statusExporting: 'Выполняется экспорт...',
      statusDone: 'Готово: {count} сообщений',
      statusError: 'Ошибка: {error}',
      noMessages: 'Сообщения не найдены'
    },
    de: {
      title: 'Discord Chat Exporter',
      description: 'Discord-Chat nach Datumsbereich exportieren',
      exportBtn: 'Exportieren',
      fromDate: 'Von (Datum)',
      toDate: 'Bis (Datum)',
      format: 'Format:',
      statusDone: 'Fertig: {count} Nachrichten exportiert'
    },
    fr: {
      title: 'Exportateur de chat Discord',
      description: 'Exporter l\'historique du chat Discord par plage de dates',
      exportBtn: 'Exporter',
      fromDate: 'De (date)',
      toDate: 'À (date)',
      format: 'Format:',
      statusDone: 'Terminé: {count} messages exportés'
    },
    es: {
      title: 'Exportador de chat de Discord',
      description: 'Exportar el historial de chat de Discord por rango de fechas',
      exportBtn: 'Exportar',
      fromDate: 'De (fecha)',
      toDate: 'A (fecha)',
      format: 'Formato:',
      statusDone: 'Listo: {count} mensajes exportados'
    }
  };

  /**
   * Gets the user's preferred language.
   * @returns {string} Language code (en, ru, etc.)
   */
  function getUserLanguage() {
    // 1. Check localStorage
    const stored = localStorage.getItem('discordExporterLanguage');
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

    // 2. Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;

    // 3. Default
    return 'en';
  }

  /**
   * Translates a key to the current language.
   * @param {string} key - Translation key
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Translated string
   */
  function t(key, params = {}) {
    const lang = getUserLanguage();
    const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
    let text = translations[key] || TRANSLATIONS.en[key] || key;

    // Parameter interpolation
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });

    return text;
  }

  /**
   * Sets the user's language preference.
   * @param {string} lang - Language code
   * @returns {void}
   */
  function setLanguage(lang) {
    if (SUPPORTED_LANGS.includes(lang)) {
      localStorage.setItem('discordExporterLanguage', lang);
      // Optionally reload UI
      if (typeof location !== 'undefined') {
        location.reload();
      }
    }
  }

  /**
   * Gets all supported languages.
   * @returns {Array}
   */
  function getSupportedLanguages() {
    return SUPPORTED_LANGS;
  }

  /**
   * Translates all elements with `data-i18n` attribute.
   * @returns {void}
   */
  function translatePage() {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });

    // Update page language
    document.documentElement.lang = getUserLanguage();
  }

  const api = {
    t,
    setLanguage,
    getUserLanguage,
    getSupportedLanguages,
    translatePage
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterI18n = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
