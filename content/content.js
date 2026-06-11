// ═══════════════════════════════════════════════════════════
// GEMINIGEN AUTO FLOW PRO - Content Script v2.0
// ═══════════════════════════════════════════════════════════

class GeminiGenAutoFlow {
  constructor() {
    this.uiElements = {};
    this.isActive = false;
    this.currentClip = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  init() {
    console.log('[GeminiGen AutoFlow] Initializing...');
    
    this.waitForUI()
      .then(() => {
        this.identifyUIElements();
        this.setupMutationObserver();
        this.setupMessageListener();
        this.startQuotaScanner();
        this.showStatus('🟢 GeminiGen Auto Flow Pro Ready');
        console.log('[GeminiGen AutoFlow] Ready!');
      })
      .catch(err => {
        console.error('[GeminiGen AutoFlow] UI not found, retrying...', err);
        setTimeout(() => this.init(), 3000);
      });
  }

  async waitForUI() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      
      const check = () => {
        const input = this.findPromptInput();
        if (input) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  findPromptInput() {
    return document.querySelector('textarea, [contenteditable="true"], input[type="text"]');
  }

  identifyUIElements() {
    this.uiElements = {
      promptInput: this.findPromptInput(),
      generateBtn: this.findGenerateButton(),
      imageResult: document.querySelector('[class*="image"], [class*="preview"], img'),
      videoResult: document.querySelector('[class*="video"], [class*="player"], video'),
      statusArea: document.querySelector('[class*="status"], [class*="progress"], [class*="loading"]'),
      rateLimitMsg: this.findRateLimitMessage(),
      quotaDisplay: this.findQuotaDisplay()
    };
    console.log('[GeminiGen AutoFlow] UI Elements:', this.uiElements);
  }

  findGenerateButton() {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      if (text.includes('generat') || text.includes('create') || text.includes('submit')) {
        return btn;
      }
    }
    return buttons[0] || null;
  }

  findRateLimitMessage() {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const text = el.textContent.toLowerCase();
      if (text.includes('rate limit') || text.includes('quota') || text.includes('limit reached') || 
          text.includes('too many') || text.includes('wait')) {
        if (el.offsetParent !== null && el.textContent.length < 200) {
          return el;
        }
      }
    }
    return null;
  }

  findQuotaDisplay() {
    // Cerca elementi che mostrano quote/limiti
    const patterns = [
      /remaining/i, /credits/i, /quota/i, /generations?/i, /daily/i, /limit/i
    ];
    
    const elements = document.querySelectorAll('span, div, p');
    for (const el of elements) {
      const text = el.textContent;
      for (const pattern of patterns) {
        if (pattern.test(text) && el.offsetParent !== null) {
          return { element: el, text: text };
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // MESSAGE LISTENER
  // ═══════════════════════════════════════════════════════════

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      console.log('[Content] Message:', msg.type);
      
      switch (msg.type) {
        case 'GENERATE_CLIP':
          this.generateClip(msg.clip, msg.character, msg.environment)
            .then(r => sendResponse(r));
          return true;
          
        case 'GET_UI_STATE':
          sendResponse({ state: this.getUIState() });
          return true;
          
        case 'UPDATE_QUOTA_FROM_UI':
          this.scanAndUpdateQuota();
          sendResponse({ success: true });
          return true;
          
        default:
          sendResponse({ success: false });
      }
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CLIP GENERATION
  // ═══════════════════════════════════════════════════════════

  async generateClip(clip, character, environment) {
    console.log('[Generate] Clip:', clip.prompt?.substring(0, 50));
    
    this.currentClip = clip;
    this.retryCount = 0;
    
    try {
      // Costruisci prompt completo
      const fullPrompt = this.buildFullPrompt(clip, character, environment);
      
      // Inserisci nel campo input
      await this.fillPrompt(fullPrompt);
      
      // Seleziona durata se disponibile
      await this.selectDuration(clip.duration);
      
      // Click genera
      await this.delay(500);
      await this.clickGenerate();
      
      // Attendi completamento
      const result = await this.waitForCompletion();
      
      // Salva output
      await this.saveOutput(clip);
      
      // Registra generazione
      chrome.runtime.sendMessage({ 
        type: 'RECORD_GENERATION', 
        data: { type: 'clip', success: true }
      });
      
      return { success: true, result };
      
    } catch (error) {
      console.error('[Generate] Error:', error);
      
      if (error.type === 'RATE_LIMIT') {
        chrome.runtime.sendMessage({ 
          type: 'RATE_LIMIT_DETECTED', 
          data: { waitTime: error.waitTime }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  buildFullPrompt(clip, character, environment) {
    let prompt = '';
    
    // Riferimento personaggio
    if (character) {
      prompt += `Character: ${character.name}. ${character.description || ''}. `;
      if (character.prompt) prompt += `${character.prompt}. `;
    }
    
    // Riferimento ambiente
    if (environment) {
      prompt += `Environment: ${environment.name}. ${environment.description || ''}. `;
      if (environment.lighting) prompt += `Lighting: ${environment.lighting}. `;
    }
    
    // Scene prompt
    if (clip.prompt) prompt += `Scene: ${clip.prompt}. `;
    
    // Riferimento scena (se combinata)
    if (clip.sceneRange) {
      prompt += `[Scenes ${clip.sceneRange}] `;
    }
    
    // Stile cinematografico
    prompt += 'Cinematic style, high quality.';
    
    return prompt.trim();
  }

  async fillPrompt(prompt) {
    const input = this.uiElements.promptInput;
    if (!input) throw new Error('Prompt input not found');
    
    input.focus();
    
    // Clear
    if (input.value !== undefined) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Type character by character per trigger
    for (const char of prompt) {
      if (input.value !== undefined) {
        input.value += char;
      } else {
        input.textContent += char;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(10);
    }
    
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await this.delay(200);
  }

  async selectDuration(duration) {
    // Cerca pulsanti/selettori durata
    const durationOptions = document.querySelectorAll('button, [role="button"], [class*="duration"]');
    
    for (const option of durationOptions) {
      const text = option.textContent.toLowerCase();
      
      if (duration <= 6 && (text.includes('6') || text.includes('short') || text.includes('4') || text.includes('8'))) {
        if (!option.disabled) {
          option.click();
          await this.delay(300);
          return;
        }
      }
      
      if (duration === 30 && (text.includes('30') || text.includes('long') || text.includes('full'))) {
        if (!option.disabled) {
          option.click();
          await this.delay(300);
          return;
        }
      }
    }
  }

  async clickGenerate() {
    const btn = this.uiElements.generateBtn;
    if (!btn) throw new Error('Generate button not found');
    if (btn.disabled) throw new Error('Generate button disabled');
    
    btn.click();
    this.showStatus('🎬 Generazione in corso...');
  }

  async waitForCompletion() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout generazione')), 300000);
      let checkCount = 0;
      
      const check = async () => {
        checkCount++;
        const state = this.getUIState();
        
        if (state.status === 'complete') {
          clearTimeout(timeout);
          resolve({ hasResult: true });
        } else if (state.status === 'rate_limit') {
          clearTimeout(timeout);
          reject({ type: 'RATE_LIMIT', waitTime: state.rateLimitWait || 60000 });
        } else if (state.status === 'error') {
          clearTimeout(timeout);
          reject(new Error(state.error || 'Generation error'));
        } else {
          // Retry logic
          if (state.status === 'idle' && this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`[Retry] Attempt ${this.retryCount}`);
            await this.clickGenerate();
          }
          
          setTimeout(check, 2000);
        }
      };
      
      check();
    });
  }

  getUIState() {
    const state = {
      status: 'unknown',
      hasResult: false,
      error: null,
      rateLimitWait: null
    };
    
    // Check rate limit
    const rateLimitEl = this.findRateLimitMessage();
    if (rateLimitEl && rateLimitEl.offsetParent !== null) {
      state.status = 'rate_limit';
      const text = rateLimitEl.textContent;
      const match = text.match(/(\d+)\s*(min|sec|minute|second)/i);
      if (match) {
        const value = parseInt(match[1]);
        state.rateLimitWait = match[2].toLowerCase().startsWith('min') ? value * 60000 : value * 1000;
      }
      return state;
    }
    
    // Check loading/processing
    const loadingEl = document.querySelector('[class*="loading"], [class*="processing"], [class*="generating"], [class*="spinner"]');
    if (loadingEl && loadingEl.offsetParent !== null) {
      state.status = 'loading';
      return state;
    }
    
    // Check result
    const video = document.querySelector('video');
    const img = document.querySelector('img[src]:not([src=""])');
    
    if (video && video.src) {
      state.status = 'complete';
      state.hasResult = true;
      return state;
    }
    
    if (img && img.complete && img.naturalWidth > 0) {
      state.status = 'complete';
      state.hasResult = true;
      return state;
    }
    
    // Check error
    const errorEl = document.querySelector('[class*="error"], [class*="failed"], [class*="alert"]');
    if (errorEl && errorEl.offsetParent !== null && errorEl.textContent.length < 500) {
      state.status = 'error';
      state.error = errorEl.textContent;
      return state;
    }
    
    // Idle
    state.status = 'idle';
    return state;
  }

  async saveOutput(clip) {
    const state = this.getUIState();
    if (!state.hasResult) return;
    
    const video = document.querySelector('video');
    const img = document.querySelector('img[src]:not([src=""])');
    
    const isVideo = !!video?.src;
    const url = isVideo ? video.src : img?.src;
    
    if (url) {
      // Notifica background per download
      chrome.runtime.sendMessage({
        type: 'SAVE_OUTPUT',
        data: {
          url,
          type: isVideo ? 'video' : 'image',
          clipIndex: clip.index,
          duration: clip.duration,
          timestamp: Date.now()
        }
      });
      
      this.showStatus(`✅ Clip ${clip.index + 1} salvata`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // QUOTA SCANNING
  // ═══════════════════════════════════════════════════════════

  startQuotaScanner() {
    setInterval(() => this.scanAndUpdateQuota(), 10000);
    this.scanAndUpdateQuota();
  }

  scanAndUpdateQuota() {
    const quotaData = {
      daily: { total: 0, used: 0, remaining: 0 },
      monthly: { total: 0, used: 0, remaining: 0 },
      unlimited: false
    };
    
    // Check per unlimited badge
    const unlimitedPatterns = ['unlimited', 'pro', 'premium', 'infinite'];
    for (const pattern of unlimitedPatterns) {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.textContent.toLowerCase().includes(pattern) && el.offsetParent !== null) {
          if (el.textContent.length < 50) {
            quotaData.unlimited = true;
            chrome.runtime.sendMessage({ type: 'UPDATE_QUOTA', data: quotaData });
            return;
          }
        }
      }
    }
    
    // Parse text per quote
    const allText = document.body.innerText;
    
    // Pattern: "5 remaining", "10 left"
    const remainingMatch = allText.match(/(\d+)\s*(?:remaining|left|reste)/i);
    if (remainingMatch) {
      quotaData.daily.remaining = parseInt(remainingMatch[1]);
    }
    
    // Pattern: "3 of 10", "5/20"
    const usedTotalMatch = allText.match(/(\d+)\s*(?:\/|of|-)\s*(\d+)/);
    if (usedTotalMatch) {
      quotaData.daily.used = parseInt(usedTotalMatch[1]);
      quotaData.daily.total = parseInt(usedTotalMatch[2]);
      quotaData.daily.remaining = quotaData.daily.total - quotaData.daily.used;
    }
    
    // Pattern: "credits", "gen", "generations"
    const creditsMatch = allText.match(/(\d+)\s*(?:credits?|gen|generations?)/i);
    if (creditsMatch && !quotaData.daily.total) {
      quotaData.daily.total = parseInt(creditsMatch[1]);
      quotaData.daily.remaining = parseInt(creditsMatch[1]);
    }
    
    chrome.runtime.sendMessage({ type: 'UPDATE_QUOTA', data: quotaData });
  }

  // ═══════════════════════════════════════════════════════════
  // MUTATION OBSERVER
  // ═══════════════════════════════════════════════════════════

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      this.identifyUIElements();
      this.scanAndUpdateQuota();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  showStatus(message) {
    let statusEl = document.getElementById('geminigen-autoflow-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'geminigen-autoflow-status';
      statusEl.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: system-ui, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        z-index: 999999;
        max-width: 300px;
      `;
      document.body.appendChild(statusEl);
    }
    statusEl.textContent = message;
    
    // Auto hide dopo 3s per messaggi non critici
    if (!message.includes('❌') && !message.includes('⏸️')) {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.style.opacity = '0';
          setTimeout(() => statusEl.remove(), 300);
        }
      }, 3000);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

new GeminiGenAutoFlow();