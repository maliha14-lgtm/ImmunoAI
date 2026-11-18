# ImmunoAI — Deep Learning Intruder Detection System | Backend Integration Guide

This document defines the integration contract between the **React Client** (located in `/client`) and the **Python Backend** (FastAPI or Django) for the Deep Learning Term Project.

Any AI agent or developer building the backend should follow this specification to ensure zero-friction plug-and-play compatibility.

---

## 1. System Architecture Overview

```
 ┌──────────────────────────────────────────────────────────────┐
 │                   React Client (Vite + React)                │
 │                     http://localhost:5173                    │
 └──────────────────────┬──────────────────────▲────────────────┘
                        │                      │
       HTTP REST API    │                      │  WebSocket Alerts
      (Control & State) │                      │  (Zero Latency)
                        ▼                      │
 ┌─────────────────────────────────────────────┴────────────────┐
 │                 Python Backend (FastAPI / Django)            │
 │                     http://localhost:8000                    │
 ├──────────────────────────────────────────────────────────────┤
 │  • Protection Mode State Manager (Armed / Disarmed)          │
 │  • Video Streaming Pipeline (OpenCV MJPEG Streaming)         │
 │  • Deep Learning Inference Pipeline (PyTorch / YOLOv8 / DL)  │
 │  • Whitelisted Members Recognition (FaceNet / Embeddings)   │
 │  • Intruder Event Storage & Snapshot Persistence             │
 └──────────────────────────────────────────────────────────────┘
```

### The Core Flow
1. **Protection Mode Check (`protectionMode: boolean`)**:
   - **When Protection Mode is OFF**: The camera stream runs in standard preview mode. The Deep Learning model can run in low-power mode or idle; no alerts or sirens are triggered.
   - **When Protection Mode is ON (ARMED)**: The backend continuously feeds stream frames through the Deep Learning detection model. When an unauthorized person is detected, an alert payload is dispatched immediately over WebSocket (`/ws/alerts`) and logged to `/api/events`.

---

## 2. Network & CORS Configuration

- **Frontend Origin**: `http://localhost:5173` (and `http://127.0.0.1:5173`)
- **Backend Port**: `8000` (Default `http://localhost:8000`)
- **Environment Variable**: The client reads `VITE_API_URL`. If not set, it defaults to `http://localhost:8000`.

### Required CORS Headers on Backend (FastAPI Example):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 3. REST API Endpoints Specification

### 3.1 Health Check
- **`GET /api/health`**
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "YOLOv8-Intruder (PyTorch)",
  "active_camera": "cam1",
  "fps": 30.0
}
```

---

### 3.2 System Status
- **`GET /api/status`**
- **Response `200 OK`**:
```json
{
  "protection_mode": false,
  "active_camera": "cam1",
  "fps": 29.8,
  "model": "YOLOv8-Custom-Intruder",
  "confidence_threshold": 0.70,
  "camera_count": 3
}
```

---

### 3.3 Toggle Protection Mode (Core Feature)
- **`POST /api/protection-mode`**
- **Request Body**:
```json
{
  "enabled": true
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "protection_mode": true,
  "message": "Security System ARMED: Deep Learning intruder surveillance active."
}
```

---

### 3.4 Live Video Stream (MJPEG)
- **`GET /api/stream/{camera_id}`**
- **Parameters**: `camera_id` (e.g. `cam1`, `cam2`, `cam3`)
- **Response Headers**:
  - `Content-Type: multipart/x-mixed-replace; boundary=frame`
- **Implementation (OpenCV in Python)**:
```python
import cv2
from fastapi.responses import StreamingResponse

def generate_frames(camera_id: str):
    cap = cv2.VideoCapture(0) # or RTSP / video file path
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        # If protection_mode is ON, draw bounding boxes on frame here
        if system_state["protection_mode"]:
            frame = run_deep_learning_inference(frame)
            
        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/api/stream/{camera_id}")
def video_feed(camera_id: str):
    return StreamingResponse(
        generate_frames(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
```

---

### 3.5 Intruder Snapshots & History
- **`GET /api/intruders/snapshots`**
- Fetches recent captured intruder snapshots displayed in the **Captured Intruders** gallery.
- **Response `200 OK`**:
```json
[
  {
    "id": "snap-101",
    "timestamp": "Today, 10:14 PM",
    "camera": "Attached System Camera",
    "confidence": "98.4%",
    "threatLevel": "High Alert",
    "image": "/static/snapshots/snap_101.jpg",
    "details": "Unauthorized person detected near main perimeter while Protection Mode was ARMED.",
    "box": [32, 22, 34, 58]
  }
]
```

---

### 3.6 Whitelisted Project Members
- **`GET /api/members`**
- **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Anam", "role": "Team Member" },
  { "id": 2, "name": "Maliha", "role": "Team Member" },
  { "id": 3, "name": "Mohsin (me)", "role": "Team Member" }
]
```

---

### 3.7 Dashboard Status & Telemetry Cards
The dashboard right side contains 5 dedicated cards:
1. **Protection Mode**: Toggles system intruder surveillance via `POST /api/protection-mode`.
2. **Alarm Sound**: Audio siren control (client Web Audio synthesizer + `/api/sound/mute`).
3. **Wi-Fi Status**: Static network telemetry (`ImmunoNet-5GHz • -42 dBm • Optimal`). No toggle button.
4. **Wi-Fi Speed**: Video stream bandwidth rate (`↓ 120.4 Mbps • ↑ 42.1 Mbps • 14ms latency`).
5. **Weather & 5-Day Forecast**: Direct OpenWeather integration cached in IndexedDB with automatic hourly refresh.

---

## 4. WebSocket Real-Time Alert Specification

- **Endpoint**: `ws://localhost:8000/ws/alerts`
- The React client connects to this socket automatically on startup and reconnects if dropped.

### Alert Message Schema (Backend -> Client)
When the Deep Learning model spots an intruder while Protection Mode is active, send this JSON over the WebSocket:

```json
{
  "type": "INTRUDER_DETECTED",
  "cameraId": "cam1",
  "cameraName": "Camera 01",
  "location": "Back yard camera",
  "confidence": 98.4,
  "timestamp": "10:15:30 PM",
  "box": [35.2, 28.5, 18.0, 45.0],
  "message": "Unauthorized Person Detected in Back yard camera!"
}
```
*Note: `box` coordinates can be normalized percentages `[x, y, w, h]` for responsive overlay positioning.*

---

## 5. Complete Minimal FastAPI Starter Backend

You can copy this into `/server/main.py` and run it immediately:

```python
# /server/main.py
import uvicorn
import cv2
import json
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Intruder Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global In-Memory State
state = {
    "protection_mode": False,
    "confidence_threshold": 0.70,
    "active_camera": "cam1",
    "events": [],
    "members": [
        {"id": 1, "name": "Lorell Morales", "role": "Owner"}
    ]
}

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

class ProtectionRequest(BaseModel):
    enabled: bool

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "model": "PyTorch / YOLOv8 Intruder Detection",
        "fps": 30
    }

@app.get("/api/status")
def get_status():
    return {
        "protection_mode": state["protection_mode"],
        "active_camera": state["active_camera"],
        "confidence_threshold": state["confidence_threshold"],
        "fps": 30.0
    }

@app.post("/api/protection-mode")
async def set_protection_mode(req: ProtectionRequest):
    state["protection_mode"] = req.enabled
    return {
        "success": True,
        "protection_mode": state["protection_mode"]
    }

@app.get("/api/events")
def get_events():
    return state["events"]

@app.post("/api/simulate-intruder")
async def simulate_intruder():
    """Trigger a simulated intruder event over WebSocket"""
    event = {
        "type": "INTRUDER_DETECTED",
        "cameraId": "cam1",
        "cameraName": "Camera 01",
        "location": "Back yard camera",
        "confidence": 97.8,
        "timestamp": time.strftime("%I:%M:%S %p"),
        "box": [35.0, 28.0, 20.0, 48.0]
    }
    state["events"].insert(0, event)
    await manager.broadcast(event)
    return {"status": "broadcasted", "event": event}

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### Running the Python Backend:
```bash
cd server
pip install fastapi uvicorn opencv-python pydantic
python main.py
```

The React UI will automatically detect `http://localhost:8000`, switch its status pill to `🟢 Backend Live`, and start receiving real-time alerts!
