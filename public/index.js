// ==========================================================================
// VoxCommand Client-Side JavaScript Logic
// ==========================================================================

// Global App State
const state = {
  commands: [],
  isListening: false,
  isSpeaking: false,
  recognition: null,
  activeEditId: null,
  backendUrl: window.location.origin
};

// DOM Elements
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const micStatusDot = document.getElementById('mic-status-dot');
const micStatusText = document.getElementById('mic-status-text');
const micToggleBtn = document.getElementById('mic-toggle');
const micIcon = document.getElementById('mic-icon');
const liveTranscript = document.getElementById('live-transcript');
const speechLabel = document.getElementById('speech-label');
const consoleOutput = document.getElementById('console-output');
const clearConsoleBtn = document.getElementById('clear-console-btn');
const commandListTbody = document.getElementById('command-list-tbody');
const commandForm = document.getElementById('command-form');
const cmdIdInput = document.getElementById('cmd-id');
const cmdNameInput = document.getElementById('cmd-name');
const cmdPhraseInput = document.getElementById('cmd-phrase');
const cmdTypeSelect = document.getElementById('cmd-type');
const cmdActionInput = document.getElementById('cmd-action');
const actionLabel = document.getElementById('action-label');
const actionIcon = document.getElementById('action-icon');
const actionHint = document.getElementById('action-hint');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveCmdBtn = document.getElementById('save-cmd-btn');
const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
const speechOverlay = document.getElementById('speech-overlay');
const speechOverlayText = document.getElementById('speech-overlay-text');

// 1. Terminal / Console Logger Helper
function logConsole(source, message, type = 'system') {
  const line = document.createElement('div');
  line.className = `console-line ${type}-line`;
  
  const timestamp = new Date().toLocaleTimeString();
  line.innerText = `[${timestamp}] [${source.toUpperCase()}] ${message}`;
  
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 2. Fetch/Manage Commands API
async function loadCommands() {
  try {
    const res = await fetch(`${state.backendUrl}/api/commands`);
    if (!res.ok) throw new Error("HTTP status " + res.status);
    state.commands = await res.json();
    
    // Set status to Connected
    serverStatusDot.className = 'status-dot connected';
    serverStatusText.innerText = 'Server: Connected';
    
    renderCommands();
    logConsole('system', `Loaded ${state.commands.length} commands from server.`, 'system');
  } catch (err) {
    console.error("Failed to load commands:", err);
    serverStatusDot.className = 'status-dot disconnected';
    serverStatusText.innerText = 'Server: Disconnected';
    logConsole('error', 'Could not connect to backend server. Operating in client-only mode.', 'error');
    
    // Default fallback mock data in case server is offline
    state.commands = [
      { id: "1", name: "Google", phrase: "open google", type: "web", action: "https://www.google.com" },
      { id: "2", name: "YouTube", phrase: "open youtube", type: "web", action: "https://www.youtube.com" },
      { id: "3", name: "GitHub", phrase: "open github", type: "web", action: "https://github.com" }
    ];
    renderCommands();
  }
}

function renderCommands() {
  commandListTbody.innerHTML = '';
  
  state.commands.forEach(cmd => {
    const tr = document.createElement('tr');
    tr.id = `cmd-row-${cmd.id}`;
    
    const badgeClass = cmd.type === 'web' ? 'badge-web' : 'badge-local';
    const badgeIcon = cmd.type === 'web' ? 'fa-globe' : 'fa-terminal';
    
    tr.innerHTML = `
      <td><strong>${escapeHtml(cmd.name)}</strong></td>
      <td><span class="phrase-text">${escapeHtml(cmd.phrase)}</span></td>
      <td><span class="badge ${badgeClass}"><i class="fa-solid ${badgeIcon}"></i> ${cmd.type}</span></td>
      <td><div class="action-code" title="${escapeHtml(cmd.action)}">${escapeHtml(cmd.action)}</div></td>
      <td>
        <div class="actions-group">
          <button class="btn-icon btn-test" title="Manually trigger test" onclick="triggerCommandAction('${cmd.id}')">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="btn-icon btn-edit" title="Edit command" onclick="editCommand('${cmd.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon btn-danger" title="Delete command" onclick="deleteCommand('${cmd.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    commandListTbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Edit Command Populate Form
window.editCommand = function(id) {
  const cmd = state.commands.find(c => c.id === id);
  if (!cmd) return;
  
  state.activeEditId = id;
  cmdIdInput.value = cmd.id;
  cmdNameInput.value = cmd.name;
  cmdPhraseInput.value = cmd.phrase;
  cmdTypeSelect.value = cmd.type;
  cmdActionInput.value = cmd.action;
  
  // Update action labels
  handleTypeChange();
  
  cancelEditBtn.style.display = 'inline-flex';
  saveCmdBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Update Command`;
  
  // Highlight form
  document.querySelector('.command-creator-card').scrollIntoView({ behavior: 'smooth' });
  logConsole('system', `Editing command: "${cmd.name}"`, 'system');
};

// Cancel Edit
cancelEditBtn.addEventListener('click', () => {
  resetForm();
});

function resetForm() {
  state.activeEditId = null;
  commandForm.reset();
  cmdIdInput.value = '';
  handleTypeChange();
  cancelEditBtn.style.display = 'none';
  saveCmdBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Command`;
}

// Delete Command
window.deleteCommand = async function(id) {
  const cmd = state.commands.find(c => c.id === id);
  if (!cmd) return;
  
  if (!confirm(`Are you sure you want to delete the command "${cmd.name}"?`)) return;
  
  try {
    const res = await fetch(`${state.backendUrl}/api/commands/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      logConsole('system', `Deleted command: "${cmd.name}"`, 'system');
      await loadCommands();
      if (state.activeEditId === id) resetForm();
    } else {
      throw new Error();
    }
  } catch (err) {
    logConsole('error', `Failed to delete command "${cmd.name}" from server.`, 'error');
  }
};

// Form submit handler
commandForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cmd = {
    id: cmdIdInput.value || undefined,
    name: cmdNameInput.value.trim(),
    phrase: cmdPhraseInput.value.trim().toLowerCase(), // normalize to lowercase
    type: cmdTypeSelect.value,
    action: cmdActionInput.value.trim()
  };
  
  try {
    const res = await fetch(`${state.backendUrl}/api/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cmd)
    });
    
    if (res.ok) {
      const data = await res.json();
      logConsole('system', `Successfully saved command: "${data.command.name}"`, 'system');
      resetForm();
      await loadCommands();
    } else {
      const errorData = await res.json();
      throw new Error(errorData.error || "Server error");
    }
  } catch (err) {
    logConsole('error', `Failed to save command: ${err.message}`, 'error');
  }
});

// Select Dropdown Toggle
function handleTypeChange() {
  const type = cmdTypeSelect.value;
  if (type === 'web') {
    actionLabel.innerText = "Web URL";
    actionIcon.className = "fa-solid fa-link input-icon";
    cmdActionInput.placeholder = "https://google.com";
    actionHint.innerText = "Enter the full web page address (include http/https)";
  } else {
    actionLabel.innerText = "Local Terminal Command";
    actionIcon.className = "fa-solid fa-terminal input-icon";
    cmdActionInput.placeholder = "e.g., gnome-terminal, ls -la, etc.";
    actionHint.innerText = "This command will execute locally on your machine running the webservice.";
  }
}
cmdTypeSelect.addEventListener('change', handleTypeChange);

// Reset Defaults
resetDefaultsBtn.addEventListener('click', async () => {
  if (!confirm("Are you sure you want to reset commands to system defaults? Any custom modifications will be lost.")) return;
  
  try {
    // Delete all commands one by one or let backend seed.
    // In our backend, if we send empty array and call defaults, let's see.
    // We can just wipe out commands.json or trigger an API.
    // Let's delete all and let backend seed. Wait, server.js seeds default commands if file doesn't exist.
    // So we can send a request to reset?
    // Wait, let's write a backend handler to reset? Or we can just DELETE everything and reload, but wait, the backend doesn't have a reset endpoint.
    // Let's implement reset by sending the defaults array to /api/commands for each one or let's check what we can do.
    // Actually, we can easily overwrite by sending the seeds. But wait! Let's check how we can do it.
    // We can just send the default list one by one or create a clean configuration.
    // Let's POST the defaults directly from the client!
    const defaults = [
      { id: "1", name: "Google", phrase: "open google", type: "web", action: "https://www.google.com" },
      { id: "2", name: "YouTube", phrase: "open youtube", type: "web", action: "https://www.youtube.com" },
      { id: "3", name: "GitHub", phrase: "open github", type: "web", action: "https://github.com" },
      { id: "4", name: "Open Terminal", phrase: "open terminal", type: "local", action: "xterm || gnome-terminal || konsole" },
      { id: "5", name: "Open Calculator", phrase: "open calculator", type: "local", action: "gnome-calculator || xcalc || kcalc" },
      { id: "6", name: "System Check", phrase: "run diagnostics", type: "local", action: "uname -a && lscpu | head -n 10" }
    ];
    
    logConsole('system', 'Resetting commands to default...', 'system');
    
    // Wiping current commands: First fetch all, delete all, then post defaults.
    for (const cmd of state.commands) {
      await fetch(`${state.backendUrl}/api/commands/${cmd.id}`, { method: 'DELETE' }).catch(()=>{});
    }
    
    for (const cmd of defaults) {
      await fetch(`${state.backendUrl}/api/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd)
      }).catch(()=>{});
    }
    
    logConsole('system', 'Command database reset complete.', 'system');
    await loadCommands();
  } catch (err) {
    logConsole('error', 'Failed to reset default commands.', 'error');
  }
});

// Clear console
clearConsoleBtn.addEventListener('click', () => {
  consoleOutput.innerHTML = '';
  logConsole('system', 'Console cleared.', 'system');
});


// 3. Web Speech Recognition Engine (Inference on Frontend)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    micStatusDot.className = 'status-dot disconnected';
    micStatusText.innerText = 'Speech: Unsupported';
    logConsole('error', 'Web Speech API is not supported in this browser. Please use Chrome/Chromium.', 'error');
    return;
  }
  
  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  
  rec.onstart = () => {
    state.isListening = true;
    micStatusDot.className = 'status-dot active';
    micStatusText.innerText = 'Speech: Listening';
    micIcon.className = 'fa-solid fa-microphone-slash';
    micToggleBtn.classList.add('listening');
    speechLabel.innerText = "Listening... Speak your command";
    logConsole('speech', 'Microphone active. Listening for voice input...', 'speech');
  };
  
  rec.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (interimTranscript) {
      liveTranscript.innerText = interimTranscript;
      liveTranscript.classList.add('active-hearing');
    }
    
    if (finalTranscript) {
      liveTranscript.innerText = finalTranscript;
      liveTranscript.classList.remove('active-hearing');
      logConsole('speech', `Heard phrase: "${finalTranscript.trim()}"`, 'speech');
      evaluateVoiceCommand(finalTranscript);
    }
  };
  
  rec.onerror = (event) => {
    // Ignore harmless browser errors like 'no-speech'
    if (event.error === 'no-speech') return;
    
    logConsole('error', `Speech Recognition Error: ${event.error}`, 'error');
    if (event.error === 'not-allowed') {
      state.isListening = false;
      toggleSpeechState(false);
      logConsole('error', 'Microphone permission denied. Click the microphone icon to try again.', 'error');
    }
  };
  
  rec.onend = () => {
    // Keep listening if toggle is still checked
    if (state.isListening) {
      logConsole('system', 'Restarting speech listener...', 'system');
      try {
        rec.start();
      } catch (err) {
        console.error("Failed to restart speech recognition:", err);
      }
    } else {
      micStatusDot.className = 'status-dot inactive';
      micStatusText.innerText = 'Speech: Off';
      micIcon.className = 'fa-solid fa-microphone';
      micToggleBtn.classList.remove('listening');
      speechLabel.innerText = "Click mic to start listening";
      logConsole('speech', 'Speech recognition stopped.', 'speech');
    }
  };
  
  state.recognition = rec;
}

function toggleSpeechState(forceState) {
  const shouldListen = forceState !== undefined ? forceState : !state.isListening;
  
  if (!state.recognition) {
    initSpeechRecognition();
  }
  
  if (!state.recognition) return;
  
  if (shouldListen) {
    try {
      state.recognition.start();
    } catch (err) {
      logConsole('error', 'Could not start recognition: ' + err.message, 'error');
    }
  } else {
    state.isListening = false;
    try {
      state.recognition.stop();
    } catch (err) {}
  }
}

micToggleBtn.addEventListener('click', () => {
  toggleSpeechState();
});

// 4. Voice Match & Processor
function evaluateVoiceCommand(transcript) {
  const cleanedText = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  
  let matchFound = false;
  
  for (const cmd of state.commands) {
    if (matchPhrase(cleanedText, cmd.phrase)) {
      matchFound = true;
      executeMatchedCommand(cmd, transcript);
      break;
    }
  }
  
  if (!matchFound) {
    logConsole('system', `No match found for: "${transcript.trim()}"`, 'system');
  }
}

// Token matching algorithm
function matchPhrase(heard, trigger) {
  const h = heard.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  const t = trigger.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  
  // Direct containment check (e.g. trigger: "open google", heard: "please open google right now")
  if (h.includes(t)) return true;
  
  // Keyword intersection check: if trigger is multi-word, make sure all keywords are present in heard
  const hTokens = new Set(h.split(/\s+/));
  const tTokens = t.split(/\s+/);
  
  if (tTokens.length > 1) {
    const matchesAll = tTokens.every(tok => hTokens.has(tok));
    if (matchesAll) return true;
  }
  
  return false;
}

async function executeMatchedCommand(cmd, rawSpeech) {
  logConsole('match', `MATCH FOUND: "${cmd.name}" (Trigger: "${cmd.phrase}")`, 'match');
  
  // Visual Feedback
  liveTranscript.innerText = `Matched: "${cmd.name}"`;
  liveTranscript.className = 'transcript-bubble matched-success';
  
  // Text to Speech Voice Confirmation
  await speakFeedback(`Executing ${cmd.name}`);
  
  setTimeout(() => {
    liveTranscript.className = 'transcript-bubble';
    liveTranscript.innerText = '...';
  }, 2500);

  // Trigger actual action
  await triggerCommandAction(cmd.id);
}

// Execute Action by ID
async function triggerCommandAction(id) {
  const cmd = state.commands.find(c => c.id === id);
  if (!cmd) return;
  
  if (cmd.type === 'web') {
    logConsole('exec', `Launching web page: ${cmd.action}`, 'exec');
    
    // Try window.open first
    const newTab = window.open(cmd.action, '_blank');
    
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      logConsole('error', `Browser blocked popup! Click here to open: <a href="${cmd.action}" target="_blank" style="color: var(--clr-cyan); text-decoration: underline;">${cmd.action}</a>`, 'error');
      // Alert fallback in UI
      liveTranscript.innerHTML = `Popup Blocked! <a class="btn btn-primary btn-sm" href="${cmd.action}" target="_blank" style="margin-left:10px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Page</a>`;
    } else {
      logConsole('exec', 'Page opened in new tab successfully.', 'exec');
    }
  } else if (cmd.type === 'local') {
    logConsole('exec', `Calling backend to execute local command: "${cmd.action}"`, 'exec');
    
    try {
      const res = await fetch(`${state.backendUrl}/api/execute/${cmd.id}`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error("Server HTTP error " + res.status);
      
      const result = await res.json();
      
      if (result.success) {
        logConsole('exec', `Command completed successfully.`, 'match');
        if (result.stdout) {
          logConsole('output', result.stdout, 'output');
        }
      } else {
        logConsole('error', `Execution failed: ${result.error}`, 'error');
        if (result.stderr) {
          logConsole('output', `STDERR: ${result.stderr}`, 'error');
        }
      }
    } catch (err) {
      logConsole('error', `Failed to contact backend executor: ${err.message}`, 'error');
    }
  }
}

// 5. Speech Synthesis (TTS Feedback)
function speakFeedback(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Pause speech recognition while speaking to avoid feedback loops!
    let wasListening = state.isListening;
    if (wasListening && state.recognition) {
      state.recognition.stop();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1.0;
    
    // Show speaking overlay
    speechOverlayText.innerText = text;
    speechOverlay.classList.add('active');
    state.isSpeaking = true;
    
    utterance.onend = () => {
      speechOverlay.classList.remove('active');
      state.isSpeaking = false;
      
      // Resume listening if we were listening before
      if (wasListening && state.recognition) {
        // Short timeout to let the speaker output clear before turning mic back on
        setTimeout(() => {
          if (state.isListening) { // Double check user hasn't turned off in mean time
            try {
              state.recognition.start();
            } catch (err) {}
          }
        }, 300);
      }
      resolve();
    };
    
    utterance.onerror = () => {
      speechOverlay.classList.remove('active');
      state.isSpeaking = false;
      if (wasListening && state.recognition) {
        try { state.recognition.start(); } catch (err) {}
      }
      resolve();
    };
    
    window.speechSynthesis.speak(utterance);
  });
}

// 6. Glowing Orb Canvas Animation
function initOrbAnimation() {
  const canvas = document.getElementById('orb-canvas');
  const ctx = canvas.getContext('2d');
  
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  
  let time = 0;
  
  function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Determine animation parameters based on state
    let baseRadius = 55;
    let waveAmplitude = 4;
    let waveFrequency = 0.05;
    let glowColor = 'rgba(6, 182, 212, 0.6)'; // cyan default
    let speed = 1;
    
    if (state.isSpeaking) {
      baseRadius = 65;
      waveAmplitude = 12;
      waveFrequency = 0.15;
      glowColor = 'rgba(139, 92, 246, 0.8)'; // purple when speaking
      speed = 2.5;
    } else if (state.isListening) {
      baseRadius = 60;
      // Animate breathing / pulse
      waveAmplitude = 6 + Math.sin(time * 0.1) * 3;
      waveFrequency = 0.08;
      glowColor = 'rgba(6, 182, 212, 0.8)'; // pulsing cyan
      speed = 1.8;
    } else {
      // Idle breathing
      baseRadius = 50;
      waveAmplitude = 2;
      waveFrequency = 0.03;
      glowColor = 'rgba(255, 255, 255, 0.15)'; // dim white
      speed = 0.5;
    }
    
    time += speed;
    
    // Draw outer glow shadow
    ctx.shadowBlur = 25;
    ctx.shadowColor = glowColor;
    
    // Draw pulsating waveform orb
    ctx.beginPath();
    const numPoints = 80;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Calculate wave offset using multiple sine functions
      const offset = Math.sin(angle * 6 + time * waveFrequency) * waveAmplitude +
                     Math.cos(angle * 3 - time * waveFrequency * 0.5) * (waveAmplitude * 0.5);
      
      const r = baseRadius + offset;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    
    // Color fill gradient
    const gradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius * 1.2);
    if (state.isSpeaking) {
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
    } else if (state.isListening) {
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Stroke outline
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Reset shadow for inner elements
    ctx.shadowBlur = 0;
    
    // Draw inner core pulsing dot
    ctx.beginPath();
    const corePulse = state.isListening ? 6 + Math.sin(time * 0.15) * 2 : 4;
    ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
    ctx.fillStyle = state.isSpeaking ? '#b92b27' : (state.isListening ? '#06b6d4' : '#6b7280');
    ctx.fill();
    
    requestAnimationFrame(draw);
  }
  
  draw();
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
  logConsole('system', 'VoxCommand Web UI loaded.', 'system');
  initOrbAnimation();
  initSpeechRecognition();
  loadCommands();
});
