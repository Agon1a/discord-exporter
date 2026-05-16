/**
 * Centralized error handling and logging.
 * Provides consistent error messages and logging for debugging.
 */

(() => {
  const ErrorHandler = {
    // Error codes for different failure modes
    CODES: {
      NO_MESSAGE_LIST: 'NO_MESSAGE_LIST',
      NO_SCROLLER: 'NO_SCROLLER',
      NO_TAB: 'NO_TAB',
      INVALID_URL: 'INVALID_URL',
      NO_CHANNEL: 'NO_CHANNEL',
      TOKEN_MISSING: 'TOKEN_MISSING',
      API_ERROR: 'API_ERROR',
      PARSE_ERROR: 'PARSE_ERROR',
      INJECTION_FAILED: 'INJECTION_FAILED',
      RECEIVING_END_FAILED: 'RECEIVING_END_FAILED',
      NO_CHANNEL_DATA: 'NO_CHANNEL_DATA'
    },

    // User-facing messages (Russian)
    MESSAGES: {
      NO_MESSAGE_LIST: 'Не найден список сообщений. Попробуйте обновить страницу (F5).',
      NO_SCROLLER: 'Не найден скроллер сообщений. Структура Discord могла измениться.',
      NO_TAB: 'Не удалось определить активную вкладку браузера.',
      INVALID_URL: 'Откройте Discord Web на странице канала (URL содержит /channels/).',
      NO_CHANNEL: 'Не удалось определить информацию о канале.',
      TOKEN_MISSING: 'Нет доступа к сессии Discord.',
      API_ERROR: 'Ошибка запроса к API Discord.',
      PARSE_ERROR: 'Ошибка при обработке данных.',
      INJECTION_FAILED: 'Не удалось внедрить расширение. Попробуйте обновить страницу.',
      RECEIVING_END_FAILED: 'Приёмник сообщений не существует. Расширение не загружено.',
      NO_CHANNEL_DATA: 'Сообщения не найдены в выбранном диапазоне дат.'
    }
  };

  /**
   * Logs an error with context.
   * @param {string} code - Error code.
   * @param {string} [context] - Additional context.
   * @param {Error} [error] - Original error object.
   * @returns {void}
   */
  function logError(code, context, error) {
    const timestamp = new Date().toISOString();
    const message = ErrorHandler.MESSAGES[code] || `Unknown error: ${code}`;

    let logMessage = `[${timestamp}] ${code}: ${message}`;
    if (context) logMessage += ` | Context: ${context}`;
    if (error) logMessage += ` | Details: ${error.message}`;

    // Log to console for debugging
    console.error(logMessage);

    // Could be extended to send errors to a logging service
  }

  /**
   * Gets user-friendly error message.
   * @param {string} code - Error code.
   * @returns {string}
   */
  function getUserMessage(code) {
    return ErrorHandler.MESSAGES[code] || `Произошла ошибка: ${code}`;
  }

  /**
   * Wraps a function with error handling.
   * @param {Function} fn - Function to wrap.
   * @param {string} errorCode - Error code if function throws.
   * @returns {Function}
   */
  function wrapTry(fn, errorCode) {
    return function wrapped(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        logError(errorCode, `Function: ${fn.name}`, error);
        throw error;
      }
    };
  }

  /**
   * Wraps an async function with error handling.
   * @async
   * @param {Function} fn - Async function to wrap.
   * @param {string} errorCode - Error code if function throws.
   * @returns {Function}
   */
  function wrapAsync(fn, errorCode) {
    return async function wrapped(...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        logError(errorCode, `Function: ${fn.name}`, error);
        throw error;
      }
    };
  }

  /**
   * Handles Chrome API errors.
   * @param {Error} error - Error from Chrome API.
   * @param {string} context - What were you doing.
   * @returns {string} User-friendly message.
   */
  function handleChromeError(error, context) {
    if (!error) return '';

    const message = error.message || String(error);
    logError('API_ERROR', context, error);

    if (message.includes('Receiving end does not exist')) {
      return ErrorHandler.MESSAGES.RECEIVING_END_FAILED;
    }
    if (message.includes('No tab with id')) {
      return ErrorHandler.MESSAGES.NO_TAB;
    }

    return `${ErrorHandler.MESSAGES.API_ERROR} ${message}`;
  }

  /**
   * Validates DOM element existence.
   * @param {HTMLElement | null} element - Element to check.
   * @param {string} errorCode - Error code if element is null.
   * @returns {boolean}
   */
  function validateElement(element, errorCode) {
    if (!element) {
      logError(errorCode, 'Element not found');
      return false;
    }
    return true;
  }

  const api = {
    ...ErrorHandler,
    logError,
    getUserMessage,
    wrapTry,
    wrapAsync,
    handleChromeError,
    validateElement
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterErrorHandler = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
