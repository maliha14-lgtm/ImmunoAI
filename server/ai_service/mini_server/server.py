"""
ImmunoAI — Mini Python HTTP Server
Connection bridge between the Node.js server and the PyTorch Predictor.

Run with:
  conda activate utility
  cd server/ai_service/mini_server
  python server.py
"""

import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

import predictor

PORT = int(os.environ.get("PYTHON_AI_PORT", 5001))
HOST = "127.0.0.1"


class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True


class MiniServerHandler(BaseHTTPRequestHandler):
    """Handles HTTP requests sent from the Node.js server"""

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path == "/health" or clean_path == "":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            status = predictor.get_status()
            self.wfile.write(json.dumps(status).encode("utf-8"))
        elif clean_path == "/engine":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = {
                "active_engine": predictor.get_active_engine(),
                "yolo_available": predictor.HAS_YOLO,
                "model": "YOLOv8n (MS COCO)" if predictor.get_active_engine() == "yolo" else "ImmunoAICNN (PyTorch)",
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path == "/predict":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(body)

                base64_image = payload.get("image", "")
                threshold = float(payload.get("threshold", 0.70))

                if not base64_image:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "No image data provided"}).encode("utf-8"))
                    return

                # Delegate prediction to the isolated predictor module
                result = predictor.predict_frame(base64_image, threshold=threshold)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif clean_path == "/engine":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(body) if body else {}
                engine_name = payload.get("engine", "")
                active = predictor.set_engine(engine_name)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "active_engine": active,
                    "yolo_available": predictor.HAS_YOLO,
                    "model": "YOLOv8n (MS COCO)" if active == "yolo" else "ImmunoAICNN (PyTorch)"
                }).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Keep terminal output clean
        pass


def run():
    server_address = (HOST, PORT)
    httpd = ReusableHTTPServer(server_address, MiniServerHandler)
    print("\n========================================================")
    print(f" ImmunoAI Mini Server Online at http://{HOST}:{PORT}")
    print(" Ready to receive prediction requests from Node.js!")
    print("========================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Mini Server...")
        httpd.server_close()


if __name__ == "__main__":
    run()
