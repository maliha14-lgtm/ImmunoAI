# ImmunoAI Backend Architecture

This backend architecture is cleanly separated into two distinct layers:

1. **Node.js Express Server (`server.js`)**:
   - Manages UI communication, REST endpoints, and WebSocket alerts.
   - Takes webcam footage base64 strings from the React UI (`POST /api/detect`).
   - Forwards the string to the Python AI service on port 5000.
   - Broadcasts real-time intruder alerts to the frontend via WebSockets.
   - Statically serves saved intruder snapshots at `/snapshots`.
   - **Note**: You do not have to explain this Node.js server in your deep learning viva.

2. **Python Deep Learning Service (`ai_service/`)**:
   - **This is what you explain in your viva! Organized into 4 clear folders:**
   - **`data/`**: Raw training and validation image sets.
   - **`saved_model/`**: Best trained PyTorch weights (`immunoai_model.pth`) and evaluation plots (`evaluation_curves.png`).
   - **`training_model/`**: Contains [`model.py`](ai_service/training_model/model.py) (CNN architecture), [`dataset.py`](ai_service/training_model/dataset.py), [`train.py`](ai_service/training_model/train.py), and [`colab_training_notebook.py`](ai_service/training_model/colab_training_notebook.py).
   - **`mini_server/`**: Contains [`predictor.py`](ai_service/mini_server/predictor.py) (isolated prediction engine) and [`server.py`](ai_service/mini_server/server.py) (mini HTTP bridge to Node.js).
   - [`ai_service/README_VIVA.md`](ai_service/README_VIVA.md): Complete viva cheat-sheet with architecture diagrams, equations, and talking points.

---

## How to Run Everything

### Step 1: Start the Python Deep Learning Mini Server
Open a terminal:
```bash
cd ~/Desktop/IDL\ Code/server/ai_service/mini_server
conda activate utility
python server.py
```
*Outputs: `ImmunoAI Mini Server Online at http://127.0.0.1:5001`*

### Step 2: Start the Node.js Backend Server
Open a second terminal:
```bash
cd ~/Desktop/IDL\ Code/server
npm start
```
*Outputs: `ImmunoAI Node.js Server Online on http://localhost:8000`*

### Step 3: Start the React Frontend
Open a third terminal:
```bash
cd ~/Desktop/IDL\ Code/client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## How Google Colab Training Works

1. Run the code in [`server/ai_service/training_model/colab_training_notebook.py`](ai_service/training_model/colab_training_notebook.py) in Google Colab on a free T4 GPU.
2. Colab trains the model on the full Kaggle dataset in ~2-3 minutes.
3. Download `immunoai_model.pth` and `evaluation_curves.png` from Colab.
4. Replace the files in [`server/ai_service/saved_model/`](ai_service/saved_model/) with the downloaded ones.
5. Done! The mini-server automatically uses the new weights without changing any code.
