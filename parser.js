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
        const countryCodes = 'UK|US|USA|RU|TR|FR|DE|IT|ES|EN|PT|NL|PL|GR|RO|AR|BE|CH|AT|AU|CA|IN|PK|BD|IR|IL|CZ|SK|HU|BG|RS|HR|SI|MK|AL|KZ|UZ|UA|AZ|GE|AM|EE|LV|LT|FI|SE|NO|DK|IE|JP|KR|CN|TW|VN|TH|PH|MY|ID|SG|BR|MX|CL|CO|PE|VE|EC|PE|UY|PY|BO|CU|DO|PR|GT|HN|SV|NI|CR|PA|JM|TT|ZA|NG|KE|GH|EG|DZ|MA|TN|LY|SD|ET|NG|TZ|UG|ZM|ZW';
        const countryNames = 'UNITED KINGDOM|UNITED STATES|USA|RUSSIA|TURKEY|FRANCE|GERMANY|ITALY|SPAIN|PORTUGAL|NETHERLANDS|POLAND|GREECE|ROMANIA|ARGENTINA|BELGIUM|SWITZERLAND|AUSTRIA|AUSTRALIA|CANADA|INDIA|PAKISTAN|BANGLADESH|IRAN|ISRAEL|CZECH|SLOVAKIA|HUNGARY|BULGARIA|SERBIA|CROATIA|SLOVENIA|MACEDONIA|ALBANIA|UZBEKISTAN|KAZAKHSTAN|UKRAINE|AZERBAIJAN|GEORGIA|ARMENIA|ESTONIA|LATVIA|LITHUANIA|FINLAND|SWEDEN|NORWAY|DENMARK|IRELAND|JAPAN|KOREA|CHINA|TAIWAN|VIETNAM|THAILAND|PHILIPPINES|MALAYSIA|INDONESIA|SINGAPORE|BRAZIL|MEXICO|CHILE|COLOMBIA|PERU|VENEZUELA|ECUADOR|URUGUAY|PARAGUAY|BOLIVIA|CUBA|DOMINICAN REPUBLIC|PUERTO RICO|GUATEMALA|HONDURAS|EL SALVADOR|NICARAGUA|COSTA RICA|PANAMA|JAMAICA|TRINIDAD|SOUTH AFRICA|NIGERIA|KENYA|GHANA|EGYPT|ALGERIA|MOROCCO|TUNISIA|LIBYA|SUDAN|ETHIOPIA|TANZANIA|UGANDA|ZAMBIA|ZIMBABWE';
        const categories = 'VIP|VOD|ARABIC|LATAM|AFRICA|ASIA|EUROPE|BALEARES|CANARY|SOUTH|NORTH|EAST|WEST|CENTRAL|SPORT|SPORTS|MOVIES|CINEMA|FILM|NEWS|KIDS|CHILDREN|MUSIC|XXX|ADULT|LOCAL|INFO|HD|FHD|UHD|4K|8K|SD|HQ|RAW|HEVC|H265|MPEG|RADIO|TV|WEB|LIVE';
        
        const allPrefixes = `${countryCodes}|${countryNames}|${categories}`;
        
        while(loop) {
            let matched = false;
            
            // Extract from pipes, colons, or dashes (e.g. "UK | BBC" or "GERMANY: RTL")
            const sepRegex = new RegExp(`^(${allPrefixes}|[A-Z]{2,3})\\s*[:\\|\\-]\\s*`, 'i');
            const mSep = cleanName.match(sepRegex);
            if (mSep) {
                extractedPrefixes.push(mSep[1].trim().toUpperCase());
                cleanName = cleanName.substring(mSep[0].length).trim();
                matched = true;
            }
            
            // Extract from names where prefix is just followed by a space (e.g. "GERMANY RTL" or "UK BBC")
            // Limited to longer country names to avoid false positives with common short words
            const spaceRegex = new RegExp(`^(${countryNames}|VIP|VOD|ARABIC|LATAM|AFRICA)\\s+`, 'i');
            const mSpace = cleanName.match(spaceRegex);
            if (!matched && mSpace) {
                extractedPrefixes.push(mSpace[1].trim().toUpperCase());
                cleanName = cleanName.substring(mSpace[0].length).trim();
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
