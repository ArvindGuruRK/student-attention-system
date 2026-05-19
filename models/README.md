# ML Model Files

The binary model files required by the CV engine and browser-side MediaPipe are not committed to this repository (they are large and belong in dedicated model registries).

## Files needed

| File                          | Used by                        | Size   |
|-------------------------------|--------------------------------|--------|
| `blaze_face_short_range.tflite` | `cv_engine/face_detector.py` | ~400 KB |
| `face_landmarker.task`          | `cv_engine/head_pose.py` + browser MediaPipe | ~2 MB |

## Download

Run the helper script from the repo root:

```bash
backend/venv/Scripts/python scripts/download_models.py
```

Or download manually from the MediaPipe model card on Google's model hub and place the files directly in this directory (`models/`).

## Browser-side MediaPipe

The Next.js frontend loads MediaPipe WASM assets from the `frontend/public/mediapipe/` directory. Those assets are also excluded from git. To populate them, run:

```bash
npm run --prefix frontend setup:mediapipe
```

This copies the required WASM and model files from the installed `@mediapipe/face_mesh` npm package into `public/mediapipe/`.

---

If you are only running the **browser-side** attention pipeline (the default), you only need the files in `frontend/public/mediapipe/`. The `models/` directory is only required when running the optional Python CV engine (`cv_engine/main.py`).
