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
    "/stream2",
    "/media/video1/sub",
    "/ch01/1",
    "/ch1/sub",
    "/user=tuana&password=tuana1452.&channel=1&stream=1.sdp",
    "/h264/ch1/sub/av_stream"
]

ips = ["192.168.1.200", "192.168.1.201", "192.168.1.202"]
auth = "tuana:tuana1452."

for ip in ips:
    print(f"\n--- TESTING IP: {ip} ---")
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

