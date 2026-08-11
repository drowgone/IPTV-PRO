const test = require('node:test');
const assert = require('node:assert');
const Parser = require('./parser.js');

test('M3U Playlist Parser Tests', async (t) => {
  await t.test('should parse simple channels correctly', () => {
    const m3uContent = `
#EXTM3U
#EXTINF:-1 tvg-id="test-id" tvg-name="Test Channel" tvg-logo="http://logo.url" group-title="Entertainment" tvg-country="UZ" tvg-language="Uzbek",Test Channel
http://stream.url/test.m3u8
    `.trim();

    const result = Parser.parse(m3uContent);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Test Channel');
    assert.strictEqual(result[0].id, 'test-id');
    assert.strictEqual(result[0].logo, 'http://logo.url');
    assert.strictEqual(result[0].group, 'Entertainment');
    assert.deepStrictEqual(result[0].countries, ['UZ']);
    assert.deepStrictEqual(result[0].languages, ['Uzbek']);
    assert.strictEqual(result[0].url, 'http://stream.url/test.m3u8');
  });

  await t.test('should support multi-value semicolon separated countries and languages', () => {
    const m3uContent = `
#EXTM3U
#EXTINF:-1 tvg-country="UZ;RU;US" tvg-language="Uzbek;Russian;English",Multi Channel
http://stream.url/multi.m3u8
    `.trim();

    const result = Parser.parse(m3uContent);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].countries, ['UZ', 'RU', 'US']);
    assert.deepStrictEqual(result[0].languages, ['Uzbek', 'Russian', 'English']);
  });

  await t.test('should extract country/category prefixes and clean channel name', () => {
    const m3uContent = `
#EXTM3U
#EXTINF:-1 group-title="News",GERMANY: Tagesschau [HD]
http://stream.url/tagesschau.m3u8
    `.trim();

    const result = Parser.parse(m3uContent);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Tagesschau');
    assert.ok(result[0].countries.includes('GERMANY'));
    assert.ok(result[0].tags.includes('HD'));
    assert.ok(result[0].tags.includes('GERMANY'));
  });

  await t.test('should handle fallback to Boshqalar group if missing', () => {
    const m3uContent = `
#EXTM3U
#EXTINF:-1,No Info Channel
http://stream.url/noinfo.m3u8
    `.trim();

    const result = Parser.parse(m3uContent);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'No Info Channel');
    assert.strictEqual(result[0].group, 'Boshqalar');
  });
});
