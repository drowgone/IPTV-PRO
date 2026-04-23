class App {
  constructor() {
    this.state = {
      channels: [],
      filteredChannels: [],
      activeChannel: null,
      currentTab: 'all', // 'all' or 'fav'
      isLoading: false,
      searchQuery: '',
      filters: {
        country: '',
        language: '',
        category: ''
      },
      contextChannel: null,
      sleepTimer: null,
      miniTab: 'fav'
    };

    this.elements = {
      channelList: document.querySelector('.channel-list-container'),
      phantom: document.querySelector('.channel-list-phantom'),
      content: document.querySelector('.channel-list-content'),
      video: document.querySelector('#mainVideo'),
      videoContainer: document.querySelector('.video-container'),
      searchInput: document.querySelector('.search-input'),
      filterToggleBtn: document.querySelector('#filterToggleBtn'),
      advancedFilterPanel: document.querySelector('#advancedFilterPanel'),
      countryFilter: document.querySelector('#countryFilter'),
      languageFilter: document.querySelector('#languageFilter'),
      categoryFilter: document.querySelector('#categoryFilter'),
      settingsBtn: document.querySelector('#settingsBtn'),
      settingsModal: document.querySelector('#settingsModal'),
      closeModalBtn: document.querySelector('#closeModalBtn'),
      saveSettingsBtn: document.querySelector('#saveSettingsBtn'),
      m3uInput: document.querySelector('#m3uInput'),
      themeBtns: document.querySelectorAll('.theme-btn'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      loader: document.querySelector('.loader'),
      channelNameDisplay: document.querySelector('#channelNameDisplay'),
      mobileMenuBtn: document.querySelector('#mobileMenuBtn'),
      sidebar: document.querySelector('.sidebar'),
      sidebarOverlay: document.querySelector('#sidebarOverlay'),
      errorDisplay: document.querySelector('#errorDisplay'),
      retryBtn: document.querySelector('#retryBtn'),
      exportFavBtn: document.querySelector('#exportFavBtn'),
      importFavFile: document.querySelector('#importFavFile'),
      clearFavBtn: document.querySelector('#clearFavBtn'),
      favCountLabel: document.querySelector('#favCountLabel'),
      favToast: document.querySelector('#favToast'),
      countAll: document.querySelector('#count-all'),
      countFav: document.querySelector('#count-fav'),
      countRecent: document.querySelector('#count-recent'),
      alphabetIndicator: document.querySelector('#alphabetIndicator'),
      contextMenu: document.querySelector('#contextMenu'),
      playerContextMenu: document.querySelector('#playerContextMenu'),
      sleepIndicator: document.querySelector('#sleepIndicator'),
      sleepTimerText: document.querySelector('#sleepTimerText'),
      miniListContent: document.querySelector('#miniChannelList .mini-list-content'),
      sleepTimerDialog: document.querySelector('#sleepTimerDialog'),
      infoModal: document.querySelector('#channelInfoModal'),
      infoLogo: document.querySelector('#infoLogo'),
      infoName: document.querySelector('#infoName'),
      infoGroup: document.querySelector('#infoGroup'),
      infoCountry: document.querySelector('#infoCountry'),
      infoLanguage: document.querySelector('#infoLanguage'),
      infoUrl: document.querySelector('#infoUrl'),
      closeInfoBtn: document.querySelector('#closeInfoModalBtn')
    };

    this.scrollTimeout = null;

    this.virtualScroll = {
      itemHeight: 74, // Approximate height of channel-item (68px + margins)
    };

    window.app = this; // Global reference for Controls


    // Scroll Event for Alphabet Indicator
    this.elements.channelList.addEventListener('scroll', () => {
      this.renderList();
      this.handleScrollIndicator();
    });

    this.init();
    this.initContextMenu();
  }

  handleScrollIndicator() {
    const { alphabetIndicator } = this.elements;
    if (!alphabetIndicator || this.state.filteredChannels.length === 0) return;

    // Show indicator
    alphabetIndicator.classList.add('is-scrolling');

    // Get current first visible item
    const scrollTop = this.elements.channelList.scrollTop;
    const startIndex = Math.floor(scrollTop / this.virtualScroll.itemHeight);
    const channel = this.state.filteredChannels[startIndex];
    
    if (channel && channel.name) {
      const firstLetter = channel.name.charAt(0).toUpperCase();
      alphabetIndicator.textContent = firstLetter;
    }

    // Hide after inactivity
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      alphabetIndicator.classList.remove('is-scrolling');
    }, 500);
  }

  async init() {
    // Apply theme
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeButtons(theme);

    // Init modules
    Stream.init(this.elements.video, (err) => this.handleStreamError(err));
    Controls.init(this.elements.video, this.elements.videoContainer);

    // Event Listeners
    this.bindEvents();

    // Load Playlist
    const savedUrl = Storage.getM3uUrl();
    if (savedUrl) {
      this.elements.m3uInput.value = savedUrl;
      await this.loadPlaylist(savedUrl);
      
      // Check for deep link (?stream=...)
      const params = new URLSearchParams(window.location.search);
      const deepStream = params.get('stream');
      
      if (deepStream) {
        const ch = this.state.channels.find(c => c.url === deepStream);
        if (ch) {
          this.playChannel(ch);
        } else {
          this.playChannel({ name: 'Tashqi havola', url: deepStream, group: 'M3U' });
        }
      } else {
        // Restore last channel
        const lastChannel = Storage.getLastChannel();
        if (lastChannel) {
          this.playChannel(lastChannel);
        }
      }
    } else {
      // Show settings modal if no URL
      this.elements.settingsModal.classList.add('show');
    }
  }

  bindEvents() {
    // Advanced Filters Toggle & Logic
    if (this.elements.filterToggleBtn) {
      this.elements.filterToggleBtn.addEventListener('click', () => {
        this.elements.advancedFilterPanel.classList.toggle('hidden');
      });
    }

    const applyFilters = () => {
      this.state.filters.country = this.elements.countryFilter.value;
      this.state.filters.language = this.elements.languageFilter.value;
      this.state.filters.category = this.elements.categoryFilter.value;
      this.filterChannels();
    };

    if (this.elements.countryFilter) this.elements.countryFilter.addEventListener('change', applyFilters);
    if (this.elements.languageFilter) this.elements.languageFilter.addEventListener('change', applyFilters);
    if (this.elements.categoryFilter) this.elements.categoryFilter.addEventListener('change', applyFilters);

    const clearBtn = document.querySelector('#clearFiltersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.elements.countryFilter.value = '';
        this.elements.languageFilter.value = '';
        this.elements.categoryFilter.value = '';
        this.state.filters = { country: '', language: '', category: '' };
        this.filterChannels();
      });
    }

    // Search
    this.elements.searchInput.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.toLowerCase();
      this.filterChannels();
    });

    // Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.currentTab = btn.dataset.tab;
        this.filterChannels();
      });
    });

    // Settings Modal
    this.elements.settingsBtn.addEventListener('click', () => {
      this.updateFavCount();
      this.elements.settingsModal.classList.add('show');
    });

    this.elements.closeModalBtn.addEventListener('click', () => {
      this.elements.settingsModal.classList.remove('show');
    });

    // Global click to hide context menus
    document.addEventListener('click', () => {
      if (this.elements.contextMenu) this.elements.contextMenu.classList.remove('show');
      if (this.elements.playerContextMenu) this.elements.playerContextMenu.classList.remove('show');
    });

    document.addEventListener('contextmenu', (e) => {
      const isChannel = e.target.closest('.channel-item');
      const isVideo = e.target.closest('#mainVideo');

      if (!isChannel && this.elements.contextMenu) this.elements.contextMenu.classList.remove('show');
      if (!isVideo && this.elements.playerContextMenu) this.elements.playerContextMenu.classList.remove('show');
    });

    // Video Player Events (DoubleClick & ContextMenu)
    this.elements.video.addEventListener('dblclick', () => {
      if (!document.fullscreenElement) {
        this.elements.videoContainer.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });

    this.elements.video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menu = this.elements.playerContextMenu;
      if (!menu) return;

      // Update UI states
      const video = this.elements.video;
      menu.querySelector('#pMenuPlayPause').innerHTML = video.paused ? '▶️ Davom ettirish' : '⏸ Pauza';
      menu.querySelector('#pMenuMute').innerHTML = video.muted ? "🔊 Ovozni yoqish" : "🔇 Ovozni o'chirish";
      
      const isRecording = typeof Controls !== 'undefined' && Controls.isRecording;
      menu.querySelector('#pMenuRecord').innerHTML = isRecording ? "⏹ Yozishni to'xtatish" : "🔴 Yozib olishni boshlash";

      const hasSleepTimer = !!this.state.sleepTimer;
      menu.querySelector('#pMenuSleep').innerHTML = hasSleepTimer ? "⏳ Taymerni bekor qilish" : "⏳ Uyqu taymeri (Sleep)";

      const isTheater = this.elements.videoContainer.classList.contains('theater-mode');
      menu.querySelector('#pMenuTheater').innerHTML = isTheater ? "🎭 Kino rejimidan chiqish" : "🎭 Kino rejimi (Theater)";

      const isFS = !!document.fullscreenElement;
      menu.querySelector('#pMenuMiniList').style.display = isFS ? 'block' : 'none';
      menu.querySelector('#pMenuTheater').style.display = isFS ? 'none' : 'block';

      menu.classList.remove('hidden');
      menu.classList.add('show');

      // Position (Relative to container)
      const rect = this.elements.videoContainer.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      const menuWidth = 220;
      const menuHeight = 180; // approximate
      
      if (x + menuWidth > rect.width) x -= menuWidth;
      if (y + menuHeight > rect.height) y -= menuHeight;

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    });

    this.elements.saveSettingsBtn.addEventListener('click', async () => {
      const url = this.elements.m3uInput.value.trim();
      if (url) {
        Storage.setM3uUrl(url);
        await this.loadPlaylist(url);
        this.elements.settingsModal.classList.remove('show');
      }
    });

    // Mini List Tabs & Close
    const miniTabs = document.querySelectorAll('.mini-tab-btn');
    miniTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        miniTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.miniTab = btn.dataset.miniTab;
        this.renderMiniList();
      });
    });

    const closeMiniBtn = document.querySelector('#closeMiniBtn');
    if (closeMiniBtn) {
      closeMiniBtn.addEventListener('click', () => {
        const ml = document.querySelector('#miniChannelList');
        if (ml) ml.classList.add('hidden');
      });
    }

    // Mini List Mouse Drag & Wheel Scroll
    this.initMiniScroll();

    // Sleep Timer Dialog Events
    const sleepOptBtns = document.querySelectorAll('.sleep-opt-btn');
    sleepOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.mins);
        this.setSleepTimer(mins);
        if (this.elements.sleepTimerDialog) this.elements.sleepTimerDialog.classList.remove('show');
      });
    });

    const closeSleepDialog = document.querySelector('#closeSleepDialog');
    if (closeSleepDialog) {
      closeSleepDialog.addEventListener('click', () => {
        if (this.elements.sleepTimerDialog) this.elements.sleepTimerDialog.classList.remove('show');
      });
    }

    if (this.elements.closeInfoBtn) {
      this.elements.closeInfoBtn.addEventListener('click', () => {
        this.elements.infoModal.classList.remove('show');
      });
    }

    // Theme Switching
    this.elements.themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        Storage.setTheme(theme);
        this.updateThemeButtons(theme);
      });
    });

    // Virtual Scroll
    this.elements.channelList.addEventListener('scroll', () => {
      requestAnimationFrame(() => this.renderList());
    });

    // Resize observer for virtual scroll
    new ResizeObserver(() => {
      this.renderList();
    }).observe(this.elements.channelList);

    // Mobile & Desktop Sidebar Toggle
    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.toggleSidebar(true);
        } else {
          this.elements.sidebar.classList.toggle('collapsed');
        }
      });
    }

    if (this.elements.sidebarOverlay) {
      this.elements.sidebarOverlay.addEventListener('click', () => {
        this.toggleSidebar(false);
      });
    }

    // Sidebar Resizer
    const resizer = document.querySelector('.sidebar-resizer');
    if (resizer) {
      let isResizing = false;

      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        resizer.classList.add('is-resizing');
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = e.clientX;
        if (newWidth > 220 && newWidth < Math.min(600, window.innerWidth * 0.5)) {
          this.elements.sidebar.style.width = `${newWidth}px`;
          this.elements.sidebar.classList.remove('collapsed');
        } else if (newWidth <= 220) {
           this.elements.sidebar.classList.add('collapsed');
           // Optional: Stop resizing when collapsed
           isResizing = false;
           document.body.style.cursor = 'default';
           resizer.classList.remove('is-resizing');
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = 'default';
          resizer.classList.remove('is-resizing');
        }
      });
    }

    // Retry Button
    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener('click', () => {
        if (this.state.activeChannel) {
          this.playChannel(this.state.activeChannel);
        }
      });
    }

    // ===== Favorites Import / Export =====
    if (this.elements.exportFavBtn) {
      this.elements.exportFavBtn.addEventListener('click', () => this.exportFavorites());
    }

    if (this.elements.importFavFile) {
      this.elements.importFavFile.addEventListener('change', (e) => this.importFavorites(e));
    }

    if (this.elements.clearFavBtn) {
      this.elements.clearFavBtn.addEventListener('click', () => this.clearFavorites());
    }
  }

  handleStreamError(error) {
    console.error('Stream Error:', error);
    this.elements.loader.classList.remove('show');
    this.elements.errorDisplay.style.display = 'flex';
    this.elements.errorDisplay.style.flexDirection = 'column';
    this.elements.errorDisplay.style.alignItems = 'center';

    // Show TV Static overlay
    const staticOverlay = document.getElementById('tvStaticOverlay');
    if (staticOverlay) staticOverlay.classList.add('show');
    
    const errorText = this.elements.errorDisplay.querySelector('.error-text');
    const errorDesc = this.elements.errorDisplay.querySelector('.error-desc');
    
    const cause = error && error.cause ? error.cause : 'network';

    const messages = {
      notfound: {
        title: '📡 Signal Topilmadi',
        desc: 'Kanal serveri javob bermadi (404). Ehtimol, u oflayn yoki URL eskirib qolgan.'
      },
      cors: {
        title: '🔒 Kirish Taqiqlangan',
        desc: 'Brauzer yoki server CORS/Geoblock xavfsizlik qoidasi bilan bu kanalga kirishni blokladi.'
      },
      drm: {
        title: '🛡 DRM Himoyasi',
        desc: 'Bu kanal maxsus litsenziya talab qiladigan DRM bilan himoyalangan. Rasmiy ilova talab etiladi.'
      },
      unsupported: {
        title: '🎞 Format Xatosi',
        desc: 'Kanal formati (codec/container) bu brauzerda qo\'llab quvvatlanmaydi.'
      },
      network: {
        title: '🌐 Ulanish Xatosi',
        desc: 'Internet ulanishingizni tekshiring yoki kanal tarmoqda mavjud emasligini qarang.'
      }
    };

    const msg = messages[cause] || messages.network;
    if (errorText) errorText.textContent = msg.title;
    if (errorDesc) errorDesc.textContent = msg.desc;
  }

  hideStreamError() {
    this.elements.errorDisplay.style.display = 'none';
    const staticOverlay = document.getElementById('tvStaticOverlay');
    if (staticOverlay) staticOverlay.classList.remove('show');
  }

  toggleSidebar(show) {
    if (show) {
      this.elements.sidebar.classList.add('open');
      this.elements.sidebarOverlay.classList.add('show');
    } else {
      this.elements.sidebar.classList.remove('open');
      this.elements.sidebarOverlay.classList.remove('show');
    }
  }

  updateThemeButtons(activeTheme) {
    this.elements.themeBtns.forEach(btn => {
      if (btn.dataset.theme === activeTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateTabCounts() {
    if (this.elements.countAll) this.elements.countAll.textContent = this.state.channels.length;
    if (this.elements.countFav) this.elements.countFav.textContent = Storage.getFavorites().length;
    if (this.elements.countRecent) this.elements.countRecent.textContent = Storage.getRecentChannels().length;
  }

  initContextMenu() {
    const menu = this.elements.contextMenu;
    if (!menu) return;

    const actions = {
      menuPlay: () => { this.playChannel(this.state.contextChannel); },
      menuNewTab: () => { 
        const streamUrl = this.state.contextChannel.url;
        const playerUrl = `${window.location.origin}${window.location.pathname}?stream=${encodeURIComponent(streamUrl)}`;
        window.open(playerUrl, '_blank');
      },
      menuFav: () => {
        Storage.toggleFavorite(this.state.contextChannel.url);
        this.updateFavCount();
        this.updateTabCounts();
        if (this.state.currentTab === 'fav') this.filterChannels();
        else this.renderList();
      },
      menuCopy: () => {
        this.copyToClipboard(this.state.contextChannel.url);
      },
      menuInfo: () => {
        this.showChannelInfo(this.state.contextChannel);
      }
    };

    menu.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        if (this.state.contextChannel) actions[li.id]();
        menu.classList.remove('show');
      });
    });

    // Player Context Menu Actions
    const pMenu = this.elements.playerContextMenu;
    if (pMenu) {
      const pActions = {
        pMenuPlayPause: () => {
          if (this.elements.video.paused) this.elements.video.play();
          else this.elements.video.pause();
        },
        pMenuMute: () => {
          this.elements.video.muted = !this.elements.video.muted;
        },
        pMenuRecord: () => {
          if (typeof Controls !== 'undefined') {
            Controls.toggleRecord();
          }
        },
        pMenuSleep: () => {
          if (this.state.sleepTimer) {
            clearInterval(this.state.sleepTimer);
            this.state.sleepTimer = null;
            if (this.elements.sleepIndicator) this.elements.sleepIndicator.classList.add('hidden');
            this.showFavToast("⏳ Uyqu taymeri bekor qilindi.");
            return;
          }

          if (this.elements.sleepTimerDialog) {
            this.elements.sleepTimerDialog.classList.add('show');
          }
        },
        pMenuTheater: () => {
          if (typeof Controls !== 'undefined') Controls.toggleTheater();
        },
        pMenuMiniList: () => {
          if (typeof Controls !== 'undefined') Controls.toggleMiniList();
        }
      };

      pMenu.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          if (pActions[li.id]) pActions[li.id]();
          pMenu.classList.remove('show');
        });
      });
    }
  }

  async loadPlaylist(url) {
    this.elements.loader.classList.add('show');
    try {
      const channels = await Parser.fetchAndParse(url);
      this.state.channels = channels;
      this.populateFilters();
      this.filterChannels();
    } catch (error) {
      alert('Failed to load playlist. Please check the URL and CORS settings.');
    } finally {
      this.elements.loader.classList.remove('show');
    }
  }

  populateFilters() {
    if (!this.elements.countryFilter) return;
    
    const countries = new Set();
    const languages = new Set();
    const categories = new Set();
    
    this.state.channels.forEach(ch => {
      if (ch.countries) ch.countries.forEach(c => countries.add(c));
      if (ch.languages) ch.languages.forEach(l => languages.add(l));
      if (ch.group && ch.group !== 'Boshqalar') categories.add(ch.group);
    });
    
    const populateSelect = (selectElem, itemsSet, defaultText) => {
       const sorted = Array.from(itemsSet).sort();
       selectElem.innerHTML = `<option value="">${defaultText}</option>` + 
       sorted.map(item => `<option value="${item}">${item}</option>`).join('');
    };
    
    populateSelect(this.elements.countryFilter, countries, "Davlatlar (Barchasi)");
    populateSelect(this.elements.languageFilter, languages, "Tillar (Barchasi)");
    populateSelect(this.elements.categoryFilter, categories, "Janrlar (Barchasi)");

    // Reset current filter state
    this.state.filters = { country: '', language: '', category: '' };
  }

  filterChannels() {
    let filtered = this.state.channels;

    // Filter by Tab
    if (this.state.currentTab === 'fav') {
      filtered = filtered.filter(ch => Storage.isFavorite(ch.url));
    } else if (this.state.currentTab === 'recent') {
      const recentUrls = Storage.getRecentChannels();
      // Map to maintain order from most recent
      filtered = recentUrls.map(url => this.state.channels.find(c => c.url === url)).filter(Boolean);
    }

    // Filter by Search (name, group, country, language)
    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      filtered = filtered.filter(ch => 
        ch.name.toLowerCase().includes(q) ||
        ch.group.toLowerCase().includes(q) ||
        (ch.countries && ch.countries.some(c => c.toLowerCase().includes(q))) ||
        (ch.languages && ch.languages.some(l => l.toLowerCase().includes(q)))
      );
    }

    // Filter by Advanced Filters
    if (this.state.filters.country) {
       filtered = filtered.filter(ch => ch.countries && ch.countries.includes(this.state.filters.country));
    }
    if (this.state.filters.language) {
       filtered = filtered.filter(ch => ch.languages && ch.languages.includes(this.state.filters.language));
    }
    if (this.state.filters.category) {
       filtered = filtered.filter(ch => ch.group === this.state.filters.category);
    }

    this.state.filteredChannels = filtered;
    this.updateTabCounts();
    
    // Reset scroll
    this.elements.channelList.scrollTop = 0;
    this.renderList();
  }

  renderList() {
    const { channelList, phantom, content } = this.elements;
    
    const itemHeight = this.virtualScroll.itemHeight;
    const totalItems = this.state.filteredChannels.length;
    
    // Set phantom height
    phantom.style.height = `${totalItems * itemHeight}px`;

    // Calculate visible range
    const scrollTop = channelList.scrollTop;
    const containerHeight = channelList.clientHeight;
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      totalItems,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 3 // Buffer rows
    );

    // Update content position
    content.style.transform = `translateY(${startIndex * itemHeight}px)`;
    
    // Only re-render items if start index changed (optional but good)
    content.innerHTML = '';

    for (let i = startIndex; i < endIndex; i++) {
        const channel = this.state.filteredChannels[i];
        if (!channel) continue;
        
        const el = this.createChannelElement(channel);
        content.appendChild(el);
    }
  }

  getFallbackLogo(name) {
    const initial = name ? name.charAt(0).toUpperCase() : 'T';
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="15" fill="hsl(${hue}, 60%, 40%)"/><text x="50" y="53" font-family="Outfit, sans-serif" font-size="45" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  getTagClass(tag) {
    const t = tag.toUpperCase();
    if (t.includes('4K') || t.includes('UHD')) return 'tag-4k';
    if (t.includes('FHD') || t.includes('1080')) return 'tag-fhd';
    if (t.includes('HD') || t.includes('720')) return 'tag-hd';
    return 'tag-default';
  }

  createChannelElement(channel) {
    const div = document.createElement('div');
    div.className = `channel-item ${this.state.activeChannel?.url === channel.url ? 'active' : ''}`;
    div.setAttribute('data-url', channel.url);
    
    const isFav = Storage.isFavorite(channel.url);
    const fallbackLogo = this.getFallbackLogo(channel.name);
    // Filter out edge cases where logo is string "undefined" or empty
    const logoSrc = (channel.logo && channel.logo !== 'undefined') ? channel.logo : fallbackLogo;

    const tagsHtml = channel.tags && channel.tags.length > 0 
      ? `<div class="channel-tags">${channel.tags.map(t => `<span class="tag ${this.getTagClass(t)}">${t}</span>`).join('')}</div>`
      : '';

    div.innerHTML = `
      <img src="${logoSrc}" class="channel-logo loading" alt="" loading="lazy">
      <div class="channel-info">
        <div class="channel-name-row">
          <span class="channel-name">${channel.name}</span>
          ${tagsHtml}
        </div>
        <div class="channel-group">${channel.group}</div>
        <div class="meta-tags">
          ${channel.countries && channel.countries.length ? `<span class="meta-tag">🌎 ${channel.countries.join(', ')}</span>` : ''}
          ${channel.languages && channel.languages.length ? `<span class="meta-tag">🗣 ${channel.languages[0]}</span>` : ''}
        </div>
      </div>
      <button class="fav-btn ${isFav ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </button>
    `;

    // Handle image load / error
    const imgElement = div.querySelector('img');
    
    imgElement.addEventListener('load', function() {
        this.classList.remove('loading');
    });

    imgElement.addEventListener('error', function() {
       this.classList.remove('loading');
       if (this.src !== fallbackLogo) {
           this.src = fallbackLogo;
       }
    });

    // Click to play
    div.addEventListener('click', (e) => {
      // If clicked on fav button
      if (e.target.closest('.fav-btn')) {
        e.stopPropagation();
        Storage.toggleFavorite(channel.url);
        // Re-render this item or list
        if (this.state.currentTab === 'fav') {
          this.filterChannels();
        } else {
          const btn = div.querySelector('.fav-btn');
          const isNowFav = Storage.isFavorite(channel.url);
          btn.classList.toggle('active', isNowFav);
          const svg = btn.querySelector('svg');
          svg.setAttribute('fill', isNowFav ? 'currentColor' : 'none');
        }
        return;
      }
      
      this.playChannel(channel);
    });

    // Context Menu Event
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.state.contextChannel = channel;
      
      const menu = this.elements.contextMenu;
      if (!menu) return;

      // Update Favorite text
      const favLi = menu.querySelector('#menuFav');
      const isFav = Storage.isFavorite(channel.url);
      favLi.innerHTML = isFav ? "💔 Sevimlilardan o'chirish" : "❤️ Sevimlilarga qo'shish";

      menu.classList.remove('hidden');
      menu.classList.add('show');

      // Position
      const menuWidth = 220;
      const menuHeight = 240;
      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth) x -= menuWidth;
      if (y + menuHeight > window.innerHeight) y -= menuHeight;

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    });

    return div;
  }

  playChannel(channel) {
    if (!channel) return;
    // If recording is active, auto-save before switching channels
    if (typeof Controls !== 'undefined') Controls.channelSwitchGuard();

    this.state.activeChannel = channel;
    Storage.setLastChannel(channel);
    Storage.addRecentChannel(channel.url); // Track in history
    this.updateTabCounts(); // Update recent count visually
    
    // Update active class in list
    const activeItems = this.elements.content.querySelectorAll('.channel-item.active');
    activeItems.forEach(el => el.classList.remove('active'));
    // Note: The clicked item might not be in DOM if we scrolled far, but if we clicked it, it is.
    // However, we re-render often. The renderList handles the active class check.
    this.renderList();

    this.elements.channelNameDisplay.textContent = channel.name;
    
    // Reset UI
    this.hideStreamError();
    this.elements.loader.classList.add('show');
    
    Stream.load(channel.url);

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      this.toggleSidebar(false);
    }
  }

  // ===== Favorites Count =====
  updateFavCount() {
    const favs = Storage.getFavorites();
    if (this.elements.favCountLabel) {
      this.elements.favCountLabel.textContent = `Sevimlilar: ${favs.length} ta kanal`;
    }
  }

  // ===== Export Favorites =====
  exportFavorites() {
    const favUrls = Storage.getFavorites();
    if (favUrls.length === 0) {
      this.showFavToast('⚠️ Hech qanday sevimli kanal yo\'q!', 'error');
      return;
    }

    // Collect full channel metadata for matched URLs
    const favChannels = favUrls.map(url => {
      const ch = this.state.channels.find(c => c.url === url);
      return ch ? { name: ch.name, url: ch.url, logo: ch.logo, group: ch.group } : { url };
    });

    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      count: favChannels.length,
      favorites: favChannels
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `iptv-favorites-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showFavToast(`✅ ${favChannels.length} ta kanal eksport qilindi!`);
  }

  // ===== Import Favorites =====
  importFavorites(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Accept both simple URL array and structured export format
        let urls = [];
        if (Array.isArray(data)) {
          urls = data.map(item => typeof item === 'string' ? item : item.url).filter(Boolean);
        } else if (data.favorites && Array.isArray(data.favorites)) {
          urls = data.favorites.map(item => typeof item === 'string' ? item : item.url).filter(Boolean);
        } else {
          throw new Error('Noto\'g\'ri fayl formati');
        }

        // Merge with existing favorites (no duplicates)
        const existing = Storage.getFavorites();
        const merged = Array.from(new Set([...existing, ...urls]));
        Storage.set(Storage.KEYS.FAVORITES, merged);

        const added = merged.length - existing.length;
        this.updateFavCount();
        this.updateTabCounts();
        this.showFavToast(`✅ ${added} ta yangi kanal import qilindi! (Jami: ${merged.length})`);

        // Refresh list if on favorites tab
        if (this.state.currentTab === 'fav') this.filterChannels();
      } catch (err) {
        this.showFavToast('❌ Xato: ' + (err.message || 'Fayl o\'qib bo\'lmadi'), 'error');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-chosen
    event.target.value = '';
  }

  // ===== Clear All Favorites =====
  clearFavorites() {
    const favs = Storage.getFavorites();
    if (favs.length === 0) {
      this.showFavToast('⚠️ Sevimlilar ro\'yxati allaqachon bo\'sh!', 'error');
      return;
    }
    if (!confirm(`Jami ${favs.length} ta sevimli kanalning barchasini o'chirasizmi?`)) return;

    Storage.set(Storage.KEYS.FAVORITES, []);
    this.updateFavCount();
    this.updateTabCounts();
    this.showFavToast('🗑️ Barcha sevimlilar o\'chirildi.');

    if (this.state.currentTab === 'fav') this.filterChannels();
  }

  // ===== Toast Message =====
  showFavToast(message, type = 'success') {
    const toast = this.elements.favToast;
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden', 'error');
    if (type === 'error') toast.classList.add('error');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }
  playNextChannel() {
    if (this.state.filteredChannels.length === 0) return;
    const currentIndex = this.state.filteredChannels.findIndex(ch => ch.url === this.state.activeChannel?.url);
    const nextIndex = (currentIndex + 1) % this.state.filteredChannels.length;
    this.playChannel(this.state.filteredChannels[nextIndex]);
    this.showFavToast(`⏭ Keyingi: ${this.state.filteredChannels[nextIndex].name}`);
  }

  playPreviousChannel() {
    if (this.state.filteredChannels.length === 0) return;
    const currentIndex = this.state.filteredChannels.findIndex(ch => ch.url === this.state.activeChannel?.url);
    const prevIndex = (currentIndex - 1 + this.state.filteredChannels.length) % this.state.filteredChannels.length;
    this.playChannel(this.state.filteredChannels[prevIndex]);
    this.showFavToast(`⏮ Oldingi: ${this.state.filteredChannels[prevIndex].name}`);
  }

  renderMiniList() {
    const list = this.elements.miniListContent;
    if (!list) return;

    list.innerHTML = '';
    
    let channels = [];
    if (this.state.miniTab === 'fav') {
      channels = this.state.channels.filter(ch => Storage.isFavorite(ch.url));
    } else {
      const recentUrls = Storage.getRecentChannels();
      channels = recentUrls.map(url => this.state.channels.find(c => c.url === url)).filter(Boolean);
    }

    if (channels.length === 0) {
      list.innerHTML = `<div style="width: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.5;">Hozircha hech narsa yo'q...</div>`;
      return;
    }
    
    channels.forEach(ch => {
      const active = this.state.activeChannel?.url === ch.url;
      const item = document.createElement('div');
      item.className = `mini-channel-item ${active ? 'active' : ''}`;
      
      const logo = ch.logo && ch.logo !== 'undefined' ? ch.logo : this.getFallbackLogo(ch.name);
      
      item.innerHTML = `
        <img src="${logo}" alt="" onerror="this.src='${this.getFallbackLogo(ch.name)}'">
        <div class="mini-ch-info">
          <div class="mini-ch-name">${ch.name}</div>
          <div class="mini-ch-group">${ch.group}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.playChannel(ch);
      });
      list.appendChild(item);
      
      if (active) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  initMiniScroll() {
    const slider = this.elements.miniListContent;
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.classList.add('active-dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.classList.remove('active-dragging');
    });

    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.classList.remove('active-dragging');
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    });
  }

  setSleepTimer(mins) {
    if (!mins || isNaN(mins)) return;

    const ms = mins * 60000;
    let remaining = ms;

    if (this.state.sleepTimer) clearInterval(this.state.sleepTimer);

    const updateUI = () => {
      const m = Math.floor(remaining / 60000).toString().padStart(2, '0');
      const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
      if (this.elements.sleepIndicator) {
        this.elements.sleepIndicator.classList.remove('hidden');
        this.elements.sleepTimerText.textContent = `${m}:${s}`;
      }
    };

    updateUI();

    this.state.sleepTimer = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) {
        clearInterval(this.state.sleepTimer);
        this.state.sleepTimer = null;
        this.elements.video.pause();
        if (this.elements.sleepIndicator) this.elements.sleepIndicator.classList.add('hidden');
        alert("⏳ Uyqu vaqti tugadi! Video to'xtatildi.");
      } else {
        updateUI();
      }
    }, 1000);

    this.showFavToast(`⏳ Uyqu taymeri ${mins} minutga o'rnatildi.`);
  }

  showChannelInfo(ch) {
    if (!ch || !this.elements.infoModal) return;

    this.elements.infoLogo.src = ch.logo && ch.logo !== 'undefined' ? ch.logo : this.getFallbackLogo(ch.name);
    this.elements.infoName.textContent = ch.name;
    this.elements.infoGroup.textContent = ch.group;
    this.elements.infoCountry.textContent = ch.countries?.join(', ') || "Noma'lum";
    this.elements.infoLanguage.textContent = ch.languages?.join(', ') || "Noma'lum";
    this.elements.infoUrl.textContent = ch.url;

    this.elements.infoModal.classList.add('show');
  }

  copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => this.showFavToast('🔗 Havoladan nusxa olindi!'))
        .catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showFavToast('🔗 Havoladan nusxa olindi!');
    } catch (err) {
      this.showFavToast('❌ Nusxa olishda xatolik!', 'error');
    }
    document.body.removeChild(textArea);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
