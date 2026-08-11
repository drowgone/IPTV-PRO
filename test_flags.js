const test = require('node:test');
const assert = require('node:assert');

// Mock a minimal browser environment just in case any global is expected
global.window = {};
global.document = {
  querySelector: () => null,
  querySelectorAll: () => []
};

const App = require('./app.js');

test('Country Flag Emoji and Isolation Tests', async (t) => {
  await t.test('should return correct flag emojis for mapped country names', () => {
    const getFlag = App.prototype.getFlagEmoji;

    // Test exact mapping
    assert.strictEqual(getFlag('Uzbekistan'), '🇺🇿');
    assert.strictEqual(getFlag('UZ'), '🇺🇿');
    assert.strictEqual(getFlag('United States'), '🇺🇸');
    assert.strictEqual(getFlag('USA'), '🇺🇸');
    assert.strictEqual(getFlag('US'), '🇺🇸');
    assert.strictEqual(getFlag('United Kingdom'), '🇬🇧');
    assert.strictEqual(getFlag('UK'), '🇬🇧');
    assert.strictEqual(getFlag('Turkey'), '🇹🇷');
    assert.strictEqual(getFlag('Russia'), '🇷🇺');
  });

  await t.test('should handle two letter codes directly', () => {
    const getFlag = App.prototype.getFlagEmoji;
    assert.strictEqual(getFlag('FR'), '🇫🇷');
    assert.strictEqual(getFlag('it'), '🇮🇹');
    assert.strictEqual(getFlag('BR'), '🇧🇷');
  });

  await t.test('should return globe emoji fallback for unknown countries', () => {
    const getFlag = App.prototype.getFlagEmoji;
    assert.strictEqual(getFlag('UnknownLand'), '🌎');
    assert.strictEqual(getFlag(''), '🌎');
    assert.strictEqual(getFlag(null), '🌎');
  });
});
