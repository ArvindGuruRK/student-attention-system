# ML Model Files

The binary model files required by browser-side MediaPipe are not committed to this repository (they are large and belong in dedicated model registries).

## Browser-side MediaPipe

The Next.js frontend loads MediaPipe WASM assets from the `frontend/public/mediapipe/` directory. Those assets are excluded from git. To populate them, run:

```bash
npm run --prefix frontend setup:mediapipe
```

This copies the required WASM and model files from the installed `@mediapipe/face_mesh` npm package into `public/mediapipe/`.
