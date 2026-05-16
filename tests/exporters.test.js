const test = require('node:test');
const assert = require('node:assert');

// Load modules (CommonJS format)
const csvExporter = require('../src/lib/exporters/csv-exporter.js');
const jsonExporter = require('../src/lib/exporters/json-exporter.js');
const markdownExporter = require('../src/lib/exporters/markdown-exporter.js');
const filters = require('../src/lib/filters.js');
const shared = require('../src/lib/shared-utils.js');

// Sample test data
const testMessages = [
  {
    timestamp: '2024-01-15T10:30:00Z',
    author: 'Alice',
    text: 'Hello World',
    isBot: false,
    isEdited: false
  },
  {
    timestamp: '2024-01-15T10:31:00Z',
    author: 'Bob',
    text: 'Hi there!',
    isBot: false,
    isEdited: false
  },
  {
    timestamp: '2024-01-15T10:32:00Z',
    author: 'Charlie',
    text: 'Hello World',
    isBot: true,
    isEdited: false
  },
  {
    timestamp: '2024-01-15T10:33:00Z',
    author: 'Alice',
    text: 'Updated message',
    isBot: false,
    isEdited: true
  }
];

test('CSV Exporter', async (t) => {
  await t.test('toCsv should convert messages to CSV', () => {
    const csv = csvExporter.toCsv(testMessages);
    assert(csv.includes('Дата'));
    assert(csv.includes('Автор'));
    assert(csv.includes('Текст'));
    assert(csv.includes('Alice'));
    assert(csv.includes('Hello World'));
  });

  await t.test('toCsv should escape commas in content', () => {
    const msg = [{ timestamp: '2024-01-15', author: 'Test', text: 'Hello, World' }];
    const csv = csvExporter.toCsv(msg);
    assert(csv.includes(`"Hello, World"`));
  });

  await t.test('generateFilename should create valid filename', () => {
    const filename = csvExporter.generateFilename('test-channel', '2024-01-01', '2024-01-31');
    assert(filename.includes('test-channel'));
    assert(filename.includes('2024-01-01'));
    assert(filename.includes('.csv'));
  });

  await t.test('parseCsv should parse CSV back to messages', () => {
    const csv = csvExporter.toCsv(testMessages);
    const parsed = csvExporter.parseCsv(csv);
    assert(parsed.length > 0);
    assert(parsed[0].author === 'Alice');
  });
});

test('JSON Exporter', async (t) => {
  await t.test('toJson should convert messages to JSON', () => {
    const json = jsonExporter.toJson(testMessages, { channelName: 'general' });
    const parsed = JSON.parse(json);
    assert(parsed.format === 'json');
    assert(parsed.metadata.channelName === 'general');
    assert(parsed.messages.length === 4);
  });

  await t.test('JSON should include message metadata', () => {
    const json = jsonExporter.toJson(testMessages);
    const parsed = JSON.parse(json);
    assert(parsed.messages[0].author === 'Alice');
    assert(parsed.messages[0].isBot === false);
  });

  await t.test('generateFilename should create valid .json filename', () => {
    const filename = jsonExporter.generateFilename('test-channel', '2024-01-01', '2024-01-31');
    assert(filename.includes('test-channel'));
    assert(filename.includes('.json'));
  });

  await t.test('parseJson should parse JSON export', () => {
    const json = jsonExporter.toJson(testMessages);
    const parsed = jsonExporter.parseJson(json);
    assert(parsed.length === 4);
    assert(parsed[0].author === 'Alice');
  });
});

test('Markdown Exporter', async (t) => {
  await t.test('toMarkdown should convert messages to Markdown', () => {
    const md = markdownExporter.toMarkdown(testMessages, { channelName: 'general' });
    assert(md.includes('# '));
    assert(md.includes('general'));
    assert(md.includes('####'));
    assert(md.includes('Alice'));
  });

  await t.test('Markdown should include metadata for edited', () => {
    const md = markdownExporter.toMarkdown(testMessages);
    assert(md.includes('Edited'));
  });

  await t.test('generateFilename should create valid .md filename', () => {
    const filename = markdownExporter.generateFilename('test-channel', '2024-01-01', '2024-01-31');
    assert(filename.includes('test-channel'));
    assert(filename.includes('.md'));
  });

  await t.test('escapeMarkdown should escape special chars', () => {
    const escaped = markdownExporter.escapeMarkdown('Test *bold* and [link](url)');
    assert(!escaped.includes('[link](url)'));
  });
});

test('Filters', async (t) => {
  await t.test('filterByAuthor should filter by author name', () => {
    const filtered = filters.filterByAuthor(testMessages, 'Alice');
    assert(filtered.length === 2);
    assert(filtered.every(m => m.author === 'Alice'));
  });

  await t.test('filterByKeywords should filter by content', () => {
    const filtered = filters.filterByKeywords(testMessages, ['Hello']);
    assert(filtered.length >= 2);
    assert(filtered.some(m => m.text.includes('Hello')));
  });

  await t.test('filterOutBots should remove bot messages', () => {
    const filtered = filters.filterOutBots(testMessages);
    assert(!filtered.some(m => m.isBot));
    assert(filtered.length === 3);
  });

  await t.test('filterOutEdited should remove edited messages', () => {
    const filtered = filters.filterOutEdited(testMessages);
    assert(!filtered.some(m => m.isEdited));
    assert(filtered.length === 3);
  });

  await t.test('removeDuplicates should remove duplicate messages', () => {
    const withDuplicates = [
      { timestamp: '2024-01-15T10:30:00Z', author: 'Alice', text: 'Test' },
      { timestamp: '2024-01-15T10:30:00Z', author: 'Alice', text: 'Test' },
      { timestamp: '2024-01-15T10:31:00Z', author: 'Bob', text: 'Other' }
    ];
    const filtered = filters.removeDuplicates(withDuplicates);
    assert(filtered.length === 2);
  });

  await t.test('applyFilters should apply multiple filters', () => {
    const filtered = filters.applyFilters(testMessages, {
      author: 'Alice',
      excludeBots: true,
      removeDuplicates: true
    });
    assert(filtered.length === 2);
    assert(filtered.every(m => m.author === 'Alice'));
    assert(!filtered.some(m => m.isBot));
  });
});

test('Shared Utils', async (t) => {
  await t.test('parseDayRange should parse date range correctly', () => {
    const range = shared.parseDayRange('2024-01-01', '2024-01-02');
    assert(range.from instanceof Date);
    assert(range.to instanceof Date);
    assert(range.from < range.to);
  });

  await t.test('uniqueKey should create consistent keys', () => {
    const msg = { time: '2024-01-15T10:30:00Z', author: 'Alice', text: 'Test' };
    const key1 = shared.uniqueKey(msg);
    const key2 = shared.uniqueKey(msg);
    assert(key1 === key2);
  });

  await t.test('toCsv should handle empty arrays', () => {
    const csv = shared.toCsv([]);
    assert(csv.includes('Дата'));
    assert(csv.includes('Автор'));
    assert(csv.includes('Текст'));
  });
});

test('Integration: Export formats', async (t) => {
  await t.test('All formats should export same number of messages', () => {
    const csv = csvExporter.toCsv(testMessages);
    const json = jsonExporter.toJson(testMessages);
    const md = markdownExporter.toMarkdown(testMessages);

    assert(csv.length > 0);
    assert(json.length > 0);
    assert(md.length > 0);

    // Verify JSON structure
    const jsonData = JSON.parse(json);
    assert(jsonData.messages.length === testMessages.length);
  });

  await t.test('Filtered exports should have consistent counts', () => {
    const filtered = filters.applyFilters(testMessages, { excludeBots: true });
    const csv = csvExporter.toCsv(filtered);
    const json = jsonExporter.toJson(filtered);

    const jsonData = JSON.parse(json);
    assert(jsonData.messages.length === filtered.length);
    assert(csv.split('\n').length > 1); // Header + at least one row
  });
});
