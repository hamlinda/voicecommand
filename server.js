const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const net = require('net');
const { exec, execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3300;
const COMMANDS_FILE = path.join(__dirname, 'commands.json');



// Function to get local LAN IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default commands to seed
const defaultCommands = [
  {
    id: "1",
    name: "Google",
    phrase: "open google",
    type: "web",
    action: "https://www.google.com"
  },
  {
    id: "2",
    name: "YouTube",
    phrase: "open youtube",
    type: "web",
    action: "https://www.youtube.com"
  },
  {
    id: "3",
    name: "GitHub",
    phrase: "open github",
    type: "web",
    action: "https://github.com"
  },
  {
    id: "4",
    name: "Open Terminal",
    phrase: "open terminal",
    type: "local",
    action: "xterm || gnome-terminal || konsole"
  },
  {
    id: "5",
    name: "Open Calculator",
    phrase: "open calculator",
    type: "local",
    action: "gnome-calculator || xcalc || kcalc"
  },
  {
    id: "6",
    name: "System Check",
    phrase: "run diagnostics",
    type: "local",
    action: "uname -a && lscpu | head -n 10"
  }
];

// Helper to read commands
function readCommands() {
  try {
    if (!fs.existsSync(COMMANDS_FILE)) {
      fs.writeFileSync(COMMANDS_FILE, JSON.stringify(defaultCommands, null, 2));
      return defaultCommands;
    }
    const data = fs.readFileSync(COMMANDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading commands file:", err);
    return defaultCommands;
  }
}

// Helper to write commands
function writeCommands(commands) {
  try {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
    return true;
  } catch (err) {
    console.error("Error writing commands file:", err);
    return false;
  }
}

// Get all commands
app.get('/api/commands', (req, res) => {
  const commands = readCommands();
  res.json(commands);
});

// Create/Update command
app.post('/api/commands', (req, res) => {
  const commands = readCommands();
  const newCmd = req.body;

  if (!newCmd.name || !newCmd.phrase || !newCmd.type || !newCmd.action) {
    return res.status(400).json({ error: "Missing required fields: name, phrase, type, action" });
  }

  // Generate ID if not present
  if (!newCmd.id) {
    newCmd.id = Date.now().toString();
  }

  const existingIndex = commands.findIndex(c => c.id === newCmd.id);
  if (existingIndex > -1) {
    commands[existingIndex] = newCmd;
  } else {
    commands.push(newCmd);
  }

  if (writeCommands(commands)) {
    res.json({ success: true, command: newCmd });
  } else {
    res.status(500).json({ error: "Failed to write command to disk" });
  }
});

// Delete a command
app.delete('/api/commands/:id', (req, res) => {
  const commands = readCommands();
  const id = req.params.id;
  const filtered = commands.filter(c => c.id !== id);

  if (commands.length === filtered.length) {
    return res.status(404).json({ error: "Command not found" });
  }

  if (writeCommands(filtered)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to delete command" });
  }
});

// Execute a local command
app.post('/api/execute/:id', (req, res) => {
  const commands = readCommands();
  const id = req.params.id;
  const command = commands.find(c => c.id === id);

  if (!command) {
    return res.status(404).json({ error: "Command not found" });
  }

  if (command.type !== 'local') {
    return res.status(400).json({ error: "Command is not a local execution type" });
  }

  console.log(`Executing local command: "${command.action}" (triggered by phrase "${command.phrase}")`);
  
  exec(command.action, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error: ${error.message}`);
      return res.json({
        success: false,
        error: error.message,
        stdout: stdout,
        stderr: stderr
      });
    }
    res.json({
      success: true,
      stdout: stdout,
      stderr: stderr
    });
  });
});

// Check if a port is available on interface 0.0.0.0
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(true);
        }).close();
      })
      .listen(port, '0.0.0.0');
  });
}

// Find first available port starting at startPort
async function getAvailablePort(startPort) {
  let port = startPort;
  while (true) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      return port;
    }
    console.log(`Port ${port} is already in use. Scanning next port...`);
    port++;
    if (port > startPort + 100) {
      throw new Error("Could not find any available port in range of +100 ports.");
    }
  }
}

async function startServer() {
  const server = http.createServer(app);

  try {
    const actualPort = await getAvailablePort(PORT);
    
    server.listen(actualPort, '0.0.0.0', () => {
      console.log(`\n=============================================================`);
      console.log(`VoxCommand Server is listening:`);
      console.log(`  - Local:   http://localhost:${actualPort}`);
      
      const ips = getLocalIpAddresses();
      if (ips.length > 0) {
        ips.forEach(ip => {
          console.log(`  - LAN:     http://${ip}:${actualPort}`);
        });
      } else {
        console.log(`  - LAN:     No active LAN interface found.`);
      }
      console.log(`=============================================================\n`);
    });
  } catch (err) {
    console.error("FATAL: Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
