# ImmunoAI — Deep Learning Architecture & Viva Guide

This `ai_service` directory contains **only** the Deep Learning components for your term project. You do **not** have to explain Node.js or WebSockets to your instructor — you only present what is in this directory!

---

## 1. Directory Structure

```text
ai_service/
├── data/                    # Folder 1: Raw training & validation images
│   ├── train/ (intruder/, normal/)
│   └── val/   (intruder/, normal/)
│
├── saved_model/             # Folder 2: Trained model weights & evaluation curves
│   ├── immunoai_model.pth   # Best PyTorch model checkpoint (~4.9 MB)
│   └── evaluation_curves.png# Loss and accuracy graphs
│
├── training_model/          # Folder 3: Model Architecture & Training Pipelines
│   ├── model.py             # PyTorch ImmunoAICNN Architecture definition
│   ├── dataset.py           # Preprocessing & Data Augmentation pipeline
│   ├── train.py             # Local training script (saves to ../saved_model/)
│   └── colab_training_notebook.py # Google Colab GPU training script
│
└── mini_server/             # Folder 4: Mini Service bridging to Node.js
    ├── predictor.py         # Pure inference logic (loads weights, runs model, saves snapshots)
    └── server.py            # Minimal HTTP server connecting to Node.js (port 5001)
```

---

## 2. CNN Architecture (`training_model/model.py`) — `ImmunoAICNN`

When the instructor asks: *"Walk me through your neural network architecture."*

```text
Input: (Batch Size, 3, 224, 224) RGB Image
  │
  ├── ConvBlock 1: Conv2D(3 -> 32, kernel=3, pad=1) -> BatchNorm -> ReLU -> MaxPool2D(2)   ==> 112x112
  ├── ConvBlock 2: Conv2D(32 -> 64, kernel=3, pad=1) -> BatchNorm -> ReLU -> MaxPool2D(2)  ==> 56x56
  ├── ConvBlock 3: Conv2D(64 -> 128, kernel=3, pad=1) -> BatchNorm -> ReLU -> MaxPool2D(2) ==> 28x28
  ├── ConvBlock 4: Conv2D(128 -> 256, kernel=3, pad=1) -> BatchNorm -> ReLU -> MaxPool2D(2)==> 14x14
  │
  ├── AdaptiveAvgPool2d((1, 1))                                                             ==> (Batch, 256, 1, 1)
  │
  └── Dense Classifier Head:
      ├── Flatten()
      ├── Dropout(p=0.4)        # Prevents co-adaptation / overfitting
      ├── Linear(256 -> 64)
      ├── ReLU()
      ├── Dropout(p=0.2)
      └── Linear(64 -> 1)       # Single logit output for Binary Cross-Entropy
```

### Viva Key Points:
1. **Hierarchical Feature Extraction**:
   - **Block 1 (32 channels)**: Low-level edges and color gradients.
   - **Block 2 (64 channels)**: Intermediate textures and corners.
   - **Block 3 (128 channels)**: Human body silhouettes and contours.
   - **Block 4 (256 channels)**: High-level semantic intrusion patterns.
2. **Batch Normalization**: Accelerates convergence and stabilizes deep gradient flow.
3. **Adaptive Average Pooling**: Reduces spatial dimensions to $1 \times 1$, making the network input-resolution invariant and keeping total trainable parameters compact (~405K parameters).
4. **BCEWithLogitsLoss**: Combines a Sigmoid layer and Binary Cross-Entropy in one single class for numerical stability (prevents float overflow/underflow).

---

## 3. Google Colab Training Workflow

To train on Kaggle's 2.8 GB dataset in **Google Colab** using a free T4 GPU:

1. Open [Google Colab](https://colab.research.google.com) and set runtime to **T4 GPU** (`Runtime -> Change runtime type -> T4 GPU`).
2. Download your Kaggle dataset directly in Colab:
   ```python
   !pip install -q kagglehub
   import kagglehub
   path = kagglehub.dataset_download("hammadjavaid/person-classification-dataset")
   print("Dataset downloaded to:", path)
   ```
3. Copy the code from [`training_model/colab_training_notebook.py`](colab_training_notebook.py) into Colab and run.
4. When training finishes, Colab automatically downloads:
   - `immunoai_model.pth`
   - `evaluation_curves.png`
5. Place those two downloaded files directly into your local [`saved_model/`](saved_model/) folder!
6. The mini-server and predictor automatically load the new weights without changing any code!

---

## 4. Running the Mini Server

To start the Python inference bridge:
```bash
conda activate utility
cd server/ai_service/mini_server
python server.py
```
Outputs: `ImmunoAI Mini Server Online at http://127.0.0.1:5001`
Node.js communicates with this server to request frame predictions.
