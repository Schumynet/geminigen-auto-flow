// ═══════════════════════════════════════════════════════════
// GEMINIGEN AUTO FLOW PRO - Background Service Worker v2.0
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// DATABASE - Memory System (come Whisk)
// ═══════════════════════════════════════════════════════════

const DB = {
  characters: {},
  environments: {},
  scripts: {},          // Copioni completi
  projects: {},         // Progetti di lavoro
  activeProject: null
};

// ═══════════════════════════════════════════════════════════
// SCRIPT PARSER - Suddivide copione in scene/prompt
// ═══════════════════════════════════════════════════════════

const ScriptParser = {
  // SepARATORI per dividere il copione in scene
  separators: [
    /\n\n+/,                    // Paragrafi vuoti
    /\[SCENA\s*\d*\]/i,         // [SCENA 1], [SCENA]
    /SCENE\s*\d*:/i,           // SCENE 1:
    /---\s*/,                   // ---
    /\*+\s*/,                   // ***
    /\.\.\.\s*/,               // ...
    /\n(?=[A-Z][a-z]+:)/m       // PERSONAGGIO: (dialogo)
  ],
  
  // Parse copione in scene
  parseScript(text) {
    const scenes = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    let currentScene = {
      index: 0,
      title: '',
      prompts: [],
      duration: 6,
      character: null,
      environment: null
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Rileva nuovo titolo scena
      if (/^(SCENA|SCENE|ACT|PARTE|PART)/i.test(line) || 
          /^\d+[\.\)]\s*/.test(line) ||
          /^\[.+\]/.test(line)) {
        
        if (currentScene.prompts.length > 0 || currentScene.title) {
          scenes.push({...currentScene});
        }
        
        currentScene = {
          index: scenes.length,
          title: line.replace(/^\[|\]$/g, '').trim(),
          prompts: [],
          duration: 6,
          character: null,
          environment: null
        };
      }
      // Altrimenti aggiungi come prompt
      else if (line.length > 5) {
        currentScene.prompts.push(line);
      }
    }
    
    // Aggiungi ultima scena
    if (currentScene.prompts.length > 0 || currentScene.title) {
      scenes.push({...currentScene});
    }
    
    // Se non ci sono scene, crea una singola con tutto
    if (scenes.length === 0 && text.trim()) {
      scenes.push({
        index: 0,
        title: 'Scena Unica',
        prompts: [text.trim()],
        duration: 6,
        character: null,
        environment: null
      });
    }
    
    return scenes;
  },
  
  // Combina scene per clip lunga
  combineForLongClip(scenes, targetDuration) {
    const combined = [];
    let currentGroup = [];
    let currentDuration = 0;
    const clipsPerGroup = Math.ceil(targetDuration / 6);
    
    for (const scene of scenes) {
      currentGroup.push(scene);
      
      if (currentGroup.length >= clipsPerGroup) {
        combined.push({
          scenes: [...currentGroup],
          prompt: this.buildCombinedPrompt(currentGroup),
          duration: Math.min(targetDuration, currentGroup.length * 6)
        });
        currentGroup = [];
      }
    }
    
    // Aggiungi gruppi rimanenti
    if (currentGroup.length > 0) {
      combined.push({
        scenes: [...currentGroup],
        prompt: this.buildCombinedPrompt(currentGroup),
        duration: currentGroup.length * 6
      });
    }
    
    return combined;
  },
  
  // Costruisce prompt combinato da scene
  buildCombinedPrompt(scenes) {
    return scenes.map(s => {
      const titlePart = s.title ? `[${s.title}] ` : '';
      return titlePart + s.prompts.join(' ');
    }).join(' | ');
  }
};

// ═══════════════════════════════════════════════════════════
// CLIP INTELLIGENCE ENGINE
// ═══════════════════════════════════════════════════════════

const ClipEngine = {
  // Formati clip supportati
  formats: {
    micro: 4,    // 4 secondi
    short: 6,    // 6 secondi
    medium: 8,   // 8 secondi
    long: 15,    // 15 secondi
    full: 30     // 30 secondi
  },
  
  // Decisione automatica clip
  decideClipFormat(sceneCount, targetDuration) {
    // Se target è 30s e abbiamo 5 scene da 6s, combiniamo
    if (targetDuration === 30 && sceneCount > 1) {
      const groups = Math.ceil(sceneCount / 5);
      return {
        clipDuration: 6,
        scenesPerClip: Math.ceil(sceneCount / groups),
        totalClips: groups,
        mode: 'combined_30s'
      };
    }
    
    // Altrimenti clip singola
    return {
      clipDuration: targetDuration,
      scenesPerClip: 1,
      totalClips: sceneCount,
      mode: 'single'
    };
  },
  
  // Genera sequenza di clip da copione
  generateClipSequence(scenes, options = {}) {
    const { targetDuration = 6, autoCombine = true } = options;
    
    // Se autoCombine e target è lungo
    if (autoCombine && targetDuration >= 15 && scenes.length > 1) {
      return this.combineForLongClip(scenes, targetDuration);
    }
    
    // Altrimenti una clip per scena
    return scenes.map((scene, i) => ({
      index: i,
      scene: scene,
      prompt: scene.prompts.join(' '),
      duration: Math.min(targetDuration, scene.duration || 6),
      startTime: i * (scene.duration || 6)
    }));
  },
  
  // Combina scene per clip lunga
  combineForLongClip(scenes, targetDuration) {
    const clips = [];
    const scenesPerClip = Math.ceil(scenes.length / Math.ceil(targetDuration / 6));
    
    for (let i = 0; i < scenes.length; i += scenesPerClip) {
      const group = scenes.slice(i, i + scenesPerClip);
      clips.push({
        index: clips.length,
        scenes: group,
        prompt: group.map(s => `[${s.title || 'S' + s.index}] ${s.prompts.join(' ')}`).join(' '),
        duration: Math.min(targetDuration, group.length * 6),
        sceneRange: `${i + 1}-${Math.min(i + scenesPerClip, scenes.length)}`
      });
    }
    
    return clips;
  }
};

// ═══════════════════════════════════════════════════════════
// GENERATIONS TRACKER - Quote e limiti
// ═══════════════════════════════════════════════════════════

const QuotaTracker = {
  quota: {
    daily: { total: 0, used: 0, remaining: 0 },
    monthly: { total: 0, used: 0, remaining: 0 },
    unlimited: false
  },
  
  update(data) {
    this.quota = { ...this.quota, ...data };
    this.save();
    this.broadcast();
  },
  
  recordGeneration(success) {
    if (!this.quota.unlimited) {
      this.quota.daily.used++;
      this.quota.monthly.used++;
      this.quota.daily.remaining = Math.max(0, this.quota.daily.total - this.quota.daily.used);
      this.quota.monthly.remaining = Math.max(0, this.quota.monthly.total - this.quota.monthly.used);
    }
    this.save();
    this.broadcast();
  },
  
  canGenerate() {
    if (this.quota.unlimited) return { allowed: true };
    return {
      allowed: this.quota.daily.remaining > 0,
      remaining: this.quota.daily.remaining
    };
  },
  
  getDisplay() {
    if (this.quota.unlimited) {
      return { status: 'unlimited', daily: '∞', monthly: '∞', remaining: '∞' };
    }
    return {
      status: this.quota.daily.remaining > 0 ? 'active' : 'depleted',
      daily: { used: this.quota.daily.used, total: this.quota.daily.total },
      monthly: { used: this.quota.monthly.used, total: this.quota.monthly.total },
      remaining: this.quota.daily.remaining
    };
  },
  
  async save() {
    await chrome.storage.local.set({ quota: this.quota });
  },
  
  async load() {
    const result = await chrome.storage.local.get('quota');
    if (result.quota) this.quota = result.quota;
  },
  
  broadcast() {
    chrome.runtime.sendMessage({ type: 'QUOTA_UPDATE', quota: this.getDisplay() }).catch(() => {});
  }
};

// ═══════════════════════════════════════════════════════════
// AUTO FLOW STATE
// ═══════════════════════════════════════════════════════════

const AutoFlow = {
  isRunning: false,
  isPaused: false,
  currentClipIndex: 0,
  clips: [],
  config: {
    clipDuration: 6,
    autoCombine: true,
    delayBetween: 2000,
    contextMode: 'character' // 'character' | 'environment' | 'both'
  },
  
  start(clips, config = {}) {
    this.clips = clips;
    this.config = { ...this.config, ...config };
    this.isRunning = true;
    this.isPaused = false;
    this.currentClipIndex = 0;
    this.broadcast();
  },
  
  pause() {
    this.isPaused = true;
    this.broadcast();
  },
  
  resume() {
    this.isPaused = false;
    this.broadcast();
  },
  
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.broadcast();
  },
  
  nextClip() {
    this.currentClipIndex++;
    if (this.currentClipIndex >= this.clips.length) {
      this.stop();
    }
    this.broadcast();
  },
  
  getCurrentClip() {
    return this.clips[this.currentClipIndex];
  },
  
  getProgress() {
    return {
      current: this.currentClipIndex + 1,
      total: this.clips.length,
      percentage: Math.round(((this.currentClipIndex + 1) / this.clips.length) * 100),
      clip: this.getCurrentClip()
    };
  },
  
  broadcast() {
    chrome.runtime.sendMessage({ 
      type: 'FLOW_UPDATE', 
      flow: { isRunning: this.isRunning, isPaused: this.isPaused },
      progress: this.getProgress()
    }).catch(() => {});
  }
};

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[Background] Message:', msg.type);
  
  switch (msg.type) {
    // === CHARACTER ===
    case 'SAVE_CHARACTER':
      saveCharacter(msg.data).then(r => sendResponse(r));
      return true;
      
    case 'GET_CHARACTERS':
      sendResponse({ success: true, characters: DB.characters });
      return true;
      
    case 'DELETE_CHARACTER':
      deleteCharacter(msg.id).then(r => sendResponse(r));
      return true;
      
    // === ENVIRONMENT ===
    case 'SAVE_ENVIRONMENT':
      saveEnvironment(msg.data).then(r => sendResponse(r));
      return true;
      
    case 'GET_ENVIRONMENTS':
      sendResponse({ success: true, environments: DB.environments });
      return true;
      
    case 'DELETE_ENVIRONMENT':
      deleteEnvironment(msg.id).then(r => sendResponse(r));
      return true;
      
    // === SCRIPT ===
    case 'LOAD_SCRIPT':
      loadScript(msg.data).then(r => sendResponse(r));
      return true;
      
    case 'PARSE_SCRIPT':
      const scenes = ScriptParser.parseScript(msg.text);
      sendResponse({ success: true, scenes });
      return true;
      
    case 'GENERATE_CLIP_SEQUENCE':
      const clips = ClipEngine.generateClipSequence(msg.scenes, msg.options);
      sendResponse({ success: true, clips });
      return true;
      
    case 'SAVE_SCRIPT':
      saveScript(msg.data).then(r => sendResponse(r));
      return true;
      
    case 'GET_SCRIPTS':
      sendResponse({ success: true, scripts: DB.scripts });
      return true;
      
    // === AUTO FLOW ===
    case 'START_FLOW':
      AutoFlow.start(msg.clips, msg.config);
      sendResponse({ success: true });
      return true;
      
    case 'PAUSE_FLOW':
      AutoFlow.pause();
      sendResponse({ success: true });
      return true;
      
    case 'RESUME_FLOW':
      AutoFlow.resume();
      sendResponse({ success: true });
      return true;
      
    case 'STOP_FLOW':
      AutoFlow.stop();
      sendResponse({ success: true });
      return true;
      
    case 'GET_FLOW_STATUS':
      sendResponse({ success: true, flow: AutoFlow, progress: AutoFlow.getProgress() });
      return true;
      
    case 'NEXT_CLIP':
      AutoFlow.nextClip();
      sendResponse({ success: true, clip: AutoFlow.getCurrentClip() });
      return true;
      
    // === QUOTA ===
    case 'UPDATE_QUOTA':
      QuotaTracker.update(msg.data);
      sendResponse({ success: true });
      return true;
      
    case 'GET_QUOTA':
      sendResponse({ success: true, quota: QuotaTracker.getDisplay() });
      return true;
      
    case 'RECORD_GENERATION':
      QuotaTracker.recordGeneration(msg.success);
      sendResponse({ success: true, canGenerate: QuotaTracker.canGenerate() });
      return true;
      
    // === CONFIG ===
    case 'GET_CONFIG':
      sendResponse({ success: true, config: AutoFlow.config });
      return true;
      
    case 'SET_CONFIG':
      AutoFlow.config = { ...AutoFlow.config, ...msg.config };
      saveConfig();
      sendResponse({ success: true });
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown type' });
  }
});

// ═══════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════

async function saveCharacter(data) {
  const id = data.id || 'char_' + Date.now();
  DB.characters[id] = { id, ...data, createdAt: Date.now(), usageCount: 0 };
  await saveDB();
  return { success: true, id };
}

async function deleteCharacter(id) {
  delete DB.characters[id];
  await saveDB();
  return { success: true };
}

async function saveEnvironment(data) {
  const id = data.id || 'env_' + Date.now();
  DB.environments[id] = { id, ...data, createdAt: Date.now(), usageCount: 0 };
  await saveDB();
  return { success: true, id };
}

async function deleteEnvironment(id) {
  delete DB.environments[id];
  await saveDB();
  return { success: true };
}

async function saveScript(data) {
  const id = data.id || 'script_' + Date.now();
  const parsed = ScriptParser.parseScript(data.text);
  DB.scripts[id] = { id, name: data.name, text: data.text, scenes: parsed, createdAt: Date.now() };
  await saveDB();
  return { success: true, id, scenes: parsed };
}

async function loadScript(id) {
  const script = DB.scripts[id];
  if (!script) return { success: false, error: 'Not found' };
  return { success: true, script, scenes: script.scenes };
}

async function saveConfig() {
  await chrome.storage.local.set({ 
    config: AutoFlow.config,
    db: DB
  });
}

async function saveDB() {
  await chrome.storage.local.set({ db: DB });
}

async function loadDB() {
  const result = await chrome.storage.local.get(['db', 'quota', 'config']);
  if (result.db) {
    DB.characters = result.db.characters || {};
    DB.environments = result.db.environments || {};
    DB.scripts = result.db.scripts || {};
    DB.projects = result.db.projects || {};
  }
  if (result.quota) QuotaTracker.quota = result.quota;
  if (result.config) AutoFlow.config = result.config;
}

// ═══════════════════════════════════════════════════════════
// OUTPUT FOLDER SYSTEM
// ═══════════════════════════════════════════════════════════

const OutputFolder = {
  base: 'GeminiGen-AutoFlow',
  
  structure: {
    scripts: '01_Scripts',
    characters: '02_Characters',
    environments: '03_Environments',
    clips_6s: '04_Clips_6s',
    clips_8s: '05_Clips_8s',
    clips_15s: '06_Clips_15s',
    clips_30s: '07_Clips_30s',
    combined: '08_Combined',
    exports: '09_Exports'
  },
  
  getPath(type, filename) {
    return `${this.base}/${this.structure[type] || '00_Other'}/${filename}`;
  }
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

loadDB().then(async () => {
  await QuotaTracker.load();
  console.log('[GeminiGen Auto Flow Pro] Initialized');
  QuotaTracker.broadcast();
});