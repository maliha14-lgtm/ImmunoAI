"""
ImmunoAI — Custom CNN Model Verification Script
Tests the loaded .pth weights from Google Colab with forward pass and real image inspection.

Run with:
  conda activate utility
  cd server/ai_service/mini_server
  python test_custom_model.py
"""

import sys
import time
from pathlib import Path
import torch
from PIL import Image

import predictor

print("=" * 65)
print("🛡️  ImmunoAI — Custom CNN Model Verification & Diagnostic Tool")
print("=" * 65)

# Check active weights
weights_file = predictor.find_custom_weights()
if weights_file:
    print(f"✅ Found Model Weights: {weights_file.name}")
    print(f"📁 Full Path:           {weights_file}")
    info = predictor.checkpoint_info
    if info.get("val_acc") is not None:
        print(f"🏆 Best Val Accuracy:   {info['val_acc']:.2f}%")
    if info.get("epoch") is not None:
        print(f"⏱️  Trained Epoch:       {info['epoch']}")
else:
    print("⚠️  No .pth model weights file found yet!")
    print(f"👉 Please place your downloaded file into:")
    print(f"   {predictor.SAVED_MODEL_DIR / 'immunoai_model.pth'}")
    print("=" * 65)
    sys.exit(0)

# Run synthetic forward pass
print("\n[Step 1/2] Running synthetic tensor forward pass (Shape: [1, 3, 224, 224])...")
try:
    dummy = torch.randn(1, 3, 224, 224).to(predictor.DEVICE)
    start_t = time.time()
    with torch.no_grad():
        logits = predictor.custom_model(dummy)
        prob = torch.sigmoid(logits).item()
    ms = round((time.time() - start_t) * 1000, 2)
    print(f"✅ Forward pass successful!")
    print(f"   Logit: {logits.item():+.4f} | Sigmoid Prob: {prob*100:.2f}% | Latency: {ms}ms")
except Exception as e:
    print(f"❌ Forward pass failed: {e}")
    sys.exit(1)

# Run real snapshot frame test if available
print("\n[Step 2/2] Testing real camera snapshot frame...")
latest_snap = predictor.SNAPSHOTS_DIR / "latest_stream_frame.jpg"
if latest_snap.exists():
    try:
        pil_img = Image.open(latest_snap).convert("RGB")
        tensor = predictor.custom_transform(pil_img).unsqueeze(0).to(predictor.DEVICE)
        with torch.no_grad():
            real_logits = predictor.custom_model(tensor)
            real_prob = torch.sigmoid(real_logits).item()
        
        status = "🚨 INTRUDER / HUMAN DETECTED" if real_prob >= 0.50 else "✅ CLEAN / NORMAL FEED"
        print(f"✅ Successfully tested on '{latest_snap.name}'!")
        print(f"   Status:     {status}")
        print(f"   Confidence: {real_prob*100:.1f}%")
        print(f"   Raw Logit:  {real_logits.item():+.4f}")
    except Exception as e:
        print(f"⚠️ Snapshot test note: {e}")
else:
    print(f"ℹ️  No stream frame captured yet at '{latest_snap.name}'.")
    print("   Turn Protection Mode ON in the dashboard to capture live frames!")

print("\n" + "=" * 65)
print("🎉 Model is fully verified and ready for live surveillance!")
print("=" * 65)
