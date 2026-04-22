/**
 * Video Player Controls
 * Handles UI interactions and keyboard shortcuts
 */
const Controls = {
  video: null,
  container: null,
  overlay: null,
  hideTimer: null,
  
  // Recording State
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  isPaused: false,
  recordTimer: null,
  recordSeconds: 0,
  _beforeUnloadHandler: null,
  
  init(videoElement, containerElement) {
    this.video = videoElement;
    this.container = containerElement;
    this.overlay = containerElement.querySelector('.controls-overlay');
    
    this.bindEvents();
    this.setupAutoHide();
  },

  bindEvents() {
    // Play/Pause
    const playBtn = this.container.querySelector('#playBtn');
    playBtn.addEventListener('click', () => this.togglePlay());

    // Volume
    const volumeSlider = this.container.querySelector('#volumeSlider');
    const volumeBtn = this.container.querySelector('#volumeBtn');
    
    volumeSlider.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.updateVolumeIcon(e.target.value);
    });
    
    volumeBtn.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.updateVolumeIcon(this.video.muted ? 0 : this.video.volume);
      if (this.video.muted) volumeSlider.value = 0;
      else volumeSlider.value = this.video.volume;
    });

    // Fullscreen
    const fullscreenBtn = this.container.querySelector('#fullscreenBtn');
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // PIP
    const pipBtn = this.container.querySelector('#pipBtn');
    pipBtn.addEventListener('click', () => this.togglePip());

    // Record
    const recordBtn = this.container.querySelector('#recordBtn');
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.toggleRecord());
    }

    // Record Pause
    const recPauseBtn = this.container.querySelector('#recPauseBtn');
    if (recPauseBtn) {
      recPauseBtn.addEventListener('click', () => this.togglePauseRecord());
    }

    // Video Events
    this.video.addEventListener('play', () => {
        this.updatePlayIcon(true);
        // Hide loader via global or event
        const loader = document.querySelector('.loader');
        if (loader) loader.classList.remove('show');
    });
    this.video.addEventListener('pause', () => this.updatePlayIcon(false));
    this.video.addEventListener('volumechange', () => {
        volumeSlider.value = this.video.volume;
        this.updateVolumeIcon(this.video.muted ? 0 : this.video.volume);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.video.volume = Math.min(1, this.video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.video.volume = Math.max(0, this.video.volume - 0.1);
          break;
      }
    });
  },

  setupAutoHide() {
    const resetTimer = () => {
      this.overlay.classList.remove('hidden');
      this.container.style.cursor = 'default';
      
      // Show mobile menu button when controls are visible
      const mobileMenuBtn = document.querySelector('#mobileMenuBtn');
      if (mobileMenuBtn) mobileMenuBtn.style.opacity = '1';

      clearTimeout(this.hideTimer);
      
      if (!this.video.paused) {
        this.hideTimer = setTimeout(() => {
          this.overlay.classList.add('hidden');
          this.container.style.cursor = 'none';
          
          // Hide mobile menu button when controls are hidden
          if (mobileMenuBtn) mobileMenuBtn.style.opacity = '0';
        }, 3000);
      }
    };

    this.container.addEventListener('mousemove', resetTimer);
    this.container.addEventListener('click', resetTimer);
    this.container.addEventListener('touchstart', resetTimer, { passive: true }); // Add touch support
    
    this.video.addEventListener('pause', () => {
        clearTimeout(this.hideTimer);
        this.overlay.classList.remove('hidden');
        const mobileMenuBtn = document.querySelector('#mobileMenuBtn');
        if (mobileMenuBtn) mobileMenuBtn.style.opacity = '1';
    });
    this.video.addEventListener('play', resetTimer);
  },

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  },

  async togglePip() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await this.video.requestPictureInPicture();
    }
  },

  toggleRecord() {
    const recordBtn = this.container.querySelector('#recordBtn');
    const recPauseBtn = this.container.querySelector('#recPauseBtn');

    if (this.isRecording) {
      // Stop recording
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.isRecording = false;
      this.isPaused = false;
      this.stopRecordTimer();
      recordBtn.classList.remove('recording');

      // Remove page guard
      if (this._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        this._beforeUnloadHandler = null;
      }

      // Hide pause button
      if (recPauseBtn) recPauseBtn.style.display = 'none';
      
      const overlay = this.container.querySelector('#recOverlay');
      if (overlay) overlay.classList.add('hidden');
      
      return;
    }
    
    // Start recording
    try {
      let stream;
      if (this.video.captureStream) {
        stream = this.video.captureStream();
      } else if (this.video.mozCaptureStream) {
        stream = this.video.mozCaptureStream();
      } else {
        throw new Error('Capture API bu brauzerda ishlamaydi.');
      }
      
      this.recordedChunks = [];
      
      // Determine the best MIME type for high-quality ".mp4" goal
      let mimeType = 'video/webm'; // fallback
      let ext = 'mp4'; // Default to mp4 as requested
      
      if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
        mimeType = 'video/webm; codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
        mimeType = 'video/webm; codecs=vp9,opus';
      }

      const options = { 
        mimeType: mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps for high quality
      };

      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length === 0) {
           alert("Xatolik: Kanalda xavfsizlik (CORS/DRM) cheklovlari bo'lgani uchun uni yozib olish imkoni yo'q.");
           return;
        }
        
        let targetType = mimeType;
        if (!mimeType.includes('mp4')) {
          // If we saved in webm (with h264), we can force the blob type
          // so that VLC / OS treats it as an H.264 video.
          targetType = 'video/mp4';
        }
        
        const blob = new Blob(this.recordedChunks, { type: targetType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Generate nice filename: ChannelName_YYYY-MM-DD_HH-MM.mp4
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
        
        const nameDisplay = document.querySelector('#channelNameDisplay');
        let safeChannelName = nameDisplay ? nameDisplay.textContent.trim() : 'Live';
        // Remove invalid OS characters and spaces
        safeChannelName = safeChannelName.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_');
        if (safeChannelName === 'Kanal_tanlanmagan' || !safeChannelName) safeChannelName = 'Live_Stream';
        
        a.download = `${safeChannelName}_${dateString}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      };
      
      this.mediaRecorder.start(1000); // 1s chunks
      this.isRecording = true;
      this.isPaused = false;
      recordBtn.classList.add('recording');
      
      const overlay = this.container.querySelector('#recOverlay');
      if (overlay) overlay.classList.remove('hidden');
      this.startRecordTimer();

      // Show pause button with pop-in animation
      const recPauseBtn = this.container.querySelector('#recPauseBtn');
      if (recPauseBtn) {
        recPauseBtn.style.display = 'flex';
        recPauseBtn.classList.remove('paused');
        recPauseBtn.style.animation = 'none';
        recPauseBtn.offsetHeight;
        recPauseBtn.style.animation = '';
      }

      // Register page-unload auto-save guard
      this._beforeUnloadHandler = (e) => {
        // Auto-save recorded chunks before page dies
        this.autoSaveRecording();
        e.preventDefault();
        e.returnValue = "Yozib olish jarayoni davom etyapti. Sahifani yopsangiz video saqlanadi.";
        return e.returnValue;
      };
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
      
    } catch (err) {
      console.error('Recording Error:', err);
      alert("Bu kanalni yozib olish amalga oshmadi. (CORS yoki DRM cheklovlari mavjud bo'lishi mumkin)");
      this.isRecording = false;
      this.isPaused = false;
      this.stopRecordTimer();
      recordBtn.classList.remove('recording');
      
      const overlay = this.container.querySelector('#recOverlay');
      if (overlay) overlay.classList.add('hidden');
      
      const recPauseBtn = this.container.querySelector('#recPauseBtn');
      if (recPauseBtn) recPauseBtn.style.display = 'none';
    }
  },

  startRecordTimer() {
    this.recordSeconds = 0;
    this.updateRecordTimerUI();
    this.recordTimer = setInterval(() => {
      if (!this.isPaused) {
        this.recordSeconds++;
        this.updateRecordTimerUI();
      }
    }, 1000);
  },

  stopRecordTimer() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
  },

  /**
   * Auto-saves whatever has been recorded so far.
   * Called on beforeunload or channel switch during recording.
   */
  autoSaveRecording() {
    if (!this.isRecording) return;

    // Stop the recorder first (this fires onstop which handles download)
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.isRecording = false;
    this.isPaused = false;
    this.stopRecordTimer();

    // Remove beforeunload guard
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._beforeUnloadHandler = null;
    }

    // Update UI
    const recordBtn = this.container.querySelector('#recordBtn');
    if (recordBtn) recordBtn.classList.remove('recording');
    const recPauseBtn = this.container.querySelector('#recPauseBtn');
    if (recPauseBtn) recPauseBtn.style.display = 'none';
    const overlay = this.container.querySelector('#recOverlay');
    if (overlay) overlay.classList.add('hidden');
  },

  /**
   * Call this before switching channels.
   * If recording is active, warn user and auto-save.
   * Returns true if it's safe to proceed with channel switch.
   */
  channelSwitchGuard() {
    if (!this.isRecording) return true;

    // Auto-save then allow switch
    this.autoSaveRecording();
    return true;
  },

  updateRecordTimerUI() {
    const timerElem = this.container.querySelector('#recTimer');
    if (!timerElem) return;
    const m = Math.floor(this.recordSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordSeconds % 60).toString().padStart(2, '0');
    timerElem.textContent = this.isPaused ? `${m}:${s} ⏸` : `${m}:${s}`;
  },

  togglePauseRecord() {
    if (!this.isRecording || !this.mediaRecorder) return;
    const recPauseBtn = this.container.querySelector('#recPauseBtn');
    const overlay = this.container.querySelector('#recOverlay');
    const dot = this.container.querySelector('.rec-dot');

    if (this.mediaRecorder.state === 'recording') {
      // Pause
      this.mediaRecorder.pause();
      this.isPaused = true;
      if (recPauseBtn) {
        recPauseBtn.classList.add('paused');
        recPauseBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        recPauseBtn.title = "Davom ettirish / Resume";
      }
      if (dot) dot.style.animationPlayState = 'paused';
      this.updateRecordTimerUI();
    } else if (this.mediaRecorder.state === 'paused') {
      // Resume
      this.mediaRecorder.resume();
      this.isPaused = false;
      if (recPauseBtn) {
        recPauseBtn.classList.remove('paused');
        recPauseBtn.innerHTML = `<svg id="recPauseIcon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        recPauseBtn.title = "Yozishni to'xtatish / Pause";
      }
      if (dot) dot.style.animationPlayState = 'running';
    }
  },

  updatePlayIcon(isPlaying) {
    const btn = this.container.querySelector('#playBtn');
    // Simple SVG replacement
    if (isPlaying) {
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    } else {
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  },

  updateVolumeIcon(vol) {
    const btn = this.container.querySelector('#volumeBtn');
    let icon = '';
    if (vol === 0) {
        // Mute
        icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
    } else if (vol < 0.5) {
        // Low
        icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    } else {
        // High
        icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    }
    btn.innerHTML = icon;
  }
};
