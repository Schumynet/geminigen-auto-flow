// ═══════════════════════════════════════════════════════════
// GEMINIGEN AUTO FLOW PRO - Popup Script v2.0
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  
  let characters = {};
  let environments = {};
  let scripts = {};
  let scenes = [];
  let clips = [];
  let selectedCharacter = null;
  let selectedEnvironment = null;
  let clipDuration = 6;
  let mode = 'single'; // 'single' | 'combined'
  
  let flowState = {
    isRunning: false,
    isPaused: false,
    currentIndex: 0,
    total: 0
  };
  
  // ═══════════════════════════════════════════════════════════
  // ELEMENTS
  // ═══════════════════════════════════════════════════════════
  
  const $ = id => document.getElementById(id);
  
  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');
  
  // Quota
  const dailyUsedEl = $('dailyUsed');
  const dailyTotalEl = $('dailyTotal');
  const monthlyUsedEl = $('monthlyUsed');
  const monthlyTotalEl = $('monthlyTotal');
  const quotaBadge = $('quotaBadge');
  
  // Script
  const scriptInput = $('scriptInput');
  const fileInput = $('fileInput');
  const btnParse = $('btnParse');
  const scenesCard = $('scenesCard');
  const scenesPreview = $('scenesPreview');
  const sceneCount = $('sceneCount');
  const intelligenceText = $('intelligenceText');
  
  // Duration
  const durationOptions = document.querySelectorAll('.duration-option');
  const modeButtons = document.querySelectorAll('.mode-btn');
  
  // Select
  const selectCharacter = $('selectCharacter');
  const selectEnvironment = $('selectEnvironment');
  
  // Actions
  const btnStart = $('btnStart');
  const progressSection = $('progressSection');
  const progressLabel = $('progressLabel');
  const progressPercent = $('progressPercent');
  const progressFill = $('progressFill');
  const progressClip = $('progressClip');
  const btnPause = $('btnPause');
  const btnStop = $('btnStop');
  
  // Lists
  const charactersList = $('charactersList');
  const environmentsList = $('environmentsList');
  const scriptsList = $('scriptsList');
  const clipsList = $('clipsList');
  
  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  
  init();
  
  async function init() {
    await loadAllData();
    await loadQuota();
    await loadFlowStatus();
    setupEventListeners();
    setupMessageListener();
  }
  
  async function loadAllData() {
    // Characters
    const charsResp = await sendMsg({ type: 'GET_CHARACTERS' });
    if (charsResp.success) {
      characters = charsResp.characters || {};
      renderCharacters();
    }
    
    // Environments
    const envsResp = await sendMsg({ type: 'GET_ENVIRONMENTS' });
    if (envsResp.success) {
      environments = envsResp.environments || {};
      renderEnvironments();
    }
    
    // Scripts
    const scriptsResp = await sendMsg({ type: 'GET_SCRIPTS' });
    if (scriptsResp.success) {
      scripts = scriptsResp.scripts || {};
      renderScripts();
    }
  }
  
  async function loadQuota() {
    const resp = await sendMsg({ type: 'GET_QUOTA' });
    if (resp.success) updateQuotaUI(resp.quota);
  }
  
  async function loadFlowStatus() {
    const resp = await sendMsg({ type: 'GET_FLOW_STATUS' });
    if (resp.success) {
      flowState = {
        isRunning: resp.flow.isRunning,
        isPaused: resp.flow.isPaused,
        currentIndex: resp.progress.current - 1,
        total: resp.progress.total
      };
      updateFlowUI();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════
  
  function setupEventListeners() {
    // Tabs
    tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // File upload
    fileInput.addEventListener('change', handleFileUpload);
    
    // Parse button
    btnParse.addEventListener('click', parseScript);
    
    // Duration options
    durationOptions.forEach(opt => {
      opt.addEventListener('click', () => selectDuration(parseInt(opt.dataset.duration)));
    });
    
    // Mode buttons
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => selectMode(btn.dataset.mode));
    });
    
    // Character/Environment select
    selectCharacter.addEventListener('click', () => switchTab('memory'));
    selectEnvironment.addEventListener('click', () => switchTab('memory'));
    
    // Start button
    btnStart.addEventListener('click', startAutoFlow);
    
    // Control buttons
    btnPause.addEventListener('click', togglePause);
    btnStop.addEventListener('click', stopFlow);
    
    // Add buttons
    $('btnAddCharacter').addEventListener('click', () => openModal('modalCharacter'));
    $('btnAddEnvironment').addEventListener('click', () => openModal('modalEnvironment'));
    
    // Modal buttons
    $('cancelChar').addEventListener('click', () => closeModal('modalCharacter'));
    $('saveChar').addEventListener('click', saveCharacter);
    $('cancelEnv').addEventListener('click', () => closeModal('modalEnvironment'));
    $('saveEnv').addEventListener('click', saveEnvironment);
  }
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === 'QUOTA_UPDATE') updateQuotaUI(msg.quota);
      if (msg.type === 'FLOW_UPDATE') {
        flowState = {
          isRunning: msg.flow.isRunning,
          isPaused: msg.flow.isPaused,
          currentIndex: msg.progress.current - 1,
          total: msg.progress.total
        };
        updateFlowUI();
        updateProgressUI(msg.progress);
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════
  
  function switchTab(tabName) {
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`section-${tabName}`).classList.add('active');
  }
  
  // ═══════════════════════════════════════════════════════════
  // SCRIPT PARSING
  // ═══════════════════════════════════════════════════════════
  
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      scriptInput.value = event.target.result;
      parseScript();
    };
    reader.readAsText(file);
  }
  
  async function parseScript() {
    const text = scriptInput.value.trim();
    if (!text) {
      alert('Inserisci il copione prima!');
      return;
    }
    
    // Parse via background
    const resp = await sendMsg({ type: 'PARSE_SCRIPT', text });
    
    if (resp.success) {
      scenes = resp.scenes;
      renderScenes();
      generateClips();
    }
  }
  
  function renderScenes() {
    if (scenes.length === 0) {
      scenesCard.style.display = 'none';
      return;
    }
    
    scenesCard.style.display = 'block';
    sceneCount.textContent = scenes.length;
    
    scenesPreview.innerHTML = scenes.map((s, i) => `
      <div class="scene-item">
        <div class="scene-index">${i + 1}</div>
        <div class="scene-title">${escapeHtml(s.title || 'Scena ' + (i+1))}</div>
        <div class="scene-prompt">${escapeHtml(s.prompts[0]?.substring(0, 40) || '')}...</div>
      </div>
    `).join('');
    
    // Update intelligence text
    updateIntelligenceInfo();
  }
  
  function updateIntelligenceInfo() {
    if (scenes.length === 0) {
      intelligenceText.textContent = 'Carica un copione per attivare';
      return;
    }
    
    if (mode === 'combined' && clipDuration >= 15) {
      const combinedClips = Math.ceil(scenes.length / 5);
      intelligenceText.innerHTML = `
        🧠 <strong>Clip Intelligence Attivo</strong><br>
        ${scenes.length} scene → ${combinedClips} clip da ${clipDuration}s<br>
        Combinazione automatica per clip lunghe
      `;
    } else {
      intelligenceText.innerHTML = `
        🧠 <strong>Clip Intelligence Attivo</strong><br>
        ${scenes.length} scene → ${scenes.length} clip da ${clipDuration}s
      `;
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // CLIP GENERATION
  // ═══════════════════════════════════════════════════════════
  
  async function generateClips() {
    const options = {
      targetDuration: clipDuration,
      autoCombine: mode === 'combined'
    };
    
    const resp = await sendMsg({ 
      type: 'GENERATE_CLIP_SEQUENCE', 
      scenes,
      options 
    });
    
    if (resp.success) {
      clips = resp.clips;
      renderClips();
    }
  }
  
  function renderClips() {
    if (clips.length === 0) {
      clipsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎬</div>
          <div>Nessuna clip in coda</div>
        </div>
      `;
      return;
    }
    
    clipsList.innerHTML = clips.map((clip, i) => `
      <div class="list-item ${i === flowState.currentIndex ? 'selected' : ''}">
        <div class="list-item-icon">${i + 1}</div>
        <div class="list-item-info">
          <div class="list-item-name">Clip ${i + 1} - ${clip.duration}s</div>
          <div class="list-item-meta">${clip.prompt?.substring(0, 50) || ''}...</div>
        </div>
      </div>
    `).join('');
  }
  
  // ═══════════════════════════════════════════════════════════
  // DURATION & MODE
  // ═══════════════════════════════════════════════════════════
  
  function selectDuration(duration) {
    clipDuration = duration;
    durationOptions.forEach(opt => {
      opt.classList.toggle('selected', parseInt(opt.dataset.duration) === duration);
    });
    if (scenes.length > 0) generateClips();
    updateIntelligenceInfo();
  }
  
  function selectMode(newMode) {
    mode = newMode;
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (scenes.length > 0) generateClips();
    updateIntelligenceInfo();
  }
  
  // ═══════════════════════════════════════════════════════════
  // AUTO FLOW CONTROLS
  // ═══════════════════════════════════════════════════════════
  
  async function startAutoFlow() {
    if (clips.length === 0) {
      alert('Prima analizza un copione!');
      return;
    }
    
    if (!selectedCharacter) {
      alert('Seleziona un personaggio!');
      return;
    }
    
    const config = {
      clipDuration,
      autoCombine: mode === 'combined',
      characterId: selectedCharacter,
      environmentId: selectedEnvironment
    };
    
    await sendMsg({ type: 'START_FLOW', clips, config });
    
    flowState = { isRunning: true, isPaused: false, currentIndex: 0, total: clips.length };
    updateFlowUI();
  }
  
  async function togglePause() {
    if (flowState.isPaused) {
      await sendMsg({ type: 'RESUME_FLOW' });
    } else {
      await sendMsg({ type: 'PAUSE_FLOW' });
    }
  }
  
  async function stopFlow() {
    await sendMsg({ type: 'STOP_FLOW' });
    flowState = { isRunning: false, isPaused: false, currentIndex: 0, total: 0 };
    updateFlowUI();
  }
  
  function updateFlowUI() {
    const statusDot = document.getElementById('flowStatusDot');
    const statusText = document.getElementById('flowStatusText');
    
    if (!flowState.isRunning) {
      statusDot.className = 'status-dot stopped';
      statusText.textContent = 'Inattivo';
      progressSection.style.display = 'none';
      btnStart.disabled = false;
      btnStart.textContent = '▶️ Avvia Auto Flow';
    } else if (flowState.isPaused) {
      statusDot.className = 'status-dot paused';
      statusText.textContent = '⏸️ Pausato';
      btnPause.textContent = '▶️ Riprendi';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = '🟢 In corso';
      progressSection.style.display = 'block';
      btnStart.disabled = true;
      btnStart.textContent = '🎬 In Generazione...';
      btnPause.textContent = '⏸️ Pausa';
    }
  }
  
  function updateProgressUI(progress) {
    progressLabel.textContent = `Generazione ${progress.current}/${progress.total}`;
    progressPercent.textContent = `${progress.percentage}%`;
    progressFill.style.width = `${progress.percentage}%`;
    progressClip.textContent = `Clip: ${progress.clip?.prompt?.substring(0, 50) || '-'}...`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // QUOTA UI
  // ═══════════════════════════════════════════════════════════
  
  function updateQuotaUI(quota) {
    if (quota.status === 'unlimited') {
      dailyUsedEl.textContent = '∞';
      dailyTotalEl.textContent = '∞';
      monthlyUsedEl.textContent = '∞';
      monthlyTotalEl.textContent = '∞';
      quotaBadge.className = 'quota-badge unlimited';
      quotaBadge.textContent = '∞ ILLIMITATO';
    } else {
      dailyUsedEl.textContent = quota.daily.used;
      dailyTotalEl.textContent = quota.daily.total || '?';
      monthlyUsedEl.textContent = quota.monthly.used;
      monthlyTotalEl.textContent = quota.monthly.total || '?';
      
      const remaining = quota.remaining;
      if (remaining <= 0) {
        quotaBadge.className = 'quota-badge depleted';
        quotaBadge.textContent = '⛔ ESAURITE';
        btnStart.disabled = true;
      } else if (remaining <= 5) {
        quotaBadge.className = 'quota-badge warning';
        quotaBadge.textContent = `⚠️ ${remaining}`;
        btnStart.disabled = false;
      } else {
        quotaBadge.className = 'quota-badge';
        quotaBadge.textContent = `✅ ${remaining}`;
        btnStart.disabled = false;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // CHARACTER & ENVIRONMENT
  // ═══════════════════════════════════════════════════════════
  
  function selectCharacterItem(id) {
    selectedCharacter = id;
    updateCharacterDisplay();
  }
  
  function selectEnvironmentItem(id) {
    selectedEnvironment = id;
    updateEnvironmentDisplay();
  }
  
  function updateCharacterDisplay() {
    if (selectedCharacter && characters[selectedCharacter]) {
      const char = characters[selectedCharacter];
      selectCharacter.innerHTML = `
        <div class="select-avatar">👤</div>
        <div class="select-info">
          <div class="select-name">${escapeHtml(char.name)}</div>
          <div class="select-desc">${escapeHtml(char.description?.substring(0, 30) || '')}...</div>
        </div>
      `;
    } else {
      selectCharacter.innerHTML = `
        <div class="select-avatar">👤</div>
        <div class="select-info">
          <div class="select-name">Nessuno selezionato</div>
          <div class="select-desc">Clicca per selezionare</div>
        </div>
      `;
    }
  }
  
  function updateEnvironmentDisplay() {
    if (selectedEnvironment && environments[selectedEnvironment]) {
      const env = environments[selectedEnvironment];
      selectEnvironment.innerHTML = `
        <div class="select-avatar">🏠</div>
        <div class="select-info">
          <div class="select-name">${escapeHtml(env.name)}</div>
          <div class="select-desc">${escapeHtml(env.description?.substring(0, 30) || '')}...</div>
        </div>
      `;
    } else {
      selectEnvironment.innerHTML = `
        <div class="select-avatar">🏠</div>
        <div class="select-info">
          <div class="select-name">Nessuno selezionato</div>
          <div class="select-desc">Clicca per selezionare</div>
        </div>
      `;
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // RENDER LISTS
  // ═══════════════════════════════════════════════════════════
  
  function renderCharacters() {
    const arr = Object.values(characters);
    
    if (arr.length === 0) {
      charactersList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👤</div>
          <div>Nessun personaggio</div>
        </div>
      `;
      return;
    }
    
    charactersList.innerHTML = arr.map(char => `
      <div class="list-item ${selectedCharacter === char.id ? 'selected' : ''}" data-id="${char.id}">
        <div class="list-item-icon">👤</div>
        <div class="list-item-info">
          <div class="list-item-name">${escapeHtml(char.name)}</div>
          <div class="list-item-meta">${escapeHtml(char.description?.substring(0, 40) || '')}</div>
        </div>
        <button class="list-item-delete" data-id="${char.id}">🗑️</button>
      </div>
    `).join('');
    
    // Click handlers
    charactersList.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.list-item-delete')) {
          selectCharacterItem(item.dataset.id);
          switchTab('script');
        }
      });
    });
    
    charactersList.querySelectorAll('.list-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCharacter(btn.dataset.id);
      });
    });
  }
  
  function renderEnvironments() {
    const arr = Object.values(environments);
    
    if (arr.length === 0) {
      environmentsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏠</div>
          <div>Nessun ambiente</div>
        </div>
      `;
      return;
    }
    
    environmentsList.innerHTML = arr.map(env => `
      <div class="list-item ${selectedEnvironment === env.id ? 'selected' : ''}" data-id="${env.id}">
        <div class="list-item-icon">🏠</div>
        <div class="list-item-info">
          <div class="list-item-name">${escapeHtml(env.name)}</div>
          <div class="list-item-meta">${escapeHtml(env.description?.substring(0, 40) || '')}</div>
        </div>
        <button class="list-item-delete" data-id="${env.id}">🗑️</button>
      </div>
    `).join('');
    
    environmentsList.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.list-item-delete')) {
          selectEnvironmentItem(item.dataset.id);
          switchTab('script');
        }
      });
    });
    
    environmentsList.querySelectorAll('.list-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEnvironment(btn.dataset.id);
      });
    });
  }
  
  function renderScripts() {
    const arr = Object.values(scripts);
    
    if (arr.length === 0) {
      scriptsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📜</div>
          <div>Nessun copione</div>
        </div>
      `;
      return;
    }
    
    scriptsList.innerHTML = arr.map(script => `
      <div class="list-item" data-id="${script.id}">
        <div class="list-item-icon">📜</div>
        <div class="list-item-info">
          <div class="list-item-name">${escapeHtml(script.name)}</div>
          <div class="list-item-meta">${script.scenes?.length || 0} scene</div>
        </div>
      </div>
    `).join('');
    
    scriptsList.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', () => {
        loadScriptById(item.dataset.id);
      });
    });
  }
  
  async function loadScriptById(id) {
    const resp = await sendMsg({ type: 'LOAD_SCRIPT', data: { id } });
    if (resp.success) {
      scriptInput.value = resp.script.text;
      scenes = resp.scenes;
      renderScenes();
      generateClips();
      switchTab('script');
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════
  
  async function saveCharacter() {
    const name = $('charName').value.trim();
    const description = $('charDesc').value.trim();
    const prompt = $('charPrompt').value.trim();
    
    if (!name) {
      alert('Inserisci un nome');
      return;
    }
    
    await sendMsg({ type: 'SAVE_CHARACTER', data: { name, description, prompt } });
    closeModal('modalCharacter');
    clearModal('modalCharacter');
    
    const resp = await sendMsg({ type: 'GET_CHARACTERS' });
    if (resp.success) {
      characters = resp.characters;
      renderCharacters();
    }
  }
  
  async function deleteCharacter(id) {
    if (!confirm('Eliminare questo personaggio?')) return;
    await sendMsg({ type: 'DELETE_CHARACTER', id });
    
    if (selectedCharacter === id) selectedCharacter = null;
    
    const resp = await sendMsg({ type: 'GET_CHARACTERS' });
    if (resp.success) {
      characters = resp.characters;
      renderCharacters();
      updateCharacterDisplay();
    }
  }
  
  async function saveEnvironment() {
    const name = $('envName').value.trim();
    const description = $('envDesc').value.trim();
    const lighting = $('envLighting').value.trim();
    
    if (!name) {
      alert('Inserisci un nome');
      return;
    }
    
    await sendMsg({ type: 'SAVE_ENVIRONMENT', data: { name, description, lighting } });
    closeModal('modalEnvironment');
    clearModal('modalEnvironment');
    
    const resp = await sendMsg({ type: 'GET_ENVIRONMENTS' });
    if (resp.success) {
      environments = resp.environments;
      renderEnvironments();
    }
  }
  
  async function deleteEnvironment(id) {
    if (!confirm('Eliminare questo ambiente?')) return;
    await sendMsg({ type: 'DELETE_ENVIRONMENT', id });
    
    if (selectedEnvironment === id) selectedEnvironment = null;
    
    const resp = await sendMsg({ type: 'GET_ENVIRONMENTS' });
    if (resp.success) {
      environments = resp.environments;
      renderEnvironments();
      updateEnvironmentDisplay();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // MODAL HELPERS
  // ═══════════════════════════════════════════════════════════
  
  function openModal(id) {
    document.getElementById(id).classList.add('active');
  }
  
  function closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }
  
  function clearModal(id) {
    document.querySelectorAll(`#${id} input, #${id} textarea`).forEach(el => el.value = '');
  }
  
  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════
  
  function sendMsg(msg) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(msg, resp => resolve(resp || { success: false }));
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
});