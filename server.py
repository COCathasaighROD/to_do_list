import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = "daily-planner"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == "__main__":
    # Change to the scratch directory
    os.chdir(r"C:\Users\Cian.OCathasaigh\.gemini\antigravity\scratch")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
