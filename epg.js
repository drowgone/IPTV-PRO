/**
 * Premium EPG (Electronic Program Guide) Manager
 * Handles fetching, gzipped XMLTV decompression, and parsing.
 */
const EPG = {
  programmes: {}, // Map of channelId -> list of programmes
  isLoading: false,

  async load(epgUrl) {
    if (!epgUrl) return;
    this.isLoading = true;
    console.log('EPG loading from:', epgUrl);

    try {
      let response = await fetch(epgUrl);
      if (!response.ok) throw new Error('Failed to fetch EPG');

      let xmlText;
      // Handle native Gzip decompression stream if the file is .gz
      if (epgUrl.endsWith('.gz')) {
        try {
          const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
          xmlText = await new Response(decompressedStream).text();
        } catch (decompError) {
          console.warn('DecompressionStream not supported or failed, fetching uncompressed if possible');
          xmlText = await response.text();
        }
      } else {
        xmlText = await response.text();
      }

      this.parse(xmlText);
    } catch (err) {
      console.warn('EPG loading error:', err.message);
    } finally {
      this.isLoading = false;
    }
  },

  parse(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const programmes = xmlDoc.getElementsByTagName('programme');

    this.programmes = {};

    for (let i = 0; i < programmes.length; i++) {
      const prog = programmes[i];
      const channelId = prog.getAttribute('channel');
      if (!channelId) continue;

      const start = this.parseDate(prog.getAttribute('start'));
      const stop = this.parseDate(prog.getAttribute('stop'));

      const titleEl = prog.getElementsByTagName('title')[0];
      const title = titleEl ? titleEl.textContent : 'Nomsiz Ko\'rsatuv';

      const descEl = prog.getElementsByTagName('desc')[0];
      const desc = descEl ? descEl.textContent : '';

      if (!this.programmes[channelId]) {
        this.programmes[channelId] = [];
      }

      this.programmes[channelId].push({
        start,
        stop,
        title,
        desc
      });
    }

    console.log(`Parsed ${programmes.length} programmes for ${Object.keys(this.programmes).length} channels.`);
  },

  parseDate(str) {
    if (!str) return null;
    // Format: YYYYMMDDHHMMSS +HHMM
    const y = parseInt(str.substring(0, 4));
    const m = parseInt(str.substring(4, 6)) - 1;
    const d = parseInt(str.substring(6, 8));
    const h = parseInt(str.substring(8, 10));
    const min = parseInt(str.substring(10, 12));
    const s = parseInt(str.substring(12, 14) || '00');

    // Extract timezone offset if exists (e.g. +0500)
    const tzMatch = str.match(/([+-])(\d{2})(\d{2})/);
    if (tzMatch) {
      const sign = tzMatch[1] === '+' ? -1 : 1;
      const offsetHours = parseInt(tzMatch[2]);
      const offsetMins = parseInt(tzMatch[3]);
      const offsetMs = sign * (offsetHours * 3600000 + offsetMins * 60000);

      const date = new Date(Date.UTC(y, m, d, h, min, s));
      return new Date(date.getTime() + offsetMs);
    }

    return new Date(y, m, d, h, min, s);
  },

  getNowNext(channelId) {
    if (!channelId) return null;
    const progs = this.programmes[channelId];
    if (!progs) return null;

    const now = new Date();
    let current = null;
    let next = null;

    // Sort programmes by start time
    progs.sort((a, b) => a.start - b.start);

    for (let i = 0; i < progs.length; i++) {
      const p = progs[i];
      if (now >= p.start && now <= p.stop) {
        current = p;
        if (i + 1 < progs.length) {
          next = progs[i + 1];
        }
        break;
      }
    }

    return { current, next };
  }
};
