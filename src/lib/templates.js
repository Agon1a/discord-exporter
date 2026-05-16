/**
 * Custom Export Templates system.
 * 
 * Allows users to define custom export templates with variable interpolation.
 * Variables: {author}, {date}, {time}, {content}, {messageCount}, {channelName}
 */

(() => {
  /**
   * Default export templates
   */
  const DEFAULT_TEMPLATES = {
    standard: {
      name: 'Standard CSV',
      format: 'csv',
      description: 'Regular CSV format',
      locked: true
    },
    json_compact: {
      name: 'Compact JSON',
      format: 'json',
      description: 'Minimal JSON structure',
      locked: true
    },
    markdown_doc: {
      name: 'Documentation',
      format: 'markdown',
      description: 'Markdown with metadata',
      locked: true
    },
    custom_tsv: {
      name: 'Tab-Separated',
      format: 'csv',
      separator: '\t',
      header: '{author}\t{date}\t{content}',
      row: '{author}\t{time}\t{content}',
      description: 'Custom TSV format',
      locked: false
    },
    custom_html: {
      name: 'HTML Report',
      format: 'custom',
      mimeType: 'text/html',
      template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{channelName} Chat Export</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    .message { border-left: 3px solid #ccc; padding: 10px; margin: 5px 0; }
    .author { font-weight: bold; color: #0066cc; }
    .time { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Channel: {channelName}</h1>
  <p>Messages: {messageCount}</p>
  <hr>
  <!-- Messages will be inserted here -->
</body>
</html>`,
      description: 'HTML report format',
      locked: false
    }
  };

  const TEMPLATES_KEY = 'discordExporterTemplates';

  /**
   * Gets all available templates (default + custom).
   * @returns {Object} Templates by ID
   */
  function getAllTemplates() {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    const customTemplates = stored ? JSON.parse(stored) : {};
    return { ...DEFAULT_TEMPLATES, ...customTemplates };
  }

  /**
   * Gets a single template by ID.
   * @param {string} templateId - Template identifier
   * @returns {Object | null} Template object or null
   */
  function getTemplate(templateId) {
    const templates = getAllTemplates();
    return templates[templateId] || null;
  }

  /**
   * Creates a new custom template.
   * @param {string} templateId - Unique template ID
   * @param {Object} template - Template definition
   * @returns {boolean} Success
   */
  function createTemplate(templateId, template) {
    if (!templateId || typeof templateId !== 'string') return false;
    if (templateId in DEFAULT_TEMPLATES) return false; // Cannot override defaults
    
    const stored = localStorage.getItem(TEMPLATES_KEY);
    const templates = stored ? JSON.parse(stored) : {};
    
    templates[templateId] = {
      ...template,
      createdAt: new Date().toISOString(),
      locked: false
    };
    
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Updates an existing custom template.
   * @param {string} templateId - Template ID
   * @param {Object} updates - Fields to update
   * @returns {boolean} Success
   */
  function updateTemplate(templateId, updates) {
    const template = getTemplate(templateId);
    if (!template) return false;
    if (template.locked) return false; // Cannot update locked templates
    
    const stored = localStorage.getItem(TEMPLATES_KEY);
    const templates = stored ? JSON.parse(stored) : {};
    
    templates[templateId] = { ...template, ...updates, locked: false };
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Deletes a custom template.
   * @param {string} templateId - Template ID
   * @returns {boolean} Success
   */
  function deleteTemplate(templateId) {
    const template = getTemplate(templateId);
    if (!template) return false;
    if (template.locked) return false; // Cannot delete locked templates
    
    const stored = localStorage.getItem(TEMPLATES_KEY);
    const templates = stored ? JSON.parse(stored) : {};
    
    delete templates[templateId];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Interpolates variables in a template string.
   * @param {string} text - Template text with {variable} placeholders
   * @param {Object} data - Data object with variable values
   * @returns {string} Interpolated text
   */
  function interpolate(text, data = {}) {
    if (typeof text !== 'string') return '';
    let result = text;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
    });
    return result;
  }

  /**
   * Renders a message using template format.
   * @param {Object} message - Message object {author, timestamp, content}
   * @param {Object} template - Template object
   * @returns {string} Rendered message
   */
  function renderMessage(message, template) {
    if (!template) return '';
    
    const data = {
      author: message.author || '',
      date: new Date(message.timestamp).toLocaleDateString(),
      time: new Date(message.timestamp).toLocaleTimeString(),
      content: message.content || ''
    };

    if (template.row) {
      return interpolate(template.row, data);
    }
    
    return `${data.author}: ${data.content}`;
  }

  /**
   * Renders header using template.
   * @param {Object} data - Header variables {channelName, messageCount, dateRange}
   * @param {Object} template - Template object
   * @returns {string} Rendered header
   */
  function renderHeader(data, template) {
    if (!template) return '';
    if (template.header) {
      return interpolate(template.header, data);
    }
    return '';
  }

  /**
   * Gets list of custom templates (non-default).
   * @returns {Array} Array of {id, name, format, description}
   */
  function getCustomTemplates() {
    const templates = getAllTemplates();
    return Object.entries(templates)
      .filter(([id, t]) => !DEFAULT_TEMPLATES[id])
      .map(([id, t]) => ({
        id,
        name: t.name,
        format: t.format,
        description: t.description
      }));
  }

  /**
   * Validates template structure.
   * @param {Object} template - Template to validate
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  function validateTemplate(template) {
    const errors = [];
    
    if (!template.name) errors.push('Template must have a name');
    if (!template.format) errors.push('Template must specify format (csv, json, markdown, custom)');
    
    if (template.format === 'custom' && !template.template) {
      errors.push('Custom format requires template field');
    }
    
    if (template.format === 'csv') {
      if (template.separator && typeof template.separator !== 'string') {
        errors.push('Separator must be a string');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  const api = {
    getAllTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    interpolate,
    renderMessage,
    renderHeader,
    getCustomTemplates,
    validateTemplate,
    DEFAULT_TEMPLATES
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterTemplates = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
