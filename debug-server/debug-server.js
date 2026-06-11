// ═══════════════════════════════════════════════════════════
// GEMINIGEN AUTO FLOW - Debug Server
// Server locale per testare il parsing dell'estensione
// ═══════════════════════════════════════════════════════════

const http = require('http');
const url = require('url');

// Storage per i dati
const debugData = {
  scripts: [],
  parsedScenes: [],
  lastParse: null
};

// Crea server HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // ═══════════════════════════════════════════════════════════
  // API ENDPOINTS
  // ═══════════════════════════════════════════════════════════
  
  // POST /parse - L'estensione chiama questo per reportare il parsing
  if (pathname === '/parse' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        debugData.parsedScenes = data.scenes || [];
        debugData.lastParse = new Date().toISOString();
        
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║  🧪 DEBUG: Parsed ' + (data.scenes?.length || 0) + ' scenes from script');
        console.log('╚══════════════════════════════════════════════════════╝\n');
        
        if (data.scenes) {
          data.scenes.forEach((scene, i) => {
            console.log(`Scene ${i + 1} [Prompt ${scene.promptNumber || '?'}]`);
            console.log(`  Visual: ${(scene.visualDescription || '').substring(0, 80)}...`);
            console.log(`  Voice:  ${(scene.voiceover || '').substring(0, 80)}...`);
            console.log(`  Audio:  ${(scene.audio || 'none')}`);
            console.log('');
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: data.scenes?.length || 0 }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // GET /scenes - Ritorna le scene parsate
  if (pathname === '/scenes') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: debugData.parsedScenes.length,
      scenes: debugData.parsedScenes,
      lastParse: debugData.lastParse
    }));
    return;
  }
  
  // GET /status - Status del server
  if (pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      scenes: debugData.parsedScenes.length,
      lastParse: debugData.lastParse,
      uptime: process.uptime()
    }));
    return;
  }
  
  // GET /test - Test con copione di esempio
  if (pathname === '/test') {
    const testScript = `PROMPT 001
Crea un video cinematico di esattamente 6 secondi.
DNA: Ridley Scott cinematic documentary, photorealistic 4K, heavy film grain.
Descrizione visiva: Wide establishing shot del vasto deserto del Kalahari al tramonto, dune rosse infinite.
Voiceover: Voce maschile profonda e seria che dice: "Il sette maggio del 1989..."
Suono di sottofondo: Vento leggero sulla sabbia e musica drammatica bassa.

---

PROMPT 002
Crea un video cinematico di esattamente 6 secondi.
DNA: Ridley Scott cinematic documentary, photorealistic 4K, heavy film grain.
Descrizione visiva: Shot ampio del deserto con cielo infuocato.
Voiceover: Voce maschile che dice: "Un oggetto non identificato..."
Suono di sottofondo: Vento del deserto.`;

    // Simula il parsing
    const mockScenes = simulateParse(testScript);
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>GeminiGen Auto Flow - Debug</title>
  <style>
    body { font-family: monospace; background: #0f0f1a; color: #fff; padding: 20px; }
    h1 { color: #667eea; }
    .scene { background: #1a1a2e; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .scene-num { color: #667eea; font-size: 20px; font-weight: bold; }
    .field { margin: 5px 0; }
    .label { color: #4ade80; }
    .value { color: #fff; }
    .ok { color: #4ade80; }
    pre { background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🚀 GeminiGen Auto Flow - Debug Server</h1>
  <p class="ok">✓ Server running on port 3001</p>
  
  <h2>Test Parsing (${mockScenes.length} scenes)</h2>
  
  ${mockScenes.map((s, i) => `
    <div class="scene">
      <div class="scene-num">Prompt ${s.promptNumber}</div>
      <div class="field"><span class="label">Visual:</span> <span class="value">${s.visualDescription?.substring(0, 100)}...</span></div>
      <div class="field"><span class="label">Voice:</span> <span class="value">${s.voiceover?.substring(0, 100)}...</span></div>
      <div class="field"><span class="label">Audio:</span> <span class="value">${s.audio || 'none'}</span></div>
    </div>
  `).join('')}
  
  <h2>API Endpoints</h2>
  <pre>
GET  /status     - Server status
GET  /scenes      - Parsed scenes JSON
POST /parse       - Extension reports parsing (JSON body with {scenes: [...]})
  </pre>
</body>
</html>`);
    return;
  }
  
  // Default: home page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>GeminiGen Auto Flow - Debug</title>
  <style>
    body { font-family: monospace; background: #0f0f1a; color: #fff; padding: 20px; }
    h1 { color: #667eea; }
    .ok { color: #4ade80; }
    pre { background: #000; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>🚀 GeminiGen Auto Flow - Debug Server</h1>
  <p class="ok">✓ Server running on port 3001</p>
  
  <h2>Status</h2>
  <pre>
Scenes parsed: ${debugData.parsedScenes.length}
Last parse: ${debugData.lastParse || 'Never'}
  </pre>
  
  <h2>API Endpoints</h2>
  <pre>
GET  /status     - Server status
GET  /scenes      - Parsed scenes JSON  
GET  /test        - Test parsing with sample script
POST /parse       - Extension reports parsing results
  </pre>
  
  <h2>Instructions</h2>
  <p>1. Open the extension in Chrome</p>
  <p>2. Load a script with PROMPT 001, PROMPT 002, etc.</p>
  <p>3. Click "Analizza" to parse</p>
  <p>4. The extension will POST to /parse</p>
  <p>5. Refresh this page to see results</p>
</body>
</html>`);
});

// ═══════════════════════════════════════════════════════════
// SIMULATE PARSE (per test locale)
// ═══════════════════════════════════════════════════════════

function simulateParse(text) {
  const scenes = [];
  const promptMatches = text.matchAll(/PROMPT\s+(\d+)(?:\s*\n|\s*)([\s\S]*?)(?=(?:\s*PROMPT\s+\d+)|$)/gi);
  
  for (const match of promptMatches) {
    const promptNum = match[1];
    const content = match[2];
    
    const visualMatch = content.match(/Descrizione visiva:\s*(.+?)(?=\s*(?:Voiceover|Suono|$))/is);
    const voiceMatch = content.match(/Voiceover:\s*(.+?)(?=\s*(?:Suono|$))/is);
    const audioMatch = content.match(/Suono di sottofondo:\s*(.+?)(?=\s*(?:$))/is);
    
    scenes.push({
      promptNumber: parseInt(promptNum, 10),
      visualDescription: visualMatch ? visualMatch[1].trim() : '',
      voiceover: voiceMatch ? voiceMatch[1].trim() : '',
      audio: audioMatch ? audioMatch[1].trim() : ''
    });
  }
  
  return scenes;
}

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  🚀 GeminiGen Auto Flow - Debug Server              ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                  ║`);
  console.log('║  Test:     http://localhost:3001/test             ║');
  console.log('║  API:      POST /parse | GET /scenes | GET /status ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Waiting for extension to connect...');
  console.log('');
});

// Gestisci shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  server.close();
  process.exit();
});