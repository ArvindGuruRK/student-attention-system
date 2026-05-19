import os
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python.vision.face_detector import FaceDetector, FaceDetectorOptions
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "blaze_face_short_range.tflite")

_options = FaceDetectorOptions(
    base_options=BaseOptions(model_asset_path=_MODEL_PATH),
    running_mode=VisionTaskRunningMode.IMAGE,
    min_detection_confidence=0.5,
)
_detector = FaceDetector.create_from_options(_options)


# Detect whether a face is present in a BGR frame; returns (face_present, bbox or None)
def detect_face(frame: np.ndarray) -> tuple[bool, dict | None]:
    try:
        rgb = frame[:, :, ::-1]  # BGR → RGB for MediaPipe
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = _detector.detect(mp_image)

        if not result.detections:
            return False, None

        detection = result.detections[0]
        bbox = detection.bounding_box
        bounding_box = {
            "x": bbox.origin_x,
            "y": bbox.origin_y,
            "width": bbox.width,
            "height": bbox.height,
        }
        return True, bounding_box

    except Exception:
        return False, None
