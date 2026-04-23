/**
 * HLS Stream Handler
 * Manages video playback and HLS events
 */
const Stream = {
  hls: null,
  dash: null,
  videoElement: null,

  init(videoElement, onError) {
    this.videoElement = videoElement;
    this.onError = onError;
  },

  load(url) {
    this.destroy(); // Clean up previous players

    const lowerUrl = url.toLowerCase();
    
    // 1. DASH (.mpd)
    if (lowerUrl.includes('.mpd') && window.dashjs) {
      console.log('Detected DASH stream');
      this.dash = dashjs.MediaPlayer().create();
      this.dash.initialize(this.videoElement, url, true);
      this.dash.on(dashjs.MediaPlayer.events.ERROR, (e) => {
        console.error('DASH Error:', e);
        if (this.onError) this.onError(e);
      });
      return;
    }

    // 2. HLS (.m3u8) via HLS.js
    if (window.Hls && Hls.isSupported()) {
      this.hls = new Hls({
        // --- Buffer Settings ---
        maxBufferLength: 60,           // keep up to 60s in buffer (vs 30s default)
        maxMaxBufferLength: 120,       // allow buffer to grow up to 2 min on fast connections
        maxBufferSize: 60 * 1000 * 1000, // 60 MB buffer cap
        maxBufferHole: 2,              // tolerate up to 2s gaps (prevents stalling on bad segments)
        highBufferWatchdogPeriod: 4,   // check buffer health every 4s

        // --- Latency ---
        enableWorker: true,
        lowLatencyMode: false,         // disable LLM for VOD-like stability on IPTV streams
        liveSyncDurationCount: 4,      // sync point: 4 segments ahead of live edge
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,

        // --- Retry & Recovery ---
        fragLoadingMaxRetry: 8,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,   // 1s between retries
        fragLoadingMaxRetryTimeout: 64000,

        // --- User-Agent spoofing removed (modern browsers block this via XHR/fetch due to security) ---

        // --- Adaptive bitrate ---
        startLevel: -1,                // auto pick best quality level
        abrEwmaDefaultEstimate: 5e6,   // assume 5 Mbps initially (avoids starting at 360p)
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.videoElement.play().catch(e => console.log('Auto-play prevented:', e));
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('fatal network error encountered, try to recover');
              this.hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('fatal media error encountered, try to recover');
              this.hls.recoverMediaError();
              break;
            default:
              this.hls.destroy();
              let cause = 'network';
              const errDetails = data.details || '';
              if (errDetails.includes('keySystem') || errDetails.includes('fragDecry')) {
                cause = 'drm';
              } else if (data.response && (data.response.code === 403 || data.response.code === 0)) {
                cause = 'cors'; // 0 usually means CORS block on fetch
              } else if (data.response && data.response.code === 404) {
                cause = 'notfound';
              }
              if (this.onError) this.onError({ cause: cause, details: data });
              break;
          }
        }
      });
      return;
    }
    
    // 3. Native HLS (Safari) or Direct File (.mp4, .mkv, etc.)
    if (this.videoElement.canPlayType('application/vnd.apple.mpegurl') || 
        lowerUrl.includes('.mp4') || 
        lowerUrl.includes('.mkv')) {
      this.videoElement.src = url;
      this.videoElement.addEventListener('loadedmetadata', () => {
        this.videoElement.play().catch(e => console.log('Auto-play prevented:', e));
      });
      
      this.videoElement.onerror = (e) => {
         if (this.onError) this.onError({ cause: 'unsupported', details: e });
      };
      return;
    }

    // Fallback: Try native anyway
    this.videoElement.src = url;
    this.videoElement.play().catch(e => {
        if (this.onError) this.onError({ cause: 'unsupported', details: e });
    });
  },

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.dash) {
      this.dash.reset();
      this.dash = null;
    }
    // Stop native playback
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
    }
  }
};
