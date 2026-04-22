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
            
            // Extract massive list of known countries/categories with ANY separator (space, colon, hyphen, etc)
            const geoFull = 'AFGHANISTAN|ALBANIA|ALGERIA|ANDORRA|ANGOLA|ARGENTINA|ARMENIA|AUSTRALIA|AUSTRIA|AZERBAIJAN|BAHAMAS|BAHRAIN|BANGLADESH|BARBADOS|BELARUS|BELGIUM|BOLIVIA|BOSNIA|BRAZIL|BULGARIA|CAMBODIA|CAMEROON|CANADA|CHILE|CHINA|COLOMBIA|COSTA RICA|CROATIA|CUBA|CYPRUS|CZECHIA|CZECH|DENMARK|DOMINICAN|ECUADOR|EGYPT|EL SALVADOR|ESTONIA|ETHIOPIA|FINLAND|FRANCE|GEORGIA|GERMANY|GHANA|GREECE|GUATEMALA|HAITI|HONDURAS|HONG KONG|HUNGARY|ICELAND|INDIA|INDONESIA|IRAN|IRAQ|IRELAND|ISRAEL|ITALY|JAMAICA|JAPAN|JORDAN|KAZAKHSTAN|KENYA|KOREA|KOSOVO|KUWAIT|LATVIA|LEBANON|LIBYA|LITHUANIA|LUXEMBOURG|MACEDONIA|MALAYSIA|MALI|MALTA|MEXICO|MOLDOVA|MONACO|MONGOLIA|MONTENEGRO|MOROCCO|MYANMAR|NEPAL|NETHERLANDS|NEW ZEALAND|NICARAGUA|NIGERIA|NORWAY|OMAN|PAKISTAN|PALESTINE|PANAMA|PARAGUAY|PERU|PHILIPPINES|POLAND|PORTUGAL|QATAR|ROMANIA|RUSSIA|SAUDI ARABIA|SENEGAL|SERBIA|SINGAPORE|SLOVAKIA|SLOVENIA|SOMALIA|SOUTH AFRICA|SPAIN|SRI LANKA|SUDAN|SWEDEN|SWITZERLAND|SYRIA|TAIWAN|TAJIKISTAN|TANZANIA|THAILAND|TUNISIA|TURKEY|UGANDA|UKRAINE|UNITED ARAB EMIRATES|UAE|UK|USA|UNITED KINGDOM|UNITED STATES|URUGUAY|UZBEKISTAN|VENEZUELA|VIETNAM|YEMEN|ZAMBIA|ZIMBABWE|AF|AL|DZ|AR|AM|AU|AT|AZ|BH|BD|BY|BE|BO|BA|BR|BG|CA|CL|CN|CO|CR|HR|CU|CY|CZ|DK|DO|EC|EG|SV|EE|ET|FI|FR|GE|DE|GH|GR|GT|HT|HN|HK|HU|IS|IN|ID|IR|IQ|IE|IL|IT|JM|JP|JO|KZ|KE|KR|KW|LV|LB|LY|LT|LU|MK|MY|ML|MT|MX|MD|MC|MN|ME|MA|MM|NP|NL|NZ|NI|NG|NO|OM|PK|PS|PA|PY|PE|PH|PL|PT|QA|RO|RU|SA|SN|RS|SG|SK|SI|SO|ZA|ES|LK|SD|SE|CH|SY|TW|TJ|TZ|TH|TN|TR|UG|UA|AE|UK|US|UY|UZ|VE|VN|YE|ZM|ZW|EN|AFRICA|AMERICA|ARABIC|ASIA|BALKAN|CARIBBEAN|EUROPE|EXYU|KURDISH|LATAM|SCANDINAVIA|SPORT|SPORTS|MOVIES|NEWS|KIDS|MUSIC|XXX|LOCAL|INFO|VOD|VIP|24\\/7';
            const geoRegex = new RegExp(`^(${geoFull})\\b[\\s\\|\\:\\-~_]+`, 'i');
            const mGeo = cleanName.match(geoRegex);
            if (!matched && mGeo) {
                extractedPrefixes.push(mGeo[1].trim().toUpperCase());
                cleanName = cleanName.substring(mGeo[0].length).trim();
                matched = true;
            }

            // Extract strict 2-3 uppercase codes with explicit punctuation like RU: or TR-
            const mStrict = cleanName.match(/^(?!TV\b)([A-Z]{2,3})\s*[:\-]\s*/);
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
