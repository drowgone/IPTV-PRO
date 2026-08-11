/**
 * HLS Stream Handler
 * Manages video playback and HLS events
 */
const Stream = {
  hls: null,
  dash: null,
  videoElement: null,
  currentUrl: null,
  isRetry: false,

  init(videoElement, onError) {
    this.videoElement = videoElement;
    this.onError = onError;
  },

  load(url, isRetry = false) {
    this.destroy(); // Clean up previous players

    this.currentUrl = url;
    this.isRetry = isRetry;
    const lowerUrl = url.toLowerCase();

    if (typeof Controls !== 'undefined' && Controls.updateAudioTracks) {
      Controls.updateAudioTracks([]); // Hide audio tracks initially
    }
    
    // 1. DASH (.mpd)
    if (lowerUrl.includes('.mpd') && window.dashjs) {
      console.log('Detected DASH stream');
      this.dash = dashjs.MediaPlayer().create();
      this.dash.initialize(this.videoElement, url, true);
      this.dash.on(dashjs.MediaPlayer.events.ERROR, (e) => {
        console.error('DASH Error:', e);
        if (!this.isRetry) {
          console.log('Retrying DASH via safe proxy...');
          const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
          this.load(proxyUrl, true);
        } else {
          if (this.onError) this.onError(e);
        }
      });
      return;
    }

    // 2. HLS (.m3u8) via HLS.js
    if (window.Hls && Hls.isSupported()) {
      // Fetch dynamic buffer level from Storage
      const bufferSecs = typeof Storage !== 'undefined' ? parseInt(Storage.get('iptv_buffer_level', '60')) : 60;

      this.hls = new Hls({
        // --- Buffer Settings ---
        maxBufferLength: bufferSecs,           // dynamically configured buffer
        maxMaxBufferLength: bufferSecs * 2,
        maxBufferSize: bufferSecs * 1000 * 1000,
        maxBufferHole: 2,              // tolerate up to 2s gaps
        highBufferWatchdogPeriod: 4,   // check buffer health every 4s

        // --- Latency ---
        enableWorker: true,
        lowLatencyMode: false,         // disable LLM for stability
        liveSyncDurationCount: 4,      // sync point
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,

        // --- Retry & Recovery ---
        fragLoadingMaxRetry: 8,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,   // 1s between retries
        fragLoadingMaxRetryTimeout: 64000,

        // --- Adaptive bitrate ---
        startLevel: -1,                // auto pick best quality level
        abrEwmaDefaultEstimate: 5e6,   // assume 5 Mbps initially
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.videoElement.play().catch(e => console.log('Auto-play prevented:', e));
      });

      this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        const tracks = this.hls.audioTracks;
        if (typeof Controls !== 'undefined' && Controls.updateAudioTracks) {
          Controls.updateAudioTracks(tracks);
        }
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('fatal network error encountered, try to recover');
              if (!this.isRetry) {
                console.log('CORS/Network error. Retrying via safe local proxy...');
                const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
                this.load(proxyUrl, true);
              } else {
                this.hls.startLoad();
              }
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
                cause = 'cors'; // 0 usually means CORS block
              } else if (data.response && data.response.code === 404) {
                cause = 'notfound';
              }

              if (!this.isRetry && (cause === 'cors' || cause === 'network')) {
                console.log('CORS/Network error. Retrying via safe local proxy...');
                const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
                this.load(proxyUrl, true);
              } else {
                if (this.onError) this.onError({ cause: cause, details: data });
              }
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
         if (!this.isRetry) {
            console.log('Native playback error. Retrying via safe local proxy...');
            const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
            this.load(proxyUrl, true);
         } else {
            if (this.onError) this.onError({ cause: 'unsupported', details: e });
         }
      };
      return;
    }

    // Fallback: Try native anyway
    this.videoElement.src = url;
    this.videoElement.play().catch(e => {
        if (!this.isRetry) {
            console.log('Fallback player error. Retrying via safe local proxy...');
            const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
            this.load(proxyUrl, true);
        } else {
            if (this.onError) this.onError({ cause: 'unsupported', details: e });
        }
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
