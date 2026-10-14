"""
PathHoles Custom Model Trainer
================================
Uses CLIP ViT-L/14 as a frozen feature extractor and trains a lightweight
classifier head on top using your labelled images.

This approach works reliably with very few images per class (even 3-4).

Usage:
    python train.py

Output:
    classifier.pkl   – trained sklearn LogisticRegression classifier
    label_map.json   – maps class index → category slug
    embeddings.npz   – cached CLIP embeddings (for inspection)
"""

import os
import json
import glob
import pickle
import numpy as np
from pathlib import Path
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import warnings
warnings.filterwarnings("ignore")

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_NAME   = "openai/clip-vit-large-patch14"
DATA_DIR     = Path(__file__).parent.parent / "backend" / "model images"
OUTPUT_DIR   = Path(__file__).parent / "model"
OUTPUT_DIR.mkdir(exist_ok=True)

# Folder name → canonical category slug used by the app
FOLDER_TO_SLUG: dict[str, str] = {
    "garbage waste":    "garbage-waste",
    "garbage waste ":   "garbage-waste",   # trailing space variant
    "electrical wires": "electrical-wire",
    "electrical wire":  "electrical-wire",
    "path holes":       "pothole-road-damage",
    "potholes":         "pothole-road-damage",
    "streetlight":      "street-light",
    "street light":     "street-light",
    "drainage":         "drainage-sewage",
    "flooding":         "flooding",
    "water pipeline":   "water-pipeline",
    "traffic signage":  "traffic-signage",
    "public infrastructure": "public-infrastructure",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

# ── Load CLIP ─────────────────────────────────────────────────────────────────
print(f"Loading CLIP model {MODEL_NAME} ...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model  = CLIPModel.from_pretrained(MODEL_NAME).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_NAME)
model.eval()
print(f"Model loaded on {device}.")


def get_slug(path: Path) -> str | None:
    """
    Derive the category slug from the file's directory hierarchy.
    Walk UP from the file until we find a folder name we recognise.
    """
    for parent in path.parents:
        name = parent.name.strip().lower()
        if name in FOLDER_TO_SLUG:
            return FOLDER_TO_SLUG[name]
    return None


def embed_image(path: Path) -> np.ndarray | None:
    """Return CLIP image embedding as a 1-D numpy array."""
    try:
        img = Image.open(path).convert("RGB")
        inputs = processor(images=img, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.vision_model(**inputs)
            # Use CLS token (pooler output) — works across all transformers versions
            pooled = outputs.pooler_output          # [1, hidden]
            # Project through the visual projection layer to get the proper CLIP embedding
            features = model.visual_projection(pooled)
            features = features / features.norm(dim=-1, keepdim=True)  # L2 normalise
        return features.squeeze().cpu().numpy()
    except Exception as exc:
        print(f"  ⚠️  Could not embed {path.name}: {exc}")
        return None


# ── Collect training data ─────────────────────────────────────────────────────
print(f"\nScanning training images in: {DATA_DIR}")
X, y, file_list = [], [], []

for img_path in sorted(DATA_DIR.rglob("*")):
    if img_path.suffix.lower() not in IMAGE_EXTENSIONS:
        continue
    slug = get_slug(img_path)
    if slug is None:
        print(f"  ⚠️  Skipping (unknown category): {img_path.relative_to(DATA_DIR)}")
        continue

    print(f"  → [{slug}] {img_path.relative_to(DATA_DIR)}")
    emb = embed_image(img_path)
    if emb is not None:
        X.append(emb)
        y.append(slug)
        file_list.append(str(img_path))

X = np.array(X)
y = np.array(y)

print(f"\nLoaded {len(X)} images across {len(set(y))} categories:")
for cls in sorted(set(y)):
    print(f"  {cls}: {(y == cls).sum()} images")

if len(X) == 0:
    print("❌ No training images found. Check your DATA_DIR path.")
    raise SystemExit(1)

# ── Encode labels ─────────────────────────────────────────────────────────────
le = LabelEncoder()
y_enc = le.fit_transform(y)
label_map = {int(i): str(cls) for i, cls in enumerate(le.classes_)}
print(f"\nLabel map: {label_map}")

# ── Train classifier ──────────────────────────────────────────────────────────
# LogisticRegression works extremely well on top of CLIP embeddings.
# C=10 allows some overfitting which is intentional with tiny datasets.
clf = LogisticRegression(
    C=10,
    max_iter=2000,
    solver="lbfgs",
    random_state=42,
)

n_classes = len(set(y))
n_samples = len(X)
print(f"\nTraining LogisticRegression on {n_samples} samples, {n_classes} classes...")

# Cross-validation only makes sense when we have enough samples per class
min_per_class = min((y == cls).sum() for cls in set(y))
if min_per_class >= 2 and n_samples >= n_classes * 2:
    n_splits = min(min_per_class, 5)
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X, y_enc, cv=cv, scoring="accuracy")
    print(f"Cross-val accuracy ({n_splits}-fold): {cv_scores.mean():.1%} ± {cv_scores.std():.1%}")
    print(f"Per-fold: {[f'{s:.1%}' for s in cv_scores]}")
else:
    print("(Not enough samples per class for cross-validation — training on full dataset)")

# Train on all data
clf.fit(X, y_enc)
train_acc = clf.score(X, y_enc)
print(f"Training accuracy (full set): {train_acc:.1%}")

# Per-class report
y_pred = clf.predict(X)
print("\nClassification report:")
print(classification_report(y_enc, y_pred, target_names=le.classes_))

# ── Save model ────────────────────────────────────────────────────────────────
clf_path   = OUTPUT_DIR / "classifier.pkl"
label_path = OUTPUT_DIR / "label_map.json"
emb_path   = OUTPUT_DIR / "embeddings.npz"

with open(clf_path, "wb") as f:
    pickle.dump({"classifier": clf, "label_encoder": le}, f)

with open(label_path, "w") as f:
    json.dump(label_map, f, indent=2)

np.savez(emb_path, X=X, y=y, files=file_list)

print(f"\n✅ Model saved to {OUTPUT_DIR}/")
print(f"   classifier.pkl  — {clf_path.stat().st_size // 1024} KB")
print(f"   label_map.json  — {label_map}")
print("\nRun 'python app.py' to start the updated validation service.")
