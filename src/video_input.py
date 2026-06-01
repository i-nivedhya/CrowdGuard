# src/video_input.py — handles webcam and video file input
import cv2
 
def open_source(source=0):
    """
    Opens a video source.
    source=0 means default webcam.
    source='path/to/video.mp4' means a video file.
    Returns a cv2.VideoCapture object.
    """
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(f'Could not open video source: {source}')
    # Print source info
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f'[VideoInput] Opened source: {source}')
    print(f'[VideoInput] Resolution: {w}x{h}, FPS: {fps}')
    return cap
 
def read_frame(cap):
    """
    Read one frame from the video source.
    Returns (True, frame) if successful, (False, None) if stream ended.
    """
    ret, frame = cap.read()
    if not ret:
        return False, None
    return True, frame
 
def release(cap):
    """Release the video capture object and free resources."""
    cap.release()

