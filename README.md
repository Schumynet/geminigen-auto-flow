# 🚀 GeminiGen Auto Flow Pro v2.0

Estensione browser Chrome/Firefox per automatizzare la generazione di clip video su **geminigen.ai** senza API.

---

## ✨ Features Principali

### 📝 Caricamento Copione
- **Inserimento manuale** nella casella di testo
- **Upload file .txt** per copioni lunghi
- **Suddivisione automatica** per scena
- Supporto formati:
  - `[SCENA 1]`, `[SCENA 2]`
  - `SCENE 1:`, `SCENE 2:`
  - Paragrafi separati
  - Numerazione `1.` `2.`

### 🧠 Clip Intelligence
- **Modalità Singola**: 1 clip per scena
- **Modalità Combinata**: combina scene per clip lunghe
- **Esempio**: 5 prompt da 6s + clip 30s → combina automaticamente in 1 clip da 30s
- Selettore durata: **4s, 6s, 8s, 15s, 30s**

### 👤 Memory System (come Whisk)
- **Personaggi**: salva aspetto, prompt base per rigenerazione coerente
- **Ambienti**: salva location, illuminazione, mood
- **Persistenza**: salvare in Chrome storage

### 📊 Monitoraggio Quote
- Display quote giornaliere/mensili
- Rilevamento automatico da UI
- Badge colorato: 🟢 Attivo, 🟡 Warning, 🔴 Esausto, 🟣 Illimitato

### ⏸️ Auto Pause/Resume
- Rileva rate limit automaticamente
- Pausa e resume automatico
- Notifiche in tempo reale

---

## 🎯 Come Funziona

### 1. Carica Copione
```
📝 Script Tab → Inserisci copione oppure carica file .txt → 🔍 Analizza
```

### 2. Configura Clip
```
⏱️ Seleziona durata (4s/6s/8s/15s/30s)
🔗 Scegli modalità: Singola o Combinata
👤 Seleziona Personaggio (dalla memory)
🏠 Seleziona Ambiente (opzionale)
```

### 3. Avvia Auto Flow
```
▶️ Clicca "Avvia Auto Flow"
```

### 4. Monitora Progresso
```
🎬 Barra progresso con clip attuale
⏸️ Pausa/Resume in qualsiasi momento
⏹️ Stop quando vuoi
```

---

## 🧠 Clip Intelligence - Esempi

### Esempio 1: Clip Singola
```
Copione: [SCENA 1] Uomo entra nel laboratorio
         [SCENA 2] Esplosion
         [SCENA 3] Fuga

Durata: 6s
Modalità: Singola

Risultato: 3 clip da 6s
- Clip 1: [SCENA 1] Uomo entra nel laboratorio
- Clip 2: [SCENA 2] Esplosion  
- Clip 3: [SCENA 3] Fuga
```

### Esempio 2: Clip Combinata (30s)
```
Copione: 5 scene da 6s
Durata: 30s
Modalità: Combinata

Risultato: 1 clip da 30s
- Clip 1: [SCENA 1-5] Combinazione di tutte le scene
```

---

## 📂 Struttura Output

```
GeminiGen-AutoFlow/
├── 01_Scripts/          # Copioni caricati
├── 02_Characters/       # Personaggi salvati
├── 03_Environments/    # Ambienti salvati
├── 04_Clips_6s/        # Clip da 6 secondi
├── 05_Clips_8s/        # Clip da 8 secondi
├── 06_Clips_15s/       # Clip da 15 secondi
├── 07_Clips_30s/       # Clip da 30 secondi
├── 08_Combined/        # Clip combinate
└── 09_Exports/         # Export finali
```

---

## 🔧 Installazione

### Chrome
1. Clona/Download questo repository
2. Apri `chrome://extensions/`
3. Attiva "Modalità sviluppatore"
4. Clicca "Carica estensione non pacchettizzata"
5. Seleziona cartella `geminigen-auto-flow`

### Firefox
1. Apri `about:debugging#/runtime/this-firefox`
2. Clicca "Carica componente temporaneo"
3. Seleziona cartella `geminigen-auto-flow`

---

## 📋 API Messages

| Message | Direction | Descrizione |
|---------|-----------|-------------|
| `PARSE_SCRIPT` | popup → background | Suddivide copione in scene |
| `GENERATE_CLIP_SEQUENCE` | popup → background | Genera sequenza clip |
| `START_FLOW` | popup → background | Avvia loop generazione |
| `UPDATE_QUOTA` | content → background | Aggiorna quote |
| `SAVE_CHARACTER` | popup → background | Salva personaggio |
| `SAVE_ENVIRONMENT` | popup → background | Salva ambiente |

---

## 🎨 UI Design

- **Header**: Gradient purple/blue con badge versione
- **Quota Bar**: Quote giornaliere/mensili sempre visibili
- **Tabs**: Script, Clip, Memory, Config
- **Cards**: Background semi-trasparente con bordo sottile
- **Progress**: Barra animata durante generazione

---

## ⚙️ Configurazione

| Opzione | Valore Default | Descrizione |
|---------|---------------|-------------|
| Delay tra clip | 2s | Pausa tra generazioni |
| Timeout | 5 min | Max attesa per clip |
| Auto-combine | Attivo | Combina scene per clip lunghe |
| Contestualizzazione | Attivo | Mantiene coerenza character/env |

---

## 🚀 Flusso Loop

```
START
  ↓
[1] Carica copione (testo o file)
  ↓
[2] Analizza e suddivide in scene
  ↓
[3] Configura durata e modalità
  ↓
[4] Seleziona personaggio/ambiente
  ↓
[5] Avvia Auto Flow
  ↓
[6] Per ogni clip:
    - Costruisci prompt contestualizzato
    - Verifica rate limit
    - Genera clip
    - Attendi completamento
    - Salva in cartella
  ↓
[7] Se clip combinata → integra scene
  ↓
[8] Pause su rate limit → resume automatico
  ↓
[9] Ripeti fino a completamento
```

---

## 📜 License

MIT - Fabio/Schumynet
Version: 2.0.0