"""
PathHoles AI Validation Service
=================================
Two-tier image validation using CLIP ViT-L/14:

  Tier 1 — Custom trained classifier (for categories you provided images for):
    • Embeds the image with CLIP's vision encoder
    • Runs through a LogisticRegression head trained on YOUR exact images
    • Reports confidence as a probability (0.0–1.0)
    • Rejects if confidence < 0.40 (40%)

  Tier 2 — Zero-shot CLIP (for remaining categories with no training data):
    • Compares image against category-specific text labels + negative labels
    • Rejects if positive probability mass < per-category threshold

Adding more training images:
    Drop images into the correct folder under backend/model images/
    and re-run:  python train.py
"""

import os, io, json, pickle, base64, logging
import numpy as np
from pathlib import Path
from flask import Flask, request, jsonify
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)

# ── Load CLIP ─────────────────────────────────────────────────────────────────
MODEL_NAME = "openai/clip-vit-large-patch14"
log.info("Loading CLIP model %s ...", MODEL_NAME)
clip_model = CLIPModel.from_pretrained(MODEL_NAME)
processor  = CLIPProcessor.from_pretrained(MODEL_NAME)
clip_model.eval()
log.info("CLIP model loaded.")

# ── Load trained classifier ───────────────────────────────────────────────────
MODEL_DIR      = Path(__file__).parent / "model"
CLF_PATH       = MODEL_DIR / "classifier.pkl"
LABEL_MAP_PATH = MODEL_DIR / "label_map.json"

custom_clf:        object | None = None
custom_le:         object | None = None
custom_categories: set[str] = set()

if CLF_PATH.exists() and LABEL_MAP_PATH.exists():
    with open(CLF_PATH, "rb") as f:
        bundle = pickle.load(f)
    custom_clf = bundle["classifier"]
    custom_le  = bundle["label_encoder"]
    with open(LABEL_MAP_PATH) as f:
        label_map: dict[str, str] = json.load(f)
    custom_categories = set(label_map.values())
    log.info("✅ Custom classifier loaded — covers: %s", sorted(custom_categories))
else:
    log.warning("⚠️  No trained model found — using zero-shot CLIP for all categories. "
                "Run python train.py to train the custom model.")

# ── Zero-shot text labels per category (fallback for untrained categories) ────
CATEGORY_LABELS: dict[str, list[str]] = {
    "pothole-road-damage": [
        "a large pothole on a road",
        "damaged road surface with a deep hole",
        "cracked and broken asphalt pavement",
        "road with multiple potholes and cracks",
        "deteriorated road surface with holes",
        "damaged street with broken tarmac",
        "road pavement with sunken area",
        "asphalt road with visible damage and cracks",
        "broken concrete road surface",
        "road damage with rough uneven surface",
    ],
    "electrical-wire": [
        "exposed electrical wire hanging dangerously",
        "damaged power line on a street",
        "broken electrical cable near the road",
        "live wire fallen on the ground outdoors",
        "sparking electrical wire on a utility pole",
        "tangled overhead power cables",
        "low hanging electrical wire over road",
        "snapped power line on street",
        "downed electrical cable near building",
        "frayed and exposed wiring on a utility pole",
    ],
    "street-light": [
        "broken street light pole on road",
        "damaged street lamp that is not working",
        "fallen street light pole on the ground",
        "cracked and bent street light post",
        "vandalized street lighting fixture",
        "missing street lamp on a dark road",
        "shattered street light glass cover",
        "leaning damaged lamppost on roadside",
        "street light with exposed wiring",
        "non-functional public light on road",
    ],
    "drainage-sewage": [
        "clogged storm drain on street",
        "overflowing sewage water on road",
        "open uncovered manhole on street",
        "blocked street drainage with standing water",
        "sewage water flooding footpath",
        "broken manhole cover on road",
        "drainage pipe overflowing on street",
        "open sewer drain without cover",
        "smelly sewage water pooling on road",
        "blocked gutter with overflow",
    ],
    "garbage-waste": [
        "overflowing garbage bin on street",
        "illegal dumping of waste on roadside",
        "large pile of garbage on public road",
        "scattered trash and waste on street",
        "abandoned waste bags piled on footpath",
        "rubbish heap near residential area",
        "trash overflowing from dustbin",
        "garbage dump site on road",
        "littered street with waste materials",
        "uncollected waste bin on footpath",
        "plastic bags and waste scattered outdoors",
        "rotting garbage heap on public land",
        "stray animals near garbage dump on road",
        "open garbage bin with waste spilling out",
        "municipal waste not collected on street",
    ],
    "water-pipeline": [
        "water leaking from a broken pipe on road",
        "burst water main flooding street",
        "water pipeline break on the road",
        "water gushing out from underground pipe",
        "water main leaking on footpath",
        "pipe burst with water pooling on road",
        "broken water supply pipe on street",
        "flooded road from burst water main",
        "water seeping from cracked pipeline",
        "water supply pipe damage outdoor",
        "orange pipe with water spraying out",
        "water jet from broken underground pipe",
        "water supply leak on public road",
        "cracked pipe with water flooding footpath",
        "municipal water pipe burst on street",
    ],
    "traffic-signage": [
        "damaged traffic signal at intersection",
        "missing road sign on street",
        "broken traffic light on road",
        "fallen road sign on footpath",
        "vandalized traffic warning sign",
        "bent speed limit sign on road",
        "non-functional traffic signal outdoors",
        "broken median road barrier",
        "missing stop sign at junction",
        "damaged road direction sign",
    ],
    "public-infrastructure": [
        "broken footpath pavement on street",
        "damaged public bench in park",
        "cracked pedestrian walkway",
        "broken road divider on highway",
        "damaged bus shelter on road",
        "collapsed retaining wall on street",
        "broken bridge railing",
        "damaged staircase in public area",
        "cracked flyover structure",
        "deteriorated public sidewalk",
    ],
    "flooding": [
        "flooded road with deep water",
        "waterlogged street after rain",
        "flash flood on residential road",
        "submerged vehicles in flood water",
        "street completely covered with flood water",
        "water logging on road and footpath",
        "flooding near building entrance",
        "stagnant water on flooded road",
        "overflowing river flooding road",
        "water inundation on public street",
        "blue water covering entire road surface",
        "road submerged under water after rain",
        "knee deep water on flooded street",
        "cars partially submerged in flood",
        "water level rising on urban road",
        "horizontal stripes of water across road",
    ],
    "other": [
        "damaged public property outdoors",
        "civic infrastructure problem on street",
        "public place requiring maintenance",
        "damaged outdoor structure",
        "broken public facility",
        "hazardous condition on street",
        "outdoor damage requiring repair",
        "street-level problem needing attention",
        "visible damage to public property",
        "unsafe condition in public area",
    ],
}

NEGATIVE_LABELS: list[str] = [
    "a selfie of a person smiling",
    "a portrait photo of a human face",
    "food on a plate in a restaurant",
    "a cat or dog as a pet indoors",
    "a landscape with mountains and sky",
    "a beach with ocean waves",
    "a screenshot of a mobile app",
    "a document or paper with text",
    "a plant or flower in a garden",
    "a car interior dashboard",
    "an indoor room with furniture",
    "a sunset or sunrise sky",
    "a group of people at a party",
    "a shopping mall interior",
    "an airplane in the sky",
    "a computer screen with code",
    "a wedding ceremony",
    "a sports event in a stadium",
    "cooking in a kitchen",
    "a baby or child playing indoors",
]

# Per-category zero-shot thresholds (used only when no custom model covers that category)
DEFAULT_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.45"))
CATEGORY_THRESHOLDS: dict[str, float] = {
    "pothole-road-damage":    0.45,
    "electrical-wire":        0.40,
    "street-light":           0.40,
    "drainage-sewage":        0.38,
    "garbage-waste":          0.38,
    "water-pipeline":         0.38,
    "traffic-signage":        0.42,
    "public-infrastructure":  0.38,
    "flooding":               0.38,
    "other":                  0.32,
}

# Custom classifier confidence threshold — must be >= 40% to pass
CUSTOM_CLF_THRESHOLD = float(os.getenv("CUSTOM_CLF_THRESHOLD", "0.40"))


# ── Helpers ───────────────────────────────────────────────────────────────────

def decode_image(data: str) -> Image.Image:
    if "," in data:
        data = data.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")


def get_clip_embedding(image: Image.Image) -> np.ndarray:
    """Return L2-normalised CLIP image embedding."""
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        out     = clip_model.vision_model(**inputs)
        pooled  = out.pooler_output
        feat    = clip_model.visual_projection(pooled)
        feat    = feat / feat.norm(dim=-1, keepdim=True)
    return feat.squeeze().cpu().numpy()


def zero_shot_score(image: Image.Image, positive: list[str], negative: list[str]) -> float:
    """Positive probability mass from softmax over all labels."""
    all_texts = positive + negative
    inputs = processor(text=all_texts, images=image, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = clip_model(**inputs)
    logits = outputs.logits_per_image.squeeze()
    probs  = logits.softmax(dim=-1).tolist()
    return sum(probs[:len(positive)])


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({
        "status":              "ok",
        "model":               MODEL_NAME,
        "custom_clf_loaded":   custom_clf is not None,
        "custom_categories":   sorted(custom_categories),
        "zeroshot_categories": sorted(set(CATEGORY_LABELS) - custom_categories),
        "custom_threshold":    CUSTOM_CLF_THRESHOLD,
    })


@app.post("/validate")
def validate():
    """
    Body (JSON):
      image       – base64-encoded image (with or without data-URI prefix)
      description – user-supplied report description (may be empty at step-2)
      category    – category slug (e.g. "pothole-road-damage")

    Response:
      { "valid": bool, "score": float, "reason": str, "method": str }
    """
    body        = request.get_json(force=True, silent=True) or {}
    image_b64   = body.get("image", "")
    description = body.get("description", "").strip()
    category    = body.get("category", "other").strip().lower()

    if not image_b64:
        return jsonify({"valid": False, "score": 0.0, "reason": "No image provided"}), 400

    try:
        image = decode_image(image_b64)
    except Exception as exc:
        log.warning("Image decode failed: %s", exc)
        return jsonify({"valid": False, "score": 0.0, "reason": "Invalid image data"}), 400

    category_display = category.replace("-", " ").title()

    # ── Tier 1: Custom trained classifier ────────────────────────────────────
    if custom_clf is not None and category in custom_categories:
        try:
            emb  = get_clip_embedding(image).reshape(1, -1)
            prob = custom_clf.predict_proba(emb)[0]              # probabilities per class
            pred_idx   = int(np.argmax(prob))
            confidence = float(prob[pred_idx])
            pred_label = custom_le.classes_[pred_idx]            # type: ignore[union-attr]

            log.info(
                "[CUSTOM] category=%s predicted=%s confidence=%.3f threshold=%.2f",
                category, pred_label, confidence, CUSTOM_CLF_THRESHOLD,
            )

            # Wrong category predicted
            if pred_label != category:
                wrong_display = pred_label.replace("-", " ").title()
                return jsonify({
                    "valid":  False,
                    "score":  round(confidence, 4),
                    "reason": (
                        f"This photo looks like a '{wrong_display}' issue, not "
                        f"'{category_display}'. Please upload a photo that matches "
                        f"the issue you selected."
                    ),
                    "method": "custom_classifier",
                })

            # Correct category but low confidence
            if confidence < CUSTOM_CLF_THRESHOLD:
                return jsonify({
                    "valid":  False,
                    "score":  round(confidence, 4),
                    "reason": (
                        f"The photo is not clear enough to confirm it shows a "
                        f"'{category_display}' issue (confidence {confidence:.0%} < 40%). "
                        f"Please upload a clearer, better-lit photo of the actual problem."
                    ),
                    "method": "custom_classifier",
                })

            return jsonify({
                "valid":  True,
                "score":  round(confidence, 4),
                "reason": f"Image confirmed as '{category_display}' issue ({confidence:.0%} confidence).",
                "method": "custom_classifier",
            })

        except Exception as exc:
            log.error("Custom classifier error: %s — falling back to zero-shot", exc)

    # ── Tier 2: Zero-shot CLIP fallback ──────────────────────────────────────
    cat_labels = CATEGORY_LABELS.get(category, CATEGORY_LABELS["other"])
    positive   = ([description] if description else []) + cat_labels

    try:
        score = zero_shot_score(image, positive, NEGATIVE_LABELS)
    except Exception as exc:
        log.error("Zero-shot inference error: %s", exc)
        return jsonify({"valid": False, "score": 0.0, "reason": "Model inference failed"}), 500

    threshold = CATEGORY_THRESHOLDS.get(category, DEFAULT_THRESHOLD)

    log.info(
        "[ZEROSHOT] category=%s score=%.3f threshold=%.3f valid=%s",
        category, score, threshold, score >= threshold,
    )

    if score < threshold:
        return jsonify({
            "valid":  False,
            "score":  round(score, 4),
            "reason": (
                f"The uploaded image does not appear to show a '{category_display}' issue. "
                f"Please upload a clear photo of the actual problem you are reporting."
            ),
            "method": "zero_shot",
        })

    return jsonify({
        "valid":  True,
        "score":  round(score, 4),
        "reason": f"Image is relevant to the reported '{category_display}' issue.",
        "method": "zero_shot",
    })


if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=False)
