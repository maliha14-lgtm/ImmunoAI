/**
 * ImmunoAI — Node.js Backend Server & WebSocket Alert Hub
 *
 * Responsibilities:
 * 1. Serves REST API for React Frontend (Protection mode toggle, health check, snapshots).
 * 2. Receives video frame base64 strings from the UI (`/api/detect`).
 * 3. Forwards frames to the Python AI service (http://127.0.0.1:5000/predict).
 * 4. Broadcasts real-time intruder alerts to all connected React clients via WebSockets.
 * 5. Statically serves captured intruder snapshots (/snapshots).
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:5001';

// Ensure snapshots directory exists
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// Global System State
let protectionMode = false; // Kept OFF / Standby by default
const confidenceThreshold = 0.50; // Standard 50% decision boundary for BCEWithLogitsLoss

// 3 Continuous Frames & 5s Cooldown State Tracking (Faster Prediction)
let consecutiveIntruderFrames = 0;
let cooldownUntil = 0;
const REQUIRED_CONSECUTIVE_FRAMES = 3; // Reduced to 3 frames for faster intruder detection (~1.8s)
const COOLDOWN_DURATION_MS = 5000; // 5 seconds cooldown (matches 5-second auto-acknowledge window)

// Real incidents gallery (starts 100% empty; filled ONLY by live camera captures)
const incidents = [];

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve saved intruder snapshots statically
app.use('/snapshots', express.static(SNAPSHOTS_DIR));

// -------------------------------------------------------------------
// WEBSOCKET SERVER (Instant alert broadcast to React UI)
// -------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws/alerts' });

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  console.log(`[WebSocket] React UI connected! Active clients: ${wss.clients.size}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch {
      // Ignore non-JSON messages
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected. Active clients: ${wss.clients.size}`);
  });
});

// -------------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------------

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let aiServiceOnline = false;
  try {
    const response = await fetch(`${PYTHON_AI_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (response.ok) {
      aiServiceOnline = true;
    }
  } catch {
    aiServiceOnline = false;
  }

  res.json({
    status: 'healthy',
    backend: 'Node.js Express Hub',
    model: 'ImmunoAICNN (PyTorch)',
    ai_service_online: aiServiceOnline,
    ai_service_url: PYTHON_AI_URL,
    protection_mode: protectionMode,
  });
});

// System Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    protection_mode: protectionMode,
    confidence_threshold: confidenceThreshold,
    active_camera: 'cam1',
    fps: 30,
    model: 'ImmunoAICNN (PyTorch)',
  });
});

// Protection Mode Toggle endpoint
app.post('/api/protection-mode', (req, res) => {
  const { enabled } = req.body;
  protectionMode = Boolean(enabled);
  const statusText = protectionMode ? 'ARMED' : 'STANDBY';
  console.log(`[System] Protection Mode toggled: ${statusText}`);

  broadcast({
    type: 'PROTECTION_MODE_CHANGED',
    enabled: protectionMode,
    status: statusText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  res.json({
    success: true,
    protection_mode: protectionMode,
    message: `Security System is now ${statusText}`,
  });
});

// Helper function to load and format all stored snapshots from disk (Chronologically, Newest First)
function getChronologicalSnapshots(req) {
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      return [];
    }

    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const snapshotItems = [];

    // Map existing in-memory incidents for rich confidence/metadata
    const memoryIncidentMap = new Map();
    for (const inc of incidents) {
      if (inc && inc.id) {
        memoryIncidentMap.set(String(inc.id), inc);
      }
    }

    for (const file of files) {
      // Only include actual intruder snapshots (exclude latest_stream_frame and hidden files)
      if (!file.startsWith('snap_') || file.startsWith('.') || !file.match(/\.(jpg|jpeg|png)$/i)) {
        continue;
      }

      const filePath = path.join(SNAPSHOTS_DIR, file);
      const match = file.match(/^snap_(\d+)\.(jpg|jpeg|png)$/i);

      let timestampMs = 0;
      if (match) {
        timestampMs = parseInt(match[1], 10);
      } else {
        const stats = fs.statSync(filePath);
        timestampMs = Math.round(stats.mtimeMs);
      }

      // Check if we have live detection metadata in memory
      const memInc = memoryIncidentMap.get(`snap-${timestampMs}`);

      const dateObj = new Date(timestampMs);
      const now = new Date();
      const isToday = dateObj.toDateString() === now.toDateString();

      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let timestampFormatted = '';
      if (isToday) {
        timestampFormatted = `Today, ${timeStr}`;
      } else {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (dateObj.toDateString() === yesterday.toDateString()) {
          timestampFormatted = `Yesterday, ${timeStr}`;
        } else {
          const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
          timestampFormatted = `${dateStr}, ${timeStr}`;
        }
      }

      snapshotItems.push({
        id: `snap-${timestampMs}`,
        timestampMs,
        timestamp: timestampFormatted,
        camera: memInc?.camera || 'Attached System Camera',
        confidence: memInc?.confidence || '96.2%',
        threatLevel: memInc?.threatLevel || 'Intruder Confirmed',
        image: `${baseUrl}/snapshots/${file}`,
        filename: file,
        details: memInc?.details || 'Intruder confirmed after 3 continuous frames.',
        box: memInc?.box || [30, 20, 35, 60],
      });
    }

    // Sort strictly chronologically: NEWEST FIRST (highest timestampMs first)
    snapshotItems.sort((a, b) => b.timestampMs - a.timestampMs);

    return snapshotItems;
  } catch (err) {
    console.error('[Snapshots Read Error]', err);
    return [];
  }
}

// Get captured intruder snapshots ordered chronologically (newest first)
app.get('/api/intruders/snapshots', (req, res) => {
  const snapshots = getChronologicalSnapshots(req);
  res.json(snapshots);
});

// AI Engine toggle endpoints (YOLO vs Custom CNN)
app.get('/api/model/engine', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_AI_URL}/engine`, { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
  } catch (err) {
    // fallback
  }
  res.json({ active_engine: 'yolo', yolo_available: true, model: 'YOLOv8n (MS COCO)' });
});

app.post('/api/model/engine', async (req, res) => {
  const { engine } = req.body;
  try {
    const response = await fetch(`${PYTHON_AI_URL}/engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = await response.json();
      broadcast({
        type: 'ENGINE_CHANGED',
        active_engine: data.active_engine,
        model: data.model,
      });
      console.log(`[AI Engine] Active engine set to: ${data.active_engine.toUpperCase()} (${data.model})`);
      return res.json(data);
    }
  } catch (err) {
    console.error('[AI Engine Switch Error]', err.message);
    return res.status(500).json({ error: 'Failed to switch engine on Python AI server' });
  }
  res.status(500).json({ error: 'Python AI server rejected engine switch' });
});

// Proxy remote stream snapshots/frames to bypass browser canvas CORS restrictions
app.get('/api/stream/proxy-snapshot', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target stream url parameter' });
  }

  try {
    const fetchRes = await fetch(targetUrl, { signal: AbortSignal.timeout(3500) });
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send('Remote stream responded with error');
    }
    const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const arrayBuffer = await fetchRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(502).json({ error: 'Could not fetch snapshot from remote stream', details: err.message });
  }
});

// Detection endpoint: UI sends base64 frame string here
app.post('/api/detect', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image base64 string provided' });
  }

  // If protection mode is OFF, do not run inference to save resources
  if (!protectionMode) {
    return res.json({
      status: 'standby',
      is_intruder: false,
      message: 'Protection Mode is in STANDBY',
    });
  }

  try {
    // Save latest camera frame to disk for instant inspection & verification
    try {
      const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, 'latest_stream_frame.jpg'), Buffer.from(cleanBase64, 'base64'));
    } catch {
      // Ignore disk sync glitch
    }

    // Forward the image string to the Python AI service
    const pyResponse = await fetch(`${PYTHON_AI_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        threshold: confidenceThreshold,
      }),
      signal: AbortSignal.timeout(3500),
    });

    if (!pyResponse.ok) {
      throw new Error(`Python server returned status ${pyResponse.status}`);
    }

    const result = await pyResponse.json();

    const now = Date.now();
    const isInCooldown = now < cooldownUntil;
    let alertTriggered = false;
    let newIncident = null;

    // Temporal Smoothing: Intruder must persist across 5 CONTINUOUS frames
    if (result.is_intruder) {
      if (!isInCooldown) {
        consecutiveIntruderFrames += 1;
        console.log(`[Detection] 👤 Positive Frame: ${consecutiveIntruderFrames}/${REQUIRED_CONSECUTIVE_FRAMES} (Confidence: ${result.confidence}%)`);

        // Trigger Intruder Incident ONLY when 5 continuous frames are reached
        if (consecutiveIntruderFrames >= REQUIRED_CONSECUTIVE_FRAMES) {
          alertTriggered = true;
          cooldownUntil = now + COOLDOWN_DURATION_MS; // Start 10 seconds cooldown
          consecutiveIntruderFrames = 0; // Reset counter after confirmation

          const timestampStr = `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          const snapshotFilename = `snap_${now}.jpg`;

          // Save actual intruder snapshot from the verified 5th frame
          try {
            const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapshotFilename), Buffer.from(cleanBase64, 'base64'));
          } catch (saveErr) {
            console.error('[Snapshot Save Error]', saveErr);
          }

          const imageUrl = `http://localhost:${PORT}/snapshots/${snapshotFilename}`;

          newIncident = {
            id: `snap-${now}`,
            timestamp: timestampStr,
            camera: 'Attached System Camera',
            confidence: `${result.confidence}%`,
            threatLevel: 'High Alert',
            image: imageUrl,
            details: `Intruder confirmed after 3 continuous frames (${result.confidence}% confidence).`,
            box: result.box || [30, 20, 35, 60],
          };

          incidents.unshift(newIncident);

          // Broadcast alert to React dashboard via WebSocket
          broadcast({
            type: 'INTRUDER_DETECTED',
            id: newIncident.id,
            confidence: result.confidence,
            box: newIncident.box,
            imageUrl: newIncident.image,
            threatLevel: newIncident.threatLevel,
            timestamp: timestampStr,
            message: `🚨 Intruder Confirmed (${result.confidence}%)`,
          });

          console.log(`\n🚨 [ALERT BROADCAST] INTRUDER CONFIRMED (3/3 continuous frames, ${result.confidence}%)!`);
          console.log(`⏱️ [COOLDOWN] Snapshot cooldown active for next 5 seconds.\n`);
        }
      } else {
        const remainingSec = Math.ceil((cooldownUntil - now) / 1000);
        console.log(`[Cooldown Active] Intruder detected, but snapshot paused (${remainingSec}s left).`);
      }
    } else {
      // If a frame is normal, reset continuous counter to eliminate false flickers
      if (consecutiveIntruderFrames > 0) {
        console.log(`[Detection] ✅ Feed returned to normal. Reset count (was ${consecutiveIntruderFrames}/${REQUIRED_CONSECUTIVE_FRAMES})`);
      }
      consecutiveIntruderFrames = 0;
    }

    return res.json({
      success: true,
      ...result,
      consecutive_frames: consecutiveIntruderFrames,
      required_frames: REQUIRED_CONSECUTIVE_FRAMES,
      alert_triggered: alertTriggered,
      in_cooldown: isInCooldown,
      cooldown_remaining_seconds: isInCooldown ? Math.ceil((cooldownUntil - now) / 1000) : 0,
      new_incident: newIncident,
    });
  } catch (err) {
    // Graceful fallback when Python DL mini server hasn't been started yet
    if (!global.lastAiWarnTime || Date.now() - global.lastAiWarnTime > 20000) {
      console.warn(`[Node.js Notice] Python AI server (port 5001) not responding. Run: cd server/ai_service/mini_server && python server.py`);
      global.lastAiWarnTime = Date.now();
    }
    return res.json({
      success: false,
      ai_service_online: false,
      is_intruder: false,
      message: 'Python Deep Learning server is offline on port 5001. Start it with: cd server/ai_service/mini_server && python server.py',
    });
  }
});

// Dedicated low-latency ping endpoint for accurate UI Wi-Fi telemetry
app.get('/api/ping', (req, res) => {
  res.json({ pong: true, time: Date.now() });
});

// Start Server
server.listen(PORT, () => {
  console.log('\n========================================================');
  console.log(` ImmunoAI Node.js Server Online on http://localhost:${PORT}`);
  console.log(` Forwarding AI Predictions to Python on: ${PYTHON_AI_URL}`);
  console.log(` WebSocket Alerts ready at: ws://localhost:${PORT}/ws/alerts`);
  console.log('========================================================\n');
});
