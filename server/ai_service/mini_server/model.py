"""
ImmunoAI — YOLO-Inspired Deep Convolutional Neural Network (ImmunoAICNN v2)
Designed for Real-Time Intruder & Human Presence Detection.

Architectural Innovations (Inspired by modern YOLOv8 CSPDarknet):
  1. CBS Blocks: Conv2D -> Batch Normalization -> SiLU (Swish) activations for smooth gradient flow.
  2. C2f / CSP Residual Blocks: Cross-Stage Partial feature routing with residual shortcuts.
  3. SPPF (Spatial Pyramid Pooling - Fast): Multi-scale receptive field aggregation (k=5, 9, 13)
     allowing the model to detect humans whether standing close to the camera or far in the room.
  4. Dual-Pooling Classifier Head: Adaptive AvgPool + MaxPool concatenation -> Dense Head with Dropout.
"""

import torch
import torch.nn as nn
from pathlib import Path


class ConvBNSiLU(nn.Module):
    """CBS Block: Conv2D -> BatchNorm2D -> SiLU (as used in YOLOv5/v8)"""
    def __init__(self, in_ch: int, out_ch: int, kernel_size: int = 3, stride: int = 1, padding: int = 1):
        super().__init__()
        self.conv = nn.Conv2d(in_ch, out_ch, kernel_size=kernel_size, stride=stride, padding=padding, bias=False)
        self.bn = nn.BatchNorm2d(out_ch)
        self.act = nn.SiLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(self.bn(self.conv(x)))


class ResidualBottleneck(nn.Module):
    """YOLO Bottleneck Block with residual shortcut"""
    def __init__(self, channels: int, shortcut: bool = True):
        super().__init__()
        mid_ch = channels // 2
        self.cv1 = ConvBNSiLU(channels, mid_ch, kernel_size=1, stride=1, padding=0)
        self.cv2 = ConvBNSiLU(mid_ch, channels, kernel_size=3, stride=1, padding=1)
        self.add = shortcut

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.cv2(self.cv1(x)) if self.add else self.cv2(self.cv1(x))


class C2fBlock(nn.Module):
    """
    CSP / C2f Block from YOLOv8:
    Splits features into two branches, processes through chained residual bottlenecks,
    and concatenates to maximize gradient diversity and multi-level representations.
    """
    def __init__(self, in_ch: int, out_ch: int, n: int = 1):
        super().__init__()
        self.c = in_ch // 2
        self.cv1 = ConvBNSiLU(in_ch, 2 * self.c, kernel_size=1, stride=1, padding=0)
        self.cv2 = ConvBNSiLU((2 + n) * self.c, out_ch, kernel_size=1, stride=1, padding=0)
        self.bottlenecks = nn.ModuleList([ResidualBottleneck(self.c) for _ in range(n)])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y = list(self.cv1(x).chunk(2, 1))
        for b in self.bottlenecks:
            y.append(b(y[-1]))
        return self.cv2(torch.cat(y, 1))


class SPPFBlock(nn.Module):
    """
    Spatial Pyramid Pooling - Fast (SPPF) from YOLO:
    Multi-scale context pooling using consecutive 5x5 max pooling layers.
    Allows capturing both broad full-body silhouettes and fine human facial/limb features.
    """
    def __init__(self, in_ch: int, out_ch: int, k: int = 5):
        super().__init__()
        mid_ch = in_ch // 2
        self.cv1 = ConvBNSiLU(in_ch, mid_ch, kernel_size=1, stride=1, padding=0)
        self.cv2 = ConvBNSiLU(mid_ch * 4, out_ch, kernel_size=1, stride=1, padding=0)
        self.m = nn.MaxPool2d(kernel_size=k, stride=1, padding=k // 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.cv1(x)
        y1 = self.m(x)
        y2 = self.m(y1)
        y3 = self.m(y2)
        return self.cv2(torch.cat([x, y1, y2, y3], 1))


class ImmunoAICNN(nn.Module):
    """
    ImmunoAI YOLO-Inspired Deep Surveillance CNN (v2).
    Outputs a single logit representing P(Intruder / Person Present).
    """
    def __init__(self, num_classes: int = 1):
        super().__init__()

        # Stage 1: P1 (Stem Downsampler: 224x224 -> 112x112)
        self.stage1 = ConvBNSiLU(3, 32, kernel_size=3, stride=2, padding=1)

        # Stage 2: P2 (112x112 -> 56x56) + C2f
        self.stage2 = nn.Sequential(
            ConvBNSiLU(32, 64, kernel_size=3, stride=2, padding=1),
            C2fBlock(64, 64, n=1)
        )

        # Stage 3: P3 (56x56 -> 28x28) + C2f
        self.stage3 = nn.Sequential(
            ConvBNSiLU(64, 128, kernel_size=3, stride=2, padding=1),
            C2fBlock(128, 128, n=2)
        )

        # Stage 4: P4 (28x28 -> 14x14) + C2f
        self.stage4 = nn.Sequential(
            ConvBNSiLU(128, 256, kernel_size=3, stride=2, padding=1),
            C2fBlock(256, 256, n=2)
        )

        # Stage 5: P5 (14x14 -> 7x7) + SPPF (Multi-scale Receptive Field)
        self.stage5 = nn.Sequential(
            ConvBNSiLU(256, 512, kernel_size=3, stride=2, padding=1),
            SPPFBlock(512, 512, k=5)
        )

        # Dual Pooling Head: Combines Average Intensity and Peak Texture Features
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.max_pool = nn.AdaptiveMaxPool2d((1, 1))

        # Classification Head (Regularized with Dropout and SiLU)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(p=0.35),
            nn.Linear(512 * 2, 128),
            nn.SiLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(128, num_classes)
        )

        self._initialize_weights()

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1.0)
                nn.init.constant_(m.bias, 0.0)
            elif isinstance(m, nn.Linear):
                nn.init.kaiming_uniform_(m.weight, nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.stage1(x)
        x2 = self.stage2(x1)
        x3 = self.stage3(x2)
        x4 = self.stage4(x3)
        x5 = self.stage5(x4)

        # Dual pooling: 512 (avg) + 512 (max) = 1024-dim representation
        avg_feat = self.avg_pool(x5)
        max_feat = self.max_pool(x5)
        pooled = torch.cat([avg_feat, max_feat], dim=1)

        logits = self.classifier(pooled)
        return logits


# Alias for clarity
ImmunoYoloCNN = ImmunoAICNN


def get_model(weights_path: str = None, device: str = "cpu") -> ImmunoAICNN:
    """Factory function to instantiate ImmunoAICNN and load weights if available"""
    model = ImmunoAICNN()
    if weights_path and Path(weights_path).exists():
        try:
            checkpoint = torch.load(weights_path, map_location=device)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                model.load_state_dict(checkpoint["state_dict"])
            else:
                model.load_state_dict(checkpoint)
            print(f"[ImmunoAI] Loaded trained model weights from: {weights_path}")
        except Exception as e:
            print(f"[ImmunoAI Warning] Could not load weights from {weights_path}: {e}")
    else:
        print("[ImmunoAI] Initialized fresh ImmunoAICNN architecture.")

    model.to(device)
    model.eval()
    return model


if __name__ == "__main__":
    dummy = torch.randn(2, 3, 224, 224)
    net = ImmunoAICNN()
    out = net(dummy)
    params = sum(p.numel() for p in net.parameters() if p.requires_grad)
    print("ImmunoAICNN v2 (YOLO-Inspired) compiled successfully!")
    print(f"Input shape:  {dummy.shape}")
    print(f"Output shape: {out.shape}")
    print(f"Trainable Parameters: {params:,} (~{params/1e6:.2f}M)")
