import { load as dsLoad, apply as dsApply } from './data-star.js';
/*
  App overview
  - Legacy reactivity: Datastar powers visibility/text/disabled bindings via data-* attributes.
  - New progressive enhancements: htmx loads ad fragments; Alpine.js is planned for future state.
  - Media pipeline: getUserMedia + MediaRecorder manage video/audio; SR (Web Speech) drives voice scroll.
  - Ads: enableAds() primes AdSense containers and removes dev-only ad-off class.
*/

// Datastar bridge: capture mergePatch/root and add simple attribute plugins
const DS = { mergePatch: () => { }, root: null };
dsLoad({
    type: 'attribute',
    name: 'bootstrap',
    onGlobalInit(ctx) {
        DS.mergePatch = ctx.mergePatch;
        DS.root = ctx.root;
        DS.effect = ctx.effect;
    },
    onLoad() { return () => { }; }
});

// data-show: toggles .hidden based on expression truthiness
dsLoad({
    type: 'attribute',
    name: 'show',
    valReq: 'must',
    onLoad(ctx) {
        const fn = ctx.rx;
        const el = ctx.el;
        const stop = ctx.effect(() => {
            try { el.classList.toggle('hidden', !fn()); } catch (_) { }
        });
        return () => stop?.();
    }
});

// data-disabled: toggles disabled property/attribute
dsLoad({
    type: 'attribute',
    name: 'disabled',
    valReq: 'must',
    onLoad(ctx) {
        const fn = ctx.rx;
        const el = ctx.el;
        const stop = ctx.effect(() => {
            try {
                const v = !!fn();
                if ('disabled' in el) el.disabled = v;
                if (v) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
            } catch (_) { }
        });
        return () => stop?.();
    }
});

// Ensure Datastar scans with our newly registered plugins
dsApply();

// data-text: sets textContent from expression
dsLoad({
    type: 'attribute',
    name: 'text',
    valReq: 'must',
    onLoad(ctx) {
        const fn = ctx.rx;
        const el = ctx.el;
        const stop = ctx.effect(() => {
            try { el.textContent = String(fn() ?? ''); } catch (_) { }
        });
        return () => stop?.();
    }
});

// Re-apply to activate newly registered attributes
dsApply();

// Main application controller for the teleprompter UI.
class TeleprompterApp {
    constructor() {

        // Boot sequence: cache DOM, init state, bind events, load saved state, then PWA hooks
        this.initializeDOMElements();
        this.initializeAppState();
        this.registerEventListeners();
        this.loadInitialState();
        this.initPWA();
        // Ads always enabled; load provider scripts on init.
        this.enableAds();
        this.onOutsideModalClick = (event) => {
            if (!this.state.modalType) return;
            if (this.dom.modalContent.contains(event.target)) return;
            this.showModal(null);
        };
        // Initialize tooltips if tippy is available
        try {
            if (window.tippy) window.tippy('[data-tippy-content]', {
                theme: 'light',
                delay: [300, 0],
                touch: ['hold', 400],
                allowHTML: false,
            });
        } catch (_) { }
    }

    /**
     * Returns a friendly first‑time script used when the user
     * has no saved script. This improves first‑run experience.
     */
    getDefaultScript() {
        return [
            'Welcome to VocalScroll.',
            '',
            'This is a sample script to help you get started.',
            'Speak at a natural pace and watch the words highlight.',
            '',
            'Tips:',
            "- Use Timed scroll if voice isn't available.",
            '- Adjust font size and mirror if needed.',
            '- Click Start to begin recording and Stop to finish.'
        ].join('\n');
    }

    // Debug: start SR without recording, for isolation
    debugStartSR() {
        this.log && this.log('debugStartSR()');
        if (!this.recognition) this.initSpeechRecognition();
        if (!this.recognition) return;
        if (!this.state.isSpeechRecognitionActive) this.startSpeechRecognition();
    }

    // Cache DOM references used throughout the app
    initializeDOMElements() {
        // Main script and display
        this.dom = {
            scriptInput: document.getElementById('script-input'),
            teleprompterDisplay: document.getElementById('teleprompter-display'),
            teleprompterContent: document.getElementById('teleprompter-content'),

            // Controls
            startStopBtn: document.getElementById('start-stop-btn'),
            resyncBtn: document.getElementById('resync-btn'),
            scrollModeSelect: document.getElementById('scroll-mode'),
            speedControl: document.getElementById('speed-control'),
            speedInput: document.getElementById('speed-input'),
            speedIncBtn: document.getElementById('speed-inc'),
            speedDecBtn: document.getElementById('speed-dec'),
            fontSizeInput: document.getElementById('font-size-input'),
            fontIncBtn: document.getElementById('font-inc'),
            fontDecBtn: document.getElementById('font-dec'),
            mirrorToggleBtn: document.getElementById('mirror-toggle'),
            micSelect: document.getElementById('mic-select'),
            reloadDevicesBtn: document.getElementById('reload-devices-btn'),
            recordMeToggleBtn: document.getElementById('record-me-toggle'),
            // toggleEditor removed

            // Video and Recording
            videoPreviewContainer: document.getElementById('video-preview-container'),
            videoPreview: document.getElementById('video-preview'),
            micLevel: document.getElementById('mic-level'),
            micFill: document.querySelector('#mic-level .mic-fill'),
            showRecordingsBtn: document.getElementById('show-recordings-btn'),
            recordingsList: document.getElementById('recordings-list'),

            // Panels and Modals
            scriptEditorPanel: document.getElementById('script-editor-panel'),
            modalOverlay: document.getElementById('modal-overlay'),
            modalContent: document.getElementById('modal-content'),
            closeModalBtn: document.getElementById('close-modal-btn'),
            micHelpLink: document.getElementById('mic-help-link'),

            // Overlays and manual controls
            // countdown removed
            manualControls: document.getElementById('manual-controls'),
            scrollUpBtn: document.getElementById('scroll-up'),
            scrollDownBtn: document.getElementById('scroll-down'),

            // Debug elements (visible when debug enabled)
            debugPanel: document.getElementById('debug-panel'),
            srTestStart: document.getElementById('sr-test-start'),
            srTestStop: document.getElementById('sr-test-stop'),
        };
        if (this.dom.videoPreview) {
            this.dom.videoPreview.addEventListener('loadedmetadata', () => {
                this.applyPIPAspectFromVideo();
            });
        }

        // Derived references
        this.dom.scrollControl = this.dom.scrollModeSelect ? this.dom.scrollModeSelect.closest('.control') : null;
    }

    // Initialize state, platform flags, Datastar store, and SR
    initializeAppState() {
        const hideLanding = localStorage.getItem('hideLanding') === 'true';
        this.state = {
            // Replaces isRecording for more granular control
            status: hideLanding ? 'ready' : 'idle', // 'idle', 'starting', 'recording', 'ready'
            isSpeechRecognitionActive: false,
            isResyncing: false,
            fontSize: 48,
            scrollSpeed: 20,
            isMirrored: false,
            recordMe: true,
            autoScrollInterval: null,
            autoScrollRemainder: 0,
            lastMatchIndex: -1,
            wordElements: [],
            significantScriptWords: [],
            sessionRecordings: [],
            mediaRecorder: null,
            stream: null,
            recordedChunks: [],
            srActive: false,
            srResultSeen: false,
            srNoResultCycles: 0,
            videoOnlyForVoice: false,
            noVideo: false,
            noRecord: false,
            currentHasVideo: false,
            // Matching heuristics
            matchConfig: {
                maxSearchAhead: 15, // how many significant words ahead to search
                backtrackAllowance: 2, // allow slight backtracking to recover
                maxJumpLen1: 5, // only allow 1-word match to jump this many ahead (significant words)
                minAcceptLenForLongJump: 2, // require >= this length to allow long jumps
                maxPhraseLen: 5, // consider up to last N transcript words
                maxForwardOriginalWords: 14, // allow skipping up to this many original words forward
                maxJumpLen1Original: 6 // for len=1 matches, tighter original-word cap
            },
        };
        this.recognition = null;
        const ua = navigator.userAgent || '';
        this.isAndroid = /android/i.test(ua);
        this.isIOS = /iphone|ipad|ipod/i.test(ua);
        this.isMobileUA = /android|iphone|ipad|ipod|mobile/i.test(ua);
        // Optional flags via URL/localStorage
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get('videoonly') === '1' || localStorage.getItem('vsVideoOnly') === '1') {
                this.state.videoOnlyForVoice = true;
            }
            if (url.searchParams.get('novideo') === '1' || localStorage.getItem('vsNoVideo') === '1') {
                this.state.noVideo = true;
            }
            if (url.searchParams.get('norecord') === '1' || localStorage.getItem('vsNoRecord') === '1') {
                this.state.noRecord = true;
            }
            if (this.log) this.log('flags', { videoOnlyForVoice: this.state.videoOnlyForVoice, noVideo: this.state.noVideo, noRecord: this.state.noRecord });
        } catch (_) { }
        this.initSpeechRecognition();

        // Common stop words for significance filtering (lowercase, normalized)
        this.stopWords = new Set([
            'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in',
            'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been'
        ]);

        // Initialize Datastar store
        DS.mergePatch({
            settings: {
                script: '',
                fontSize: 48,
                isMirrored: false,
                scrollMode: 'voice',
                scrollSpeed: 20,
                recordMe: true,
            },
            ui: {
                status: hideLanding ? 'ready' : 'idle',
                isMobile: this.isMobileUA,
                isDesktop: !this.isMobileUA,
                isResyncing: false,
                recordingsCount: 0,
                year: new Date().getFullYear(),
                debug: false,
                recStatus: 'idle',
                recError: '',
                modalType: '',
                isDesktop: !this.isMobileUA,
                countdown: 0
            }
        });
    }

    // Wire all UI controls, panel toggles, debug hooks, and gestures
    registerEventListeners() {
        // Main actions
        if (this.dom.startStopBtn) this.dom.startStopBtn.addEventListener('click', () => {
            if (this.debug) this.log('Start/Stop clicked', { mode: this.dom.scrollModeSelect.value, isMobile: this.isMobileUA });
            this.toggleRecording();
        });
        const ctaLaunch = document.getElementById('cta-launch');
        if (ctaLaunch) {
            ctaLaunch.addEventListener('click', (e) => {
                e.preventDefault();
                this.state.status = 'ready';
                localStorage.setItem('hideLanding', 'true');
                // Synchronize with Datastar store
                if (typeof DS !== 'undefined' && DS.mergePatch) {
                    DS.mergePatch({ ui: { status: 'ready' } });
                }
                // Manual fallback for immediate UI swap
                document.getElementById('landing-hero')?.classList.add('hidden');
                document.getElementById('script-editor-panel')?.classList.remove('hidden');
                document.getElementById('teleprompter-container')?.classList.remove('hidden');
                this.updateUIMode();
            });
        }
        if (this.dom.resyncBtn) this.dom.resyncBtn.addEventListener('click', () => this.enterResyncMode());

        // Script and display controls
        if (this.dom.scriptInput) this.dom.scriptInput.addEventListener('input', () => this.updateScript());
        if (this.dom.fontSizeInput) this.dom.fontSizeInput.addEventListener('change', (e) => { this.updateFontSize(e.target.value); this.saveSettings(); });
        if (this.dom.fontIncBtn) this.dom.fontIncBtn.addEventListener('click', () => { this.adjustFontSize(4); });
        if (this.dom.fontDecBtn) this.dom.fontDecBtn.addEventListener('click', () => { this.adjustFontSize(-4); });
        // margin slider removed
        if (this.dom.mirrorToggleBtn) this.dom.mirrorToggleBtn.addEventListener('click', () => { this.toggleMirrorText(!this.state.isMirrored); this.saveSettings(); });
        const recordBtn = document.getElementById('record-me-toggle');
        if (recordBtn) recordBtn.addEventListener('click', () => {
            this.state.recordMe = !this.state.recordMe;
            // When disabling Record Me, also mark noRecord to skip MR
            this.state.noRecord = !this.state.recordMe;
            this.saveSettings();
            try { recordBtn.setAttribute('aria-pressed', this.state.recordMe ? 'true' : 'false'); } catch (_) { }
            // Update PIP visibility
            this.updateUIMode();
        });
        const resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            try {
                localStorage.clear();
                localStorage.removeItem('hideLanding');
            } catch (_) { }
            location.reload();
        });

        // Scroll mode
        if (this.dom.scrollModeSelect) this.dom.scrollModeSelect.addEventListener('change', (e) => {
            if (this.isMobileUA && e.target.value !== 'timed') {
                e.target.value = 'timed';
            }
            this.handleScrollModeChange(e.target.value);
            this.saveSettings();
        });
        if (this.dom.speedInput) this.dom.speedInput.addEventListener('change', (e) => { this.updateScrollSpeed(e.target.value); this.saveSettings(); });
        if (this.dom.speedIncBtn) this.dom.speedIncBtn.addEventListener('click', () => { this.adjustScrollSpeed(10); this.saveSettings(); });
        if (this.dom.speedDecBtn) this.dom.speedDecBtn.addEventListener('click', () => { this.adjustScrollSpeed(-10); this.saveSettings(); });

        // Mic selection (affects recording audio; SR uses browser default)
        if (this.dom.micSelect) {
            this.dom.micSelect.addEventListener('change', () => {
                const id = this.dom.micSelect.value || '';
                localStorage.setItem('preferredMicId', id);
            });
        }
        if (this.dom.reloadDevicesBtn) {
            this.dom.reloadDevicesBtn.addEventListener('click', async () => {
                try {
                    // Prompt for mic permission so labels populate
                    const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    tmp.getTracks().forEach(t => t.stop());
                } catch (_) { }
                this.populateMicList();
            });
        }

        // Panel toggles
        // editor toggle removed
        if (this.dom.showRecordingsBtn) this.dom.showRecordingsBtn.addEventListener('click', () => this.showModal('videos'));

        // Manual scroll
        this.dom.scrollUpBtn.addEventListener('click', () => this.dom.teleprompterDisplay.scrollTop -= 50);
        this.dom.scrollDownBtn.addEventListener('click', () => this.dom.teleprompterDisplay.scrollTop += 50);


        if (this.dom.closeModalBtn) this.dom.closeModalBtn.addEventListener('click', () => this.showModal(null));

        // Draggable video
        this.makeElementDraggable(this.dom.videoPreviewContainer);

        // No custom PWA install banner; relying on native install dialogs only

        // Debug toggles
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
                this.debug = !this.debug;
                localStorage.setItem('vsDebug', this.debug ? '1' : '0');
                DS.mergePatch({ ui: { debug: !!this.debug } });
                this.log('Debug toggled', { debug: this.debug });
            }
        });
        if (this.dom.srTestStart) this.dom.srTestStart.addEventListener('click', () => this.debugStartSR());
        if (this.dom.srTestStop) this.dom.srTestStop.addEventListener('click', () => this.stopSpeechRecognition());
    }

    /**
     * Loads saved settings, applies mobile defaults, ensures a default script
     * for first run, and syncs the Datastar store with current UI state.
     */
    loadInitialState() {
        const settings = JSON.parse(localStorage.getItem('teleprompterSettings'));
        if (settings) {
            this.dom.scriptInput.value = settings.script || '';
            this.updateFontSize(settings.fontSize || 48);
            this.dom.fontSizeInput.value = settings.fontSize || 48;
            // margin removed
            this.toggleMirrorText(settings.isMirrored || false);
            // migrate old 'auto' to new 'timed'
            let mode = (settings.scrollMode === 'auto') ? 'timed' : (settings.scrollMode || 'voice');
            if (this.isMobileUA) mode = 'timed';
            this.dom.scrollModeSelect.value = mode;
            this.handleScrollModeChange(mode);
            const storedSpeed = Number.parseInt(settings.scrollSpeed, 10);
            const fallbackSpeed = Number.isFinite(storedSpeed) ? storedSpeed : 20;
            this.updateScrollSpeed(fallbackSpeed);
            // Record Me toggle
            this.state.recordMe = (settings.recordMe === undefined) ? true : !!settings.recordMe;
            this.state.noRecord = !this.state.recordMe;
            try {
                const recBtn = document.getElementById('record-me-toggle');
                if (recBtn) recBtn.setAttribute('aria-pressed', this.state.recordMe ? 'true' : 'false');
                const mirBtn = this.dom.mirrorToggleBtn;
                if (mirBtn) mirBtn.setAttribute('aria-pressed', this.state.isMirrored ? 'true' : 'false');
            } catch (_) { }
            // editor collapsed removed
        } else {
            // First-time load: pick mobile-friendly default font
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 899px)').matches;
            const defaultFont = isMobile ? 24 : 48;
            this.updateFontSize(defaultFont);
            if (this.dom.fontSizeInput) this.dom.fontSizeInput.value = defaultFont;
            this.updateScrollSpeed(20);
            // Ensure mirror is explicitly off on first visit
            this.toggleMirrorText(false);
            // Prefill a friendly sample script for first-time users
            this.dom.scriptInput.value = this.getDefaultScript();
        }
        // Fallback: if script is empty, provide a default
        if (!this.dom.scriptInput.value || !this.dom.scriptInput.value.trim()) {
            this.dom.scriptInput.value = this.getDefaultScript();
        }
        // On mobile, hide the scroll mode control and disable Voice option
        if (this.isMobileUA) {
            try { this.dom.scrollModeSelect.querySelector('option[value="voice"]').disabled = true; } catch (_) { }
            if (this.dom.scrollControl) this.dom.scrollControl.style.display = 'none';
        }

        this.updateScript();
        this.renderRecordings();

        // Sync Datastar store with current settings
        DS.mergePatch({
            ui: { status: this.state.status },
            settings: {
                script: this.dom.scriptInput.value,
                fontSize: this.state.fontSize,
                isMirrored: this.state.isMirrored,
                scrollMode: this.dom.scrollModeSelect.value,
                scrollSpeed: this.state.scrollSpeed,
                recordMe: this.state.recordMe,
                // editorCollapsed removed
            }
        });

        // Populate microphones list
        this.populateMicList();

        // Populate microphones list
        this.populateMicList();

        // Honor modal query params when arriving from external pages
        this.handleModalQuery();
    }

    initPWA() {
        // Service worker registration; rely on native PWA install UI only
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(() => { });
            });
        }

        // No custom install banner; rely on native browser UI only
    }

    enableAds() {
        try { document.body.classList.remove('ads-off'); } catch (_) { }
        // Update mobile panel visibility hint for assistive tech
        try {
            const mobilePanel = document.getElementById('ad-panel-mobile');
            if (mobilePanel) {
                const isMobile = window.matchMedia && window.matchMedia('(max-width: 899px)').matches;
                mobilePanel.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
            }
        } catch (_) { }
        // Resolve logical placement keys to live slot IDs before triggering AdSense
        const slotMap = window.VS_AD_SLOTS || {};
        document.querySelectorAll('.adsbygoogle').forEach((el) => {
            if (!el.dataset.adSlot) {
                const slotKey = el.dataset.vsSlot || el.getAttribute('data-ad-id');
                if (slotKey && slotMap[slotKey]) {
                    el.dataset.adSlot = slotMap[slotKey];
                }
            }
        });

        window.adsbygoogle = window.adsbygoogle || [];
        document.querySelectorAll('.adsbygoogle[data-ad-slot]').forEach((el) => {
            if (el.dataset.loaded === 'true') return;
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
                el.dataset.loaded = 'true';
            } catch (_) { }
        });
    }


    /**
     * Persists current settings to localStorage and the DS store.
     */
    saveSettings() {
        const settings = {
            script: this.dom.scriptInput.value,
            fontSize: this.state.fontSize,
            isMirrored: this.state.isMirrored,
            scrollMode: this.dom.scrollModeSelect.value,
            scrollSpeed: this.state.scrollSpeed,
            recordMe: this.state.recordMe,
            // editorCollapsed removed
        };
        localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
        DS.mergePatch({
            settings: {
                script: settings.script,
                fontSize: parseInt(settings.fontSize, 10),
                isMirrored: settings.isMirrored,
                scrollMode: settings.scrollMode,
                scrollSpeed: parseInt(settings.scrollSpeed, 10),
                recordMe: !!settings.recordMe,
                // editorCollapsed removed
            }
        });
    }

    // --- Feature Implementations ---

    /**
     * Tokenizes the editor text and rebuilds the teleprompter content
     * safely using text nodes (no innerHTML) with indexed <span.word> for highlighting.
     */
    updateScript() {
        const scriptText = this.dom.scriptInput.value;
        this.saveSettings();

        const tokens = scriptText.split(/(\s+)/);
        // Assign contiguous indices only to actual words (exclude whitespace tokens)
        let wordIndex = 0;
        const frag = document.createDocumentFragment();
        for (const tok of tokens) {
            if (tok.trim().length > 0) {
                const span = document.createElement('span');
                span.className = 'word';
                span.dataset.index = String(wordIndex);
                span.textContent = tok;
                frag.appendChild(span);
                wordIndex += 1;
            } else {
                frag.appendChild(document.createTextNode(tok));
            }
        }
        this.dom.teleprompterContent.replaceChildren(frag);

        this.state.wordElements = Array.from(this.dom.teleprompterContent.querySelectorAll('.word'));
        this.state.significantScriptWords = [];
        this.state.wordElements.forEach(el => {
            const word = this.normalizeWord(el.textContent);
            if (word && !this.stopWords.has(word)) {
                this.state.significantScriptWords.push({ word, originalIndex: parseInt(el.dataset.index, 10) });
            }
        });
        if (this.log) this.log('updateScript()', {
            words: this.state.wordElements.length,
            sigWords: this.state.significantScriptWords.length,
            sample: this.state.significantScriptWords.slice(0, 12).map(w => w.word)
        });
        this.resetWordHighlighting();
    }

    normalizeWord(word) {
        // Lowercase and strip most punctuation/symbols for robust matching
        return word
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'“”‘’?¿¡!<>]/g, "");
    }

    updateFontSize(size) {
        this.state.fontSize = parseInt(size, 10);
        this.dom.teleprompterContent.style.fontSize = `${this.state.fontSize}px`;
        if (this.dom.fontSizeInput) this.dom.fontSizeInput.value = this.state.fontSize;
        DS.mergePatch({ settings: { fontSize: this.state.fontSize } });
    }

    adjustFontSize(delta) {
        const min = parseInt(this.dom.fontSizeInput?.min || '12', 10);
        const max = parseInt(this.dom.fontSizeInput?.max || '120', 10);
        let next = this.state.fontSize + delta;
        next = Math.max(min, Math.min(max, next));
        this.updateFontSize(next);
        this.saveSettings();
    }

    /** Toggles a horizontal mirror transform for teleprompter content. */
    toggleMirrorText(isMirrored) {
        this.state.isMirrored = !!isMirrored;
        this.dom.teleprompterContent.style.transform = this.state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
        // Mirror preview video together with text
        try { if (this.dom.videoPreview) this.dom.videoPreview.style.transform = this.state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)'; } catch (_) { }
        DS.mergePatch({ settings: { isMirrored: this.state.isMirrored } });
        try { if (this.dom.mirrorToggleBtn) this.dom.mirrorToggleBtn.setAttribute('aria-pressed', this.state.isMirrored ? 'true' : 'false'); } catch (_) { }
    }

    /**
     * Applies aspect-aware sizing to the PIP container using camera dimensions.
     * Favors a wider footprint for landscape feeds while clamping extremes.
     */
    updatePIPAspect(width, height) {
        if (!this.dom.videoPreviewContainer) return;
        const w = Number(width) || 0;
        const h = Number(height) || 0;
        if (!(w > 0 && h > 0)) return;

        const container = this.dom.videoPreviewContainer;
        const ratio = w / h;
        const isLandscape = ratio >= 1;
        const minWidth = 160;
        const maxWidth = 360;
        const minHeight = 120;
        const maxHeight = 360;

        let targetWidth = isLandscape ? 280 : 200;
        targetWidth = Math.max(minWidth, Math.min(maxWidth, targetWidth));
        let targetHeight = targetWidth / ratio;

        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = targetHeight * ratio;
        }
        if (targetHeight < minHeight) {
            targetHeight = minHeight;
            targetWidth = targetHeight * ratio;
        }
        if (targetWidth > maxWidth) {
            targetWidth = maxWidth;
            targetHeight = targetWidth / ratio;
        }
        if (targetWidth < minWidth) {
            targetWidth = minWidth;
            targetHeight = targetWidth / ratio;
        }

        try { container.style.aspectRatio = `${w} / ${h}`; } catch (_) { }
        container.style.width = `${Math.round(targetWidth)}px`;
        container.style.height = `${Math.round(targetHeight)}px`;
        if (this.dom.videoPreview) {
            try { this.dom.videoPreview.style.aspectRatio = `${w} / ${h}`; } catch (_) { }
        }
        this.lastPipRatio = ratio;
    }

    applyPIPAspectFromTrack(track) {
        try {
            const settings = track?.getSettings?.();
            if (settings?.width && settings?.height) {
                this.updatePIPAspect(settings.width, settings.height);
                return;
            }
        } catch (_) { }
        this.applyPIPAspectFromVideo();
    }

    applyPIPAspectFromVideo() {
        const video = this.dom.videoPreview;
        if (!video) return;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) this.updatePIPAspect(vw, vh);
    }

    /**
     * Opens/closes the recordings in-flow sidebar.
     * Closes the modal to avoid double overlays; handles mobile panel swap.
     */
    showRecordingsSidebar(show) { /* no-op: recordings now shown in modal */
        try { this.dom.showRecordingsBtn.setAttribute('aria-expanded', show ? 'true' : 'false'); } catch (_) { }
    }

    /**
     * Unified modal for Privacy and Mic Help.
     * - type=null closes the modal
     * - type='privacy' | 'mic' opens and switches content via DS ui.modalType
     */
    showModal(type) {
        if (!type) {
            this.state.modalType = '';
            DS.mergePatch({ ui: { modalType: '' } });
            // Datastar handles class toggling via data-class-open
            try { this.dom.showRecordingsBtn.setAttribute('aria-expanded', 'false'); } catch (_) { }
            document.removeEventListener('click', this.onOutsideModalClick, true);
            return;
        }
        this.state.modalType = type;
        DS.mergePatch({ ui: { modalType: type } });
        document.removeEventListener('click', this.onOutsideModalClick, true);
        document.addEventListener('click', this.onOutsideModalClick, true);
        if (type === 'videos') { try { this.dom.showRecordingsBtn.setAttribute('aria-expanded', 'true'); } catch (_) { } }

        // Refresh recordings list when opening videos; clear when switching away
        if (type === 'videos') {
            this.renderRecordings();
        } else if (this.dom.recordingsList) {
            this.dom.recordingsList.innerHTML = '';
        }
    }

    handleModalQuery() {
        try {
            const url = new URL(window.location.href);
            const modalParam = url.searchParams.get('modal');
            if (!modalParam) return;
            const normalized = modalParam.toLowerCase();
            const map = { videos: 'videos' };
            const target = map[normalized];
            if (target) {
                this.showModal(target);
                url.searchParams.delete('modal');
                const params = url.searchParams.toString();
                const cleaned = url.pathname + (params ? `?${params}` : '') + url.hash;
                window.history.replaceState({}, document.title, cleaned);
            }
        } catch (_) { }
    }

    async populateMicList() {
        if (!this.dom.micSelect || !navigator.mediaDevices?.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const mics = devices.filter(d => d.kind === 'audioinput');
            const sel = this.dom.micSelect;
            const saved = localStorage.getItem('preferredMicId') || '';
            // Clear existing (keep first default option)
            sel.length = 1;
            for (const d of mics) {
                const opt = document.createElement('option');
                opt.value = d.deviceId || '';
                opt.textContent = d.label || `Microphone (${d.deviceId.slice(0, 6)}…)`;
                sel.appendChild(opt);
            }
            sel.value = saved;
        } catch (_) { }
    }

    /**
     * Switches between 'voice' and 'timed' modes.
     * Enforces 'timed' on mobile and toggles the speed control visibility.
     */
    handleScrollModeChange(mode) {
        // Hard-enforce Timed mode on mobile UAs
        if (this.isMobileUA && mode !== 'timed') {
            mode = 'timed';
            if (this.dom.scrollModeSelect) this.dom.scrollModeSelect.value = 'timed';
        }
        if (mode === 'timed') {
            if (this.state.status === 'recording') this.startAutoScroll();
        } else { // voice
            if (this.state.status === 'recording') this.stopAutoScroll();
        }
        DS.mergePatch({ settings: { scrollMode: mode } });
        // Fallback manual toggle to ensure visibility in case bindings lag
        if (this.dom.speedControl) this.dom.speedControl.classList.toggle('hidden', mode !== 'timed');
    }

    updateScrollSpeed(speed) {
        const input = this.dom?.speedInput;
        const min = Number.parseInt(input?.min || '10', 10);
        const max = Number.parseInt(input?.max || '100', 10);
        let next = Number.parseInt(speed, 10);
        if (!Number.isFinite(next)) next = this.state.scrollSpeed ?? min;
        next = Math.max(min, Math.min(max, next));

        this.state.scrollSpeed = next;
        if (input) {
            try { input.value = String(this.state.scrollSpeed); } catch (_) { }
        }
        if (this.state.autoScrollInterval) {
            this.stopAutoScroll();
            this.startAutoScroll();
        }
    }

    adjustScrollSpeed(delta) {
        const min = parseInt(this.dom.speedInput?.min || '10', 10);
        const max = parseInt(this.dom.speedInput?.max || '400', 10);
        const current = Number.isFinite(this.state.scrollSpeed) ? this.state.scrollSpeed : min;
        let next = current + delta;
        next = Math.max(min, Math.min(max, next));
        this.updateScrollSpeed(next);
    }

    startAutoScroll() {
        this.stopAutoScroll();
        const s = this.state.scrollSpeed;
        this.state.autoScrollRemainder = 0;
        // Ensure programmatic scrolling is immediate (not smoothed) for consistent speed
        try { this.dom.teleprompterDisplay.style.scrollBehavior = 'auto'; } catch (_) { }
        // Map speed (10-100) to pixels per second, tuned for mobile/desktop parity
        // Further halve the maximum to improve readability: ~325 px/s at max
        const maxSetting = parseInt(this.dom.speedInput?.max || '100', 10);
        const bonus = s >= maxSetting ? 2 : 0; // small nudge at max
        const targetPxPerSec = 40 + s * 3 + bonus; // ~70–325 px/s at max
        const intervalTime = 16; // ~60fps
        this.state.autoScrollInterval = setInterval(() => {
            const stepFloat = targetPxPerSec * (intervalTime / 1000);
            const total = stepFloat + this.state.autoScrollRemainder;
            const step = Math.max(1, Math.floor(total));
            this.state.autoScrollRemainder = total - step;
            this.dom.teleprompterDisplay.scrollBy(0, step);
        }, intervalTime);
    }

    stopAutoScroll() {
        clearInterval(this.state.autoScrollInterval);
        this.state.autoScrollInterval = null;
        // Restore smooth behavior for user-initiated scrolls
        try { this.dom.teleprompterDisplay.style.scrollBehavior = 'smooth'; } catch (_) { }
    }

    // --- Recording & Speech Recognition ---

    toggleRecording() {
        if (this.state.status === 'recording') {
            this.stop();
        } else {
            this.start();
        }
    }

    async start() {
        // Prevent starting if already recording or starting
        if (this.state.status !== 'idle' && this.state.status !== 'ready') return;

        if (!this.dom.scriptInput.value.trim()) {
            alert("Please enter a script before starting.");
            return;
        }

        // Always reset teleprompter scroll to top at the very beginning of a session
        try {
            if (this.dom.teleprompterDisplay) {
                this.dom.teleprompterDisplay.style.scrollBehavior = 'auto';
                this.dom.teleprompterDisplay.scrollTop = 0;
            }
        } catch (_) { }

        // --- Start of the recording process ---
        this.state.status = 'starting';
        DS.mergePatch({ ui: { status: 'starting' } });
        this.updateUIMode();

        if (this.debug) {
            this.log('Starting...', { isSecureContext: window.isSecureContext, protocol: location.protocol, mode: this.dom.scrollModeSelect.value });
            try {
                if (navigator.permissions?.query) {
                    const mic = await navigator.permissions.query({ name: 'microphone' });
                    const cam = await navigator.permissions.query({ name: 'camera' });
                    this.log('Permissions', { microphone: mic.state, camera: cam.state });
                }
            } catch (e) { this.log('Permissions query error', e); }
            try {
                const devices = await navigator.mediaDevices?.enumerateDevices?.();
                this.log('Devices', devices?.map(d => ({ kind: d.kind, label: d.label })));
            } catch (e) { this.log('Enumerate devices error', e); }
        }
        if (this.log) this.log('start() entered');

        try {
            // Show mini countdown (3..2..1) before starting capture/scroll
            this.state.status = 'starting';
            DS.mergePatch({ ui: { status: 'starting', countdown: 2 } });
            // Ensure teleprompter is visible (starting state) and jump to top immediately
            try {
                if (this.dom.teleprompterDisplay) {
                    this.dom.teleprompterDisplay.style.scrollBehavior = 'auto';
                    this.dom.teleprompterDisplay.scrollTop = 0;
                }
            } catch (_) { }
            for (let i = 2; i > 0; i--) {
                DS.mergePatch({ ui: { countdown: i } });
                await new Promise(r => setTimeout(r, 1000));
            }
            DS.mergePatch({ ui: { countdown: 0 } });
            // 1. Get media permissions first. This is the part that requires user interaction.
            // Prefer higher quality; fall back if unsupported
            const videoConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } };
            const audioConstraints = { channelCount: { ideal: 2 }, sampleRate: { ideal: 48000 }, noiseSuppression: true, echoCancellation: true, autoGainControl: true };
            const wantVoice = (this.dom.scrollModeSelect.value === 'voice') && !this.isMobileUA;
            const recordMe = !!this.state.recordMe;

            // If not recording user media, skip getUserMedia/MediaRecorder entirely
            if (!recordMe) {
                this.log && this.log('Record Me OFF: skipping camera/mic capture', { wantVoice });
                // Start SR if Voice mode on desktop
                if (wantVoice) {
                    try {
                        this.state.srActive = false;
                        this.startSpeechRecognition();
                        this.log && this.log('SR requested (recordMe off)');
                    } catch (e) { this.log && this.log('SR start error (recordMe off)', e); }
                } else {
                    // Ensure we start at the very top in Timed mode
                    try { this.dom.teleprompterDisplay.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { }
                    this.startAutoScroll();
                    this.log && this.log('Timed scroll started (recordMe off)');
                }
                // Mark as recording for UI flow even though no MR is running
                this.state.status = 'recording';
                DS.mergePatch({ ui: { status: 'recording' } });
                this.updateUIMode();
                return;
            }
            const wantVideo = recordMe && !this.state.noVideo;
            const wantAudio = recordMe ? (wantVoice ? !this.state.videoOnlyForVoice : true) : false;
            const preferredMicId = localStorage.getItem('preferredMicId') || '';
            try {
                const audioOpt = wantAudio ? (preferredMicId ? { ...audioConstraints, deviceId: { exact: preferredMicId } } : audioConstraints) : false;
                this.state.stream = await navigator.mediaDevices.getUserMedia({ video: wantVideo ? videoConstraints : false, audio: audioOpt });
            } catch (e1) {
                try {
                    const audioOpt = wantAudio ? audioConstraints : false;
                    this.state.stream = await navigator.mediaDevices.getUserMedia({ video: wantVideo ? videoConstraints : false, audio: audioOpt });
                } catch (e2) {
                    // Last resort
                    this.state.stream = await navigator.mediaDevices.getUserMedia({ video: wantVideo, audio: wantAudio });
                }
            }
            this.state.currentHasVideo = !!this.state.stream.getVideoTracks()?.length;
            this.dom.videoPreview.srcObject = this.state.stream;
            if (!this.state.currentHasVideo) try { this.dom.videoPreviewContainer.classList.add('hidden'); } catch (_) { }
            if (this.log) this.log('gotUserMedia OK');
            try {
                const a = this.state.stream.getAudioTracks()[0];
                const v = this.state.stream.getVideoTracks()[0];
                if (this.log) this.log('track settings', { audio: a?.getSettings?.(), video: v?.getSettings?.() });
                if (v) this.applyPIPAspectFromTrack(v);
            } catch (_) { }

            // Prefer starting SpeechRecognition first on desktop to avoid mic contention
            const useVoice = wantVoice;

            if (useVoice) {
                try {
                    this.state.srActive = false;
                    this.startSpeechRecognition();
                    // Watchdog: if SR didn't go active within 2000ms, fall back to Timed
                    setTimeout(() => {
                        if (!this.state.srActive) {
                            if (this.log) this.log('SR watchdog fallback to Timed');
                            this.log('SR watchdog: no onstart; falling back to Timed');
                            if (this.dom.scrollModeSelect) this.dom.scrollModeSelect.value = 'timed';
                            this.handleScrollModeChange('timed');
                            this.saveSettings();
                        }
                    }, 2000);
                    // Give SR a head start before MR to reduce contention
                    await new Promise(r => setTimeout(r, this.srDelayMs || 800));
                } catch (e) { this.log('SR start error before MR', e); }
            }

            // Final step: start recording (unless noRecord flag is set)
            this.state.status = 'recording';
            DS.mergePatch({ ui: { status: 'recording' } });
            // Honor Record Me toggle
            this.state.noRecord = !recordMe;
            if (!this.state.noRecord) {
                this.setupMediaRecorder();
                this.state.mediaRecorder.start();
                if (this.log) this.log('MediaRecorder started', { videoOnly: this.state.videoOnlyForVoice });
                this.startMicMeter();
            } else {
                if (this.log) this.log('recording disabled (noRecord flag)');
            }

            // Ensure we start from the top on each new session
            try { this.dom.teleprompterDisplay.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { }
            // Mobile limitation already handled elsewhere; ensure scroll behavior starts
            if (useVoice) {
                // Already started recognition above
            } else {
                this.startAutoScroll();
            }
            this.updateUIMode();

            // For Voice mode, restore smooth scroll for user interactions
            try {
                if (useVoice && this.dom.teleprompterDisplay) {
                    this.dom.teleprompterDisplay.style.scrollBehavior = 'smooth';
                }
            } catch (_) { }

        } catch (err) {
            if (this.debug) console.error('VS: Error during startup sequence.', err);
            alert("Could not access camera/microphone. Please check permissions and try again.");
            this.stop(); // Go back to a clean idle state if anything fails
        }
    }

    stop() {
        // Stops everything and returns to idle state.
        if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') {
            this.state.mediaRecorder.stop();
        }
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
        }

        this.stopMicMeter();
        this.stopSpeechRecognition();
        this.stopAutoScroll();

        this.dom.videoPreview.srcObject = null;

        // Reset status to ready and update UI
        this.state.status = 'ready';
        DS.mergePatch({ ui: { status: 'ready' } });
        this.updateUIMode();
    }

    /**
     * Creates a new MediaRecorder instance and sets up its event listeners.
     */
    /**
     * Creates/configures MediaRecorder and wires its events
     * to collect chunks and render session recordings with thumbnails.
     */
    setupMediaRecorder() {
        this.state.recordedChunks = [];
        const MR = window.MediaRecorder;
        const chooseType = () => {
            const options = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
            ];
            for (const t of options) {
                if (MR && typeof MR.isTypeSupported === 'function' && MR.isTypeSupported(t)) {
                    return { mime: t, ext: t.includes('mp4') ? 'mp4' : 'webm' };
                }
            }
            return { mime: '', ext: 'webm' };
        };
        const picked = chooseType();
        this.state.recordMimeType = picked.mime || undefined;
        this.state.recordFileExt = picked.ext;
        const opts = picked.mime ? { mimeType: picked.mime } : {};
        // Attempt bitrate hints where supported
        opts.audioBitsPerSecond = 128000;
        opts.videoBitsPerSecond = 3500000;
        try {
            this.state.mediaRecorder = new MediaRecorder(this.state.stream, opts);
        } catch (_) {
            this.state.mediaRecorder = new MediaRecorder(this.state.stream, picked.mime ? { mimeType: picked.mime } : {});
        }

        this.state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.state.recordedChunks.push(event.data);
        };

        this.state.mediaRecorder.onstop = async () => {
            const blob = new Blob(this.state.recordedChunks, { type: this.state.recordMimeType || 'video/webm' });
            const url = URL.createObjectURL(blob);
            const recordingName = `Recording ${new Date().toLocaleTimeString()}`;
            let thumb = null;
            try { thumb = await this.captureThumbnail(blob); } catch (_) { thumb = null; }
            this.state.sessionRecordings.unshift({ name: recordingName, url: url, thumb });
            this.renderRecordings();
        };
    }

    /**
     * Renders the session recordings list and updates the DS
     * `ui.recordingsCount` which drives the Videos badge visibility.
     */
    renderRecordings() {
        this.dom.recordingsList.innerHTML = '';
        const count = this.state.sessionRecordings.length;
        DS.mergePatch({ ui: { recordingsCount: count } });
        if (count === 0) {
            const empty = document.createElement('li');
            empty.classList.add('muted', 'small');
            empty.textContent = 'No recordings yet.';
            this.dom.recordingsList.appendChild(empty);
        } else {
            this.state.sessionRecordings.forEach(rec => {
                const li = document.createElement('li');

                const meta = document.createElement('div');
                meta.className = 'recording-meta';

                const name = document.createElement('span');
                name.className = 'recording-name';
                name.textContent = rec.name;

                const actions = document.createElement('div');
                actions.className = 'recording-actions';

                const downloadLink = document.createElement('a');
                downloadLink.href = rec.url;
                downloadLink.download = `${rec.name}.${this.state.recordFileExt}`;
                downloadLink.textContent = 'Download';

                actions.appendChild(downloadLink);
                meta.appendChild(name);
                meta.appendChild(actions);
                li.appendChild(meta);

                const player = document.createElement('video');
                player.className = 'recording-player';
                player.controls = true;
                player.preload = 'metadata';
                player.playsInline = true;
                player.src = rec.url;
                player.setAttribute('aria-label', `${rec.name} playback`);
                if (rec.thumb) player.poster = rec.thumb;
                player.addEventListener('loadedmetadata', () => {
                    // Keep inline playback sized to the recorded clip.
                    const vw = player.videoWidth;
                    const vh = player.videoHeight;
                    if (vw && vh) {
                        try { player.style.aspectRatio = `${vw} / ${vh}`; } catch (_) { }
                    }
                    player.style.height = 'auto';
                });

                li.appendChild(player);

                this.dom.recordingsList.appendChild(li);
            });
        }
    }

    async captureThumbnail(blob) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(blob);
            video.muted = true;
            video.playsInline = true;
            video.addEventListener('loadeddata', () => {
                // Seek to a small offset for a valid frame
                const onSeeked = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const w = 160, h = 100;
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, w, h);
                        const dataUrl = canvas.toDataURL('image/png');
                        resolve(dataUrl);
                    } catch (e) { reject(e); }
                };
                if (isNaN(video.duration) || video.duration === Infinity) {
                    // Fallback: draw immediately
                    onSeeked();
                } else {
                    const duration = video.duration;
                    const targetTime = duration > 1 ? 1 : Math.max(0, duration - 0.1);
                    video.currentTime = targetTime;
                    video.addEventListener('seeked', onSeeked, { once: true });
                }
            }, { once: true });
            video.addEventListener('error', reject, { once: true });
        });
    }

    /**
     * Initializes Web Speech Recognition (desktop only),
     * sets debug/trace loggers, and wires restart/fallback behavior.
     */
    initSpeechRecognition() {
        this.debug = /[?&]debug=1\b/.test(location.search) || localStorage.getItem('vsDebug') === '1';
        this.debugTrace = /[?&]trace=1\b/.test(location.search) || localStorage.getItem('vsTrace') === '1';
        if (this.debug) DS.mergePatch({ ui: { debug: true } });
        const log = (...args) => { if (this.debug) console.log('[VS]', ...args); };
        this.log = log;
        this.tlog = (...args) => { if (this.debugTrace) console.log('VS:TRACE', ...args); };
        // SR head-start delay tuning (ms)
        try {
            const url = new URL(window.location.href);
            const qDelay = parseInt(url.searchParams.get('srdelay') || '', 10);
            const lsDelay = parseInt(localStorage.getItem('vsSrDelay') || '', 10);
            this.srDelayMs = Number.isFinite(qDelay) ? qDelay : (Number.isFinite(lsDelay) ? lsDelay : 800);
            if (this.log) this.log('SR head-start delay (ms)', this.srDelayMs);
        } catch (_) { this.srDelayMs = 800; }
        // Disable speech recognition entirely on mobile UAs
        if (this.isMobileUA) {
            this.recognition = null;
            try {
                if (this.dom.scrollModeSelect) {
                    this.dom.scrollModeSelect.value = 'timed';
                    const opt = this.dom.scrollModeSelect.querySelector('option[value="voice"]');
                    if (opt) opt.disabled = true;
                }
            } catch (_) { }
            this.handleScrollModeChange('timed');
            if (this.log) this.log('SR disabled on mobile');
            log('SpeechRecognition: disabled on mobile');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;
            if (this.log) this.log('SR config', { continuous: this.recognition.continuous, interim: this.recognition.interimResults, lang: this.recognition.lang });
            this.recognition.onresult = (event) => this.handleSpeechResult(event);
            this.recognition.onstart = () => { this.state.srActive = true; DS.mergePatch({ ui: { recStatus: 'active', recError: '' } }); this.log('SR onstart'); };
            this.recognition.onaudioend = () => { this.log('SR onaudioend'); };
            this.recognition.onspeechstart = () => { this.log('SR onspeechstart'); };
            this.recognition.onspeechend = () => { this.log('SR onspeechend'); };
            // Mobile browsers (esp. Android) may stop recognition after pauses.
            // Restart with a small delay to avoid rapid start/stop loops.
            this.recognition.onend = () => {
                this.log('SR onend');
                if (!this.state.isSpeechRecognitionActive) return;
                // Count cycles where no results were seen
                if (!this.state.srResultSeen) {
                    this.state.srNoResultCycles += 1;
                    this.log('SR no-result cycle', this.state.srNoResultCycles);
                    // After several no-result cycles, switch recording to video-only to un-block SR
                    if (this.state.srNoResultCycles >= 2 && this.state.status === 'recording' && !this.state.videoOnlyForVoice) {
                        this.log('switching to video-only to prioritize SR');
                        this.switchToVideoOnlyForVoice();
                    }
                } else {
                    this.state.srNoResultCycles = 0;
                }
                clearTimeout(this.recRestartTimer);
                this.recRestartTimer = setTimeout(() => {
                    try { this.recognition.start(); DS.mergePatch({ ui: { recStatus: 'restarting' } }); this.log('SR restart'); } catch (e) { this.log('SR restart error', e); }
                }, 350);
            };
            this.recognition.onerror = (e) => {
                if (!this.state.isSpeechRecognitionActive) return;
                const fatal = e && (e.error === 'not-allowed' || e.error === 'service-not-allowed');
                if (fatal) {
                    // Fall back to timed scroll if voice capture is blocked
                    DS.mergePatch({ ui: { recStatus: 'error', recError: String(e.error || 'fatal') } });
                    this.log('SR fatal error', e);
                    this.stopSpeechRecognition();
                    if (this.dom.scrollModeSelect) {
                        this.dom.scrollModeSelect.value = 'timed';
                        this.handleScrollModeChange('timed');
                    }
                    return;
                }
                // Recover from transient errors (no-speech, network, aborted)
                clearTimeout(this.recRestartTimer);
                this.recRestartTimer = setTimeout(() => {
                    try { this.recognition.start(); DS.mergePatch({ ui: { recStatus: 'recovering' } }); this.log('SR recover start'); } catch (err) { this.log('SR recover error', err); }
                }, 500);
            };
        } else {
            if (this.debug) console.warn('VS: Speech Recognition not supported.');
            if (this.dom.scrollModeSelect) {
                this.dom.scrollModeSelect.querySelector('option[value="voice"]').disabled = true;
                this.dom.scrollModeSelect.value = 'timed';
                this.handleScrollModeChange('timed');
            }
        }
    }

    /** Starts SR and updates UI status; guarded by availability. */
    startSpeechRecognition() {
        if (!this.recognition) return;
        this.state.isSpeechRecognitionActive = true;
        this.state.lastMatchIndex = -1;
        this.resetWordHighlighting();
        this.dom.teleprompterDisplay.scrollTo({ top: 0, behavior: 'smooth' });
        DS.mergePatch({ ui: { recStatus: 'starting', recError: '' } });
        this.log('SR start() request');
        try { this.recognition.start(); } catch (e) { this.log('SR start error', e); DS.mergePatch({ ui: { recStatus: 'error', recError: String(e?.message || e) } }); }
    }

    /** Stops SR if active. */
    stopSpeechRecognition() {
        if (!this.recognition) return;
        this.state.isSpeechRecognitionActive = false;
        this.recognition.stop();
    }

    /** Processes SR results and updates word highlighting and status. */
    handleSpeechResult(event) {
        let transcript = '';
        this.state.srResultSeen = true;
        this.log('SR results len', event.results.length);
        for (let i = 0; i < event.results.length; ++i) {
            this.log('SR alt', { i, text: event.results[i][0].transcript, isFinal: event.results[i].isFinal });
            transcript += event.results[i][0].transcript;
        }
        const isFinal = event.results[event.results.length - 1].isFinal;
        this.log('SR result', { isFinal, transcript });
        if (this.debug) DS.mergePatch({ ui: { recStatus: isFinal ? 'final' : 'interim' } });

        if (this.state.isResyncing) {
            if (isFinal) {
                this.processTranscript(transcript, true);
                this.state.isResyncing = false;
                DS.mergePatch({ ui: { isResyncing: false } });
            }
            return;
        }

        this.processTranscript(transcript, false);
    }

    processTranscript(transcript, isResync) {
        const tWords = this.normalizeWord(transcript).split(/\s+/).filter(Boolean);
        // Filter transcript words to significant words as well to match the same sequence set
        const tSigWords = tWords.filter(w => !this.stopWords.has(w));
        if (tSigWords.length === 0) return;

        const cfg = this.state.matchConfig;
        const phraseLenMax = Math.min(tSigWords.length, cfg.maxPhraseLen);
        let best = { score: -Infinity, endIndex: -1, length: 0, startIndex: -1 };

        const aheadStartBase = this.state.lastMatchIndex + 1;
        const lastOrig = this.state.lastMatchIndex >= 0 ? this.state.significantScriptWords[this.state.lastMatchIndex].originalIndex : -1;
        const aheadStartOrig = lastOrig + 1;
        const searchStart = isResync ? 0 : Math.max(0, aheadStartBase - cfg.backtrackAllowance);
        const searchEnd = isResync ? this.state.significantScriptWords.length : Math.min(this.state.significantScriptWords.length, aheadStartBase + cfg.maxSearchAhead);

        for (let len = phraseLenMax; len >= 1; len--) {
            const sub = tSigWords.slice(tSigWords.length - len);
            for (let i = searchStart; i < searchEnd; i++) {
                // Prevent large backwards jumps unless resyncing
                const forwardDelta = i - aheadStartBase;
                const candOrig = this.state.significantScriptWords[i].originalIndex;
                const forwardOrigDelta = candOrig - aheadStartOrig;
                if (!isResync && forwardDelta < -cfg.backtrackAllowance) continue;
                if (!isResync && forwardOrigDelta > cfg.maxForwardOriginalWords) continue;

                let ok = true;
                for (let j = 0; j < len; j++) {
                    const scriptIdx = i + j;
                    if (scriptIdx >= this.state.significantScriptWords.length || this.state.significantScriptWords[scriptIdx].word !== sub[j]) {
                        ok = false; break;
                    }
                }
                if (!ok) continue;

                // Guard against skipping too far ahead with a 1-word match
                if (!isResync && len === 1 && (forwardDelta > cfg.maxJumpLen1 || forwardOrigDelta > cfg.maxJumpLen1Original)) continue;
                // Allow longer jumps only if we have a stronger phrase (by original words too)
                if (!isResync && (forwardDelta > cfg.maxSearchAhead || forwardOrigDelta > cfg.maxForwardOriginalWords) && len < cfg.minAcceptLenForLongJump) continue;

                const distance = Math.abs(forwardOrigDelta);
                // Score prefers longer matches, then nearer positions, then smaller index
                const score = len * 10 - distance - (i * 0.001);
                if (score > best.score) {
                    best = { score, endIndex: i + len - 1, length: len, startIndex: i };
                }
            }
            // If we already have a good multi-word match, we can stop early
            if (best.length >= 3 && best.endIndex !== -1) break;
        }

        if (best.endIndex > -1) {
            this.state.lastMatchIndex = best.endIndex;
            const lastOriginalIndex = this.state.significantScriptWords[this.state.lastMatchIndex].originalIndex;
            try {
                const w = this.state.significantScriptWords[this.state.lastMatchIndex]?.word;
                this.tlog && this.tlog('matched', { index: this.state.lastMatchIndex, originalIndex: lastOriginalIndex, word: w, len: best.length });
            } catch (_) { }
            this.highlightWords(lastOriginalIndex);
            const wordElement = this.state.wordElements.find(el => parseInt(el.dataset.index, 10) === lastOriginalIndex);
            if (wordElement) this.scrollToElement(wordElement);
        }
    }

    highlightWords(lastSpokenIndex) {
        this.state.wordElements.forEach(el => {
            const index = parseInt(el.dataset.index, 10);
            if (index <= lastSpokenIndex) {
                el.classList.add('spoken-word');
            } else {
                el.classList.remove('spoken-word');
            }
            el.classList.remove('current-word');
        });
        const currentWord = this.state.wordElements.find(el => parseInt(el.dataset.index, 10) === lastSpokenIndex);
        if (currentWord) {
            currentWord.classList.add('current-word');
        }
    }

    resetWordHighlighting() {
        this.state.wordElements.forEach(el => {
            el.classList.remove('spoken-word', 'current-word');
        });
    }

    scrollToElement(element) {
        const markerPosition = this.dom.teleprompterDisplay.clientHeight * 0.4;
        const elementTop = element.offsetTop;
        this.dom.teleprompterDisplay.scrollTo({ top: elementTop - markerPosition, behavior: 'smooth' });
    }

    enterResyncMode() {
        this.state.isResyncing = true;
        DS.mergePatch({ ui: { isResyncing: true } });
    }

    // countdown removed

    /**
     * This is the single source of truth for UI state.
     * It looks at the current this.state.status and updates the DOM accordingly.
     */
    updateUIMode() {
        const status = this.state.status;
        const isIdle = status === 'idle';
        const isReady = status === 'ready';
        const isInteractive = isIdle || isReady;
        const isStarting = status === 'starting';
        const isRecording = status === 'recording';

        // Button state
        this.dom.startStopBtn.disabled = isStarting;
        // Toggle body class for mobile layout switch
        document.body.classList.toggle('is-recording', isRecording || isStarting);


        // Disable controls during recording/startup
        const controlsToDisable = [
            this.dom.fontSizeInput,
            this.dom.scrollModeSelect,
            this.dom.speedInput,
            this.dom.mirrorToggleBtn,
            this.dom.recordMeToggleBtn
        ];
        controlsToDisable.forEach(el => { if (el && 'disabled' in el) el.disabled = !isInteractive; });

        this.dom.scriptInput.disabled = !isInteractive;

        // Ensure preview visibility even if DS binding lags
        let showPreview = (isRecording || isStarting || (!this.isMobileUA)) && !!this.state.recordMe; // desktop visible on idle only when recording is enabled
        if (this.state?.noVideo) showPreview = false;
        this.dom.videoPreviewContainer.classList.toggle('hidden', !showPreview);

        // Ensure mic level visibility even if DS binding lags
        try { if (this.dom.micLevel) this.dom.micLevel.classList.toggle('hidden', !isRecording || !this.state.recordMe); } catch (_) { }
    }

    // --- Utilities ---
    log(...args) { try { if (this.debug) console.log('[VS]', ...args); } catch (_) { } }

    startMicMeter() {
        try {
            if (!this.dom.micLevel || !this.state.stream) return;
            const hasAudio = this.state.stream.getAudioTracks()?.length > 0;
            if (!hasAudio) { this.stopMicMeter(); return; }
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const src = this.audioCtx.createMediaStreamSource(this.state.stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 512;
            this.micData = new Uint8Array(this.analyser.frequencyBinCount);
            src.connect(this.analyser);
            const loop = () => {
                this.analyser.getByteTimeDomainData(this.micData);
                let sum = 0; for (let i = 0; i < this.micData.length; i++) { const v = (this.micData[i] - 128) / 128; sum += v * v; }
                const rms = Math.sqrt(sum / this.micData.length);
                const pct = Math.min(100, Math.max(0, Math.round(rms * 100)));
                if (this.dom.micFill) this.dom.micFill.style.width = pct + '%';
                this.micRAF = requestAnimationFrame(loop);
            };
            this.micRAF = requestAnimationFrame(loop);
        } catch (_) { }
    }

    stopMicMeter() {
        try { if (this.micRAF) cancelAnimationFrame(this.micRAF); this.micRAF = 0; } catch (_) { }
        try { this.analyser = null; this.micData = null; } catch (_) { }
        try { this.audioCtx?.close?.(); this.audioCtx = null; } catch (_) { }
        try { if (this.dom.micFill) this.dom.micFill.style.width = '0%'; } catch (_) { }
    }
    /** Makes the video preview container draggable on mouse and touch. */
    makeElementDraggable(elmnt) {
        let startX = 0, startY = 0, lastX = 0, lastY = 0;
        const handle = this.dom.videoPreview || elmnt;
        if (!handle) return;

        const onStart = (x, y) => {
            startX = x; startY = y; lastX = x; lastY = y;
            window.addEventListener('mousemove', onMoveMouse);
            window.addEventListener('mouseup', onEndMouse, { once: true });
        };
        const onMove = (x, y) => {
            const dx = x - lastX; const dy = y - lastY;
            lastX = x; lastY = y;
            elmnt.style.left = (elmnt.offsetLeft + dx) + 'px';
            elmnt.style.top = (elmnt.offsetTop + dy) + 'px';
        };
        const onEnd = () => {
            window.removeEventListener('mousemove', onMoveMouse);
        };
        const onMoveMouse = (e) => { e.preventDefault(); onMove(e.clientX, e.clientY); };
        const onEndMouse = () => { onEnd(); };
        handle.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX, e.clientY); });

        // Touch support
        handle.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            const t = e.touches[0];
            lastX = t.clientX; lastY = t.clientY;
        }, { passive: true });
        handle.addEventListener('touchmove', (e) => {
            if (!e.touches || !e.touches[0]) return;
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
    }
}

// Switch MR to video-only during Voice mode to reduce mic contention and unblock SR
TeleprompterApp.prototype.switchToVideoOnlyForVoice = async function () {
    try {
        if (this.state.status !== 'recording') return;
        this.state.videoOnlyForVoice = true;
        // Stop current recorder and audio tracks
        try { if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') this.state.mediaRecorder.stop(); } catch (_) { }
        try { this.state.stream?.getAudioTracks?.().forEach(t => t.stop()); } catch (_) { }

        // Acquire new stream without audio
        const videoConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } };
        try {
            this.state.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        } catch (_) {
            this.state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        this.dom.videoPreview.srcObject = this.state.stream;
        this.setupMediaRecorder();
        this.state.mediaRecorder.start();
        if (this.log) this.log('MR restarted video-only');
    } catch (e) {
        if (this.log) this.log('switchToVideoOnly error', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const verEl = document.getElementById('meta-version');
    const ver = verEl ? verEl.textContent?.trim() : '';
    const app = new TeleprompterApp();
    app.log && app.log('app init – for debug, use ?debug=1');
    app.log && app.log('version', ver || '(unknown)');
    try { window.VS = app; } catch (_) { }
});
