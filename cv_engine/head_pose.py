import os
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks.python.vision.face_landmarker import FaceLandmarker, FaceLandmarkerOptions
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "face_landmarker.task")

_options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=_MODEL_PATH),
    running_mode=VisionTaskRunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)
_landmarker = FaceLandmarker.create_from_options(_options)

# Standard 3D model points (OpenCV reference, arbitrary units, Z toward viewer)
_MODEL_POINTS = np.array([
    (0.0,      0.0,      0.0),    # Nose tip           — landmark 1
    (0.0,   -330.0,    -65.0),    # Chin               — landmark 152
    (-225.0,  170.0,  -135.0),    # Left eye corner    — landmark 263
    (225.0,   170.0,  -135.0),    # Right eye corner   — landmark 33
    (-150.0, -150.0,  -125.0),    # Left mouth corner  — landmark 287
    (150.0,  -150.0,  -125.0),    # Right mouth corner — landmark 57
], dtype=np.float64)

# Indices into MediaPipe's 478-landmark array for the 6 points above
_LANDMARK_IDS = [1, 152, 263, 33, 287, 57]


# Extract the 6 key 2D image points from face landmarker results
def _get_image_points(landmarks: list, w: int, h: int) -> np.ndarray:
    points = []
    for idx in _LANDMARK_IDS:
        lm = landmarks[idx]
        points.append((lm.x * w, lm.y * h))
    return np.array(points, dtype=np.float64)


# Build a simple camera matrix assuming no lens distortion
def _get_camera_matrix(w: int, h: int) -> tuple[np.ndarray, np.ndarray]:
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0,            center[0]],
        [0,            focal_length, center[1]],
        [0,            0,            1        ],
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)
    return camera_matrix, dist_coeffs


# Estimate yaw, pitch, roll in degrees from a BGR frame; returns None if no face found
def estimate_head_pose(frame: np.ndarray) -> tuple[float, float, float] | None:
    try:
        h, w = frame.shape[:2]
        rgb = frame[:, :, ::-1]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = _landmarker.detect(mp_image)

        if not result.face_landmarks:
            return None

        landmarks = result.face_landmarks[0]
        image_points = _get_image_points(landmarks, w, h)
        camera_matrix, dist_coeffs = _get_camera_matrix(w, h)

        success, rotation_vec, _ = cv2.solvePnP(
            _MODEL_POINTS,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )

        if not success:
            return None

        rotation_matrix, _ = cv2.Rodrigues(rotation_vec)
        # RQDecomp3x3 gives stable Euler angles directly in degrees
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rotation_matrix)
        pitch, yaw, roll = angles[0], angles[1], angles[2]

        return round(yaw, 2), round(pitch, 2), round(roll, 2)

    except Exception:
        return None
