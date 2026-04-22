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
        
        // Clean name by removing tags, countries, and categories
        let cleanName = rawName;
        let extractedPrefixes = [];
        
        // 1. Remove bracketed parts like (RU), [HD]. (tags are already extracted above)
        cleanName = cleanName.replace(/[\(\[][^)\]]+[\)\]]/g, '').trim(); 
        
        // 2. Iteratively extract prefixes
        let loop = true;
        while(loop) {
            let matched = false;
            
            // Extract from pipes (e.g. "TURKEY | Channel")
            const mPipe = cleanName.match(/^([a-zA-Z0-9\s]{2,15})\s*\|\s*/);
            if (mPipe) {
                extractedPrefixes.push(mPipe[1].trim().toUpperCase());
                cleanName = cleanName.substring(mPipe[0].length).trim();
                matched = true;
            }
            
            // Extract from explicit categories/countries with colon or hyphen
            const geoPrefixes = 'UK|US|USA|RU|TR|FR|DE|IT|ES|EN|PT|NL|PL|GR|RO|AR|BE|CH|AT|AU|CA|IN|PK|BD|IR|IL|CZ|SK|HU|BG|RS|HR|SI|MK|AL|VIP|VOD|ARABIC|LATAM|AFRICA|ASIA|SPORT|SPORTS|MOVIES|NEWS|KIDS|MUSIC|XXX|LOCAL|INFO|TURKEY|RUSSIA|GERMANY|FRANCE|SPAIN|ITALY|POLAND|INDIA|PAKISTAN|IRAN';
            const geoRegex = new RegExp(`^(${geoPrefixes})\\s*[:\\-]\\s*`, 'i');
            const mGeo = cleanName.match(geoRegex);
            if (!matched && mGeo) {
                extractedPrefixes.push(mGeo[1].trim().toUpperCase());
                cleanName = cleanName.substring(mGeo[0].length).trim();
                matched = true;
            }

            // Extract strict 2-letter codes with colon or hyphen (e.g. RU: Kanal)
            const mStrict = cleanName.match(/^(?!TV\b)([A-Z]{2})\s*[:\-]\s*/);
            if (!matched && mStrict) {
                extractedPrefixes.push(mStrict[1].trim().toUpperCase());
                cleanName = cleanName.substring(mStrict[0].length).trim();
                matched = true;
            }

            loop = matched;
        }

        // Clean leftover trailing and leading junk
        cleanName = cleanName.replace(/^[\s\-\|\:~_]+|[\s\-\|\:~_]+$/g, '').trim();
        cleanName = cleanName || rawName;
        
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

        // Mix extracted prefixes into countries and tags so user can filter them
        extractedPrefixes.forEach(pref => {
            if (!countries.includes(pref)) countries.push(pref);
            if (!tags.includes(pref)) tags.unshift(pref); // Show it visually on card as well
        });

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
