/**
 * M3U Playlist Parser
 * Parses standard #EXTM3U playlists
 */
const Parser = {
  async fetchAndParse(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      return this.parse(text);
    } catch (error) {
      console.error('Error fetching M3U:', error);
      throw error;
    }
  },

  parse(content) {
    const lines = content.split('\n');
    const playlist = [];
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        // Parse metadata
        // Example: #EXTINF:-1 tvg-id="CNN.us" tvg-name="CNN" tvg-logo="http://..." group-title="News",CNN US
        
        const info = line.substring(8);
        const commaIndex = info.lastIndexOf(',');
        
        // Get title (everything after the last comma)
        const rawName = commaIndex !== -1 ? info.substring(commaIndex + 1).trim() : 'Unknown Channel';
        
        // Extract tags from name (e.g. [HD], (RU))
        const tags = [];
        const tagRegex = /[\(\[]([^)\]]+)[\)\]]/g;
        let matchTags;
        while ((matchTags = tagRegex.exec(rawName)) !== null) {
          tags.push(matchTags[1].trim());
        }
        
        // Clean name by removing tags
        let cleanName = rawName.replace(/[\(\[][^)\]]+[\)\]]/g, '').trim();
        // Remove trailing hyphens or pipes if any left
        cleanName = cleanName.replace(/[-\|]+$/, '').trim();
        
        // Parse attributes
        const attributes = info.substring(0, commaIndex !== -1 ? commaIndex : info.length);
        
        const logoMatch = attributes.match(/tvg-logo="([^"]*)"/);
        const groupMatch = attributes.match(/group-title="([^"]*)"/);
        const idMatch = attributes.match(/tvg-id="([^"]*)"/);
        const countryMatch = attributes.match(/tvg-country="([^"]*)"/);
        const languageMatch = attributes.match(/tvg-language="([^"]*)"/);

        // Country and Language can be multi-value (semicolon-separated)
        const rawCountry = countryMatch ? countryMatch[1] : '';
        const rawLanguage = languageMatch ? languageMatch[1] : '';
        const countries = rawCountry ? rawCountry.split(/[;,]/).map(c => c.trim()).filter(Boolean) : [];
        const languages = rawLanguage ? rawLanguage.split(/[;,]/).map(l => l.trim()).filter(Boolean) : [];

        currentItem = {
          name: cleanName || rawName,
          tags: tags,
          logo: logoMatch && logoMatch[1] !== 'undefined' ? logoMatch[1] : null,
          group: groupMatch && groupMatch[1] && groupMatch[1] !== 'undefined' ? groupMatch[1] : 'Boshqalar',
          id: idMatch ? idMatch[1] : null,
          countries: countries,
          languages: languages,
        };
      } else if (!line.startsWith('#')) {
        // It's a URL
        if (currentItem.name) {
          currentItem.url = line;
          playlist.push(currentItem);
          currentItem = {};
        }
      }
    }

    return playlist;
  }
};
