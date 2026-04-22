/**
 * LocalStorage wrapper for persisting user preferences
 */
const Storage = {
  KEYS: {
    THEME: 'iptv_theme',
    FAVORITES: 'iptv_favorites',
    M3U_URL: 'iptv_m3u_url',
    LAST_CHANNEL: 'iptv_last_channel',
    RECENT_CHANNELS: 'iptv_recent_channels'
  },

  get(key, defaultValue) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Error reading from storage', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to storage', e);
    }
  },

  // Specialized methods
  getTheme() {
    return this.get(this.KEYS.THEME, 'dark');
  },

  setTheme(theme) {
    this.set(this.KEYS.THEME, theme);
  },

  getFavorites() {
    return this.get(this.KEYS.FAVORITES, []);
  },

  toggleFavorite(channelUrl) {
    const favs = this.getFavorites();
    const index = favs.indexOf(channelUrl);
    if (index === -1) {
      favs.push(channelUrl);
    } else {
      favs.splice(index, 1);
    }
    this.set(this.KEYS.FAVORITES, favs);
    return favs;
  },

  isFavorite(channelUrl) {
    return this.getFavorites().includes(channelUrl);
  },

  getM3uUrl() {
    return this.get(this.KEYS.M3U_URL, '');
  },

  setM3uUrl(url) {
    this.set(this.KEYS.M3U_URL, url);
  },
  
  getLastChannel() {
    return this.get(this.KEYS.LAST_CHANNEL, null);
  },
  
  setLastChannel(channel) {
    this.set(this.KEYS.LAST_CHANNEL, channel);
  },

  getRecentChannels() {
    return this.get(this.KEYS.RECENT_CHANNELS, []);
  },

  addRecentChannel(channelUrl) {
    let recents = this.getRecentChannels();
    recents = recents.filter(url => url !== channelUrl);
    recents.unshift(channelUrl);
    if (recents.length > 50) recents = recents.slice(0, 50);
    this.set(this.KEYS.RECENT_CHANNELS, recents);
  }
};
