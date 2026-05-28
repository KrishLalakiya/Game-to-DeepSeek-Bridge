import http.server
import socketserver
import pyautogui
import threading
import time

PORT = 11499

class PasteHandler(http.server.SimpleHTTPRequestHandler):
    # Disable logging to keep console clean
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/paste':
            print("Received paste signal from Extension...")
            
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b"Paste triggered!")
            
            # Use a short delay in a new thread to ensure the response is sent back before we trigger the keystroke
            def paste():
                # We give the OS a tiny fraction of a second to settle
                time.sleep(0.1)
                pyautogui.hotkey('ctrl', 'v')
                print("Simulated Ctrl+V successfully!")
                
            threading.Thread(target=paste).start()
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    # Avoid address already in use errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), PasteHandler) as httpd:
        print(f"==================================================")
        print(f"[ON] Auto-paste server listening on port {PORT}")
        print(f"Keep this window open in the background while playing!")
        print(f"Waiting for signals from DeepSeek Game Bridge...")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run_server()
