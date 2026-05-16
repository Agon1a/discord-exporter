/**
 * Firefox background script (stub for future Firefox support).
 * 
 * Note: This file is for future Firefox compatibility.
 * Currently, the extension is Chrome/Edge only (Manifest v3).
 * 
 * When Firefox support is added, this will handle:
 * - Background message routing
 * - Extension lifecycle management
 * - Storage synchronization
 */

(() => {
  /**
   * Listen for messages from content scripts and popup.
   */
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[Background] Received message:', request.action);

      // Route to appropriate handler
      if (request.action === 'START_EXPORT') {
        // Forward to content script or handle export
        return true; // Keep channel open for async response
      }

      if (request.action === 'EXPORT_PROGRESS') {
        // Forward progress to popup
        return true;
      }

      sendResponse({ ok: false, error: 'Unknown action' });
      return false;
    });
  }

  console.log('[Background] Firefox background script loaded (stub)');
})();
