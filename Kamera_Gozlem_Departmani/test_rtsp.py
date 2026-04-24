import cv2
import os

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

paths = [
    "/cam/realmonitor?channel=1&subtype=1",
    "/cam/realmonitor?channel=1&subtype=0",
    "/Streaming/Channels/101",
    "/Streaming/Channels/102",
    "/11",
    "/12",
    "/video1",
    "/video2",
    "/live/ch00_1",
    "/stream1",
    "/stream2"
]

ip = "192.168.1.202"
auth = "admin:tuana1452."

for path in paths:
    url = f"rtsp://{auth}@{ip}:554{path}"
    print(f"Testing {path}...")
    cap = cv2.VideoCapture(url)
    if cap.isOpened():
        print(f"SUCCESS: {url}")
        cap.release()
        break
    else:
        print("FAILED")
