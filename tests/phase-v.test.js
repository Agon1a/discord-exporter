const test = require('node:test');
const assert = require('node:assert');

// Mock localStorage for Node environment
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

// Load modules (requires the code to be loadable in Node)
const loadModule = (code) => {
  const module = { exports: {} };
  const func = new Function('module', 'exports', 'window', code);
  func(module, module.exports, global);
  return module.exports;
};

// Templates tests
test('Templates: Create custom template', () => {
  localStorage.clear();
  const templatesCode = require('fs').readFileSync('./src/lib/templates.js', 'utf8');
  const templates = loadModule(templatesCode);

  const template = {
    name: 'My Custom CSV',
    format: 'csv',
    separator: ',',
    header: '{author},{date},{content}',
    description: 'Custom template'
  };

  const created = templates.createTemplate('custom_csv', template);
  assert.strictEqual(created, true, 'Template should be created');

  const retrieved = templates.getTemplate('custom_csv');
  assert.strictEqual(retrieved.name, 'My Custom CSV', 'Retrieved template name should match');
});

test('Templates: List custom templates', () => {
  localStorage.clear();
  const templatesCode = require('fs').readFileSync('./src/lib/templates.js', 'utf8');
  const templates = loadModule(templatesCode);

  templates.createTemplate('custom1', { name: 'Template 1', format: 'csv' });
  templates.createTemplate('custom2', { name: 'Template 2', format: 'json' });

  const customList = templates.getCustomTemplates();
  assert.strictEqual(customList.length, 2, 'Should have 2 custom templates');
});

test('Templates: Interpolate variables', () => {
  const templatesCode = require('fs').readFileSync('./src/lib/templates.js', 'utf8');
  const templates = loadModule(templatesCode);

  const result = templates.interpolate(
    'Hello {name}, today is {date}',
    { name: 'Alice', date: 'Monday' }
  );

  assert.strictEqual(result, 'Hello Alice, today is Monday', 'Variables should be interpolated');
});

test('Templates: Validate template', () => {
  const templatesCode = require('fs').readFileSync('./src/lib/templates.js', 'utf8');
  const templates = loadModule(templatesCode);

  const invalid = { format: 'csv' }; // Missing name
  const validation = templates.validateTemplate(invalid);
  assert.strictEqual(validation.valid, false, 'Invalid template should fail validation');
  assert(validation.errors.length > 0, 'Should have error messages');
});

// Batch tests
test('Batch: Create batch job', () => {
  localStorage.clear();
  const batchCode = require('fs').readFileSync('./src/lib/batch.js', 'utf8');
  const batch = loadModule(batchCode);

  const channels = [
    { channelId: 'ch1', channelName: 'general', serverId: 'srv1', serverName: 'My Server' },
    { channelId: 'ch2', channelName: 'random', serverId: 'srv1', serverName: 'My Server' }
  ];

  const job = batch.createBatchJob(channels, { format: 'csv' });
  assert.strictEqual(job.total, 2, 'Job should have 2 channels');
  assert.strictEqual(job.status, 'pending', 'Initial status should be pending');
});

test('Batch: Update batch progress', () => {
  localStorage.clear();
  const batchCode = require('fs').readFileSync('./src/lib/batch.js', 'utf8');
  const batch = loadModule(batchCode);

  const channels = [
    { channelId: 'ch1', channelName: 'general', serverId: 'srv1', serverName: 'My Server' }
  ];

  const job = batch.createBatchJob(channels);
  const updated = batch.updateBatchProgress(job.id, 1, {
    channelId: 'ch1',
    fileName: 'export_ch1.csv',
    status: 'completed',
    size: 5000
  });

  assert.strictEqual(updated.completed, 1, 'Should have 1 completed');
  assert.strictEqual(updated.progress, 100, 'Progress should be 100%');
  assert.strictEqual(updated.status, 'completed', 'Job should be completed');
});

test('Batch: Cancel batch job', () => {
  localStorage.clear();
  const batchCode = require('fs').readFileSync('./src/lib/batch.js', 'utf8');
  const batch = loadModule(batchCode);

  const job = batch.createBatchJob([]);
  const cancelled = batch.cancelBatchJob(job.id);
  assert.strictEqual(cancelled, true, 'Should cancel successfully');

  const retrieved = batch.getBatchJob(job.id);
  assert.strictEqual(retrieved.status, 'cancelled', 'Status should be cancelled');
});

// History tests
test('History: Create history entry', () => {
  localStorage.clear();
  const historyCode = require('fs').readFileSync('./src/lib/history.js', 'utf8');
  const history = loadModule(historyCode);

  const entry = history.createHistoryEntry({
    channelId: 'ch1',
    channelName: 'general',
    serverId: 'srv1',
    serverName: 'My Server',
    fileName: 'export.csv',
    messageCount: 100,
    format: 'csv',
    size: 5000,
    success: true
  });

  assert.strictEqual(entry.messageCount, 100, 'Entry should have correct message count');
  assert.strictEqual(entry.success, true, 'Entry should be marked as success');
});

test('History: Search history', () => {
  localStorage.clear();
  const historyCode = require('fs').readFileSync('./src/lib/history.js', 'utf8');
  const history = loadModule(historyCode);

  history.createHistoryEntry({
    channelId: 'ch1',
    channelName: 'general',
    serverId: 'srv1',
    serverName: 'My Server',
    messageCount: 100,
    success: true
  });

  history.createHistoryEntry({
    channelId: 'ch2',
    channelName: 'random',
    serverId: 'srv1',
    serverName: 'My Server',
    messageCount: 50,
    success: true
  });

  const results = history.searchHistory('general');
  assert.strictEqual(results.total, 1, 'Should find 1 matching entry');
  assert.strictEqual(results.entries[0].channelName, 'general', 'Should find correct channel');
});

test('History: Get history statistics', () => {
  localStorage.clear();
  const historyCode = require('fs').readFileSync('./src/lib/history.js', 'utf8');
  const history = loadModule(historyCode);

  history.createHistoryEntry({
    channelId: 'ch1',
    channelName: 'general',
    serverId: 'srv1',
    serverName: 'My Server',
    messageCount: 100,
    format: 'csv',
    size: 5000,
    success: true
  });

  history.createHistoryEntry({
    channelId: 'ch1',
    channelName: 'general',
    serverId: 'srv1',
    serverName: 'My Server',
    messageCount: 50,
    format: 'json',
    size: 3000,
    success: true
  });

  const stats = history.getHistoryStats();
  assert.strictEqual(stats.totalExports, 2, 'Should have 2 total exports');
  assert.strictEqual(stats.successCount, 2, 'Should have 2 successful exports');
  assert.strictEqual(stats.totalMessages, 150, 'Should have 150 total messages');
});

test('History: Delete history entry', () => {
  localStorage.clear();
  const historyCode = require('fs').readFileSync('./src/lib/history.js', 'utf8');
  const history = loadModule(historyCode);

  const entry = history.createHistoryEntry({
    channelId: 'ch1',
    channelName: 'general',
    messageCount: 100,
    success: true
  });

  const deleted = history.deleteHistoryEntry(entry.id);
  assert.strictEqual(deleted, true, 'Should delete successfully');

  const result = history.getHistory();
  assert.strictEqual(result.entries.length, 0, 'History should be empty');
});

console.log('✅ Phase V module tests completed successfully!');
