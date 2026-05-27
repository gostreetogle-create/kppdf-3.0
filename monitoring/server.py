#!/usr/bin/env python3
"""KPPDF 3.0 — Monitoring Server
   Runs on port 3001, serves:
     /api/status  → JSON with all server metrics
     /            → Beautiful dashboard (index.html)
"""

import json
import os
import subprocess
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request

HOST = os.getenv("MONITOR_HOST", "127.0.0.1")
PORT = int(os.getenv("MONITOR_PORT", "3001"))
HOST_PROC = os.getenv("HOST_PROC", "/host/proc")
HOST_ROOT = os.getenv("HOST_ROOT", "/hostroot")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
REFRESH_INTERVAL = int(os.getenv("REFRESH_INTERVAL", "10"))
HISTORY_SIZE = 30  # keep last 30 snapshots

# In-memory history for timeline charts
history = []


def run(cmd, timeout=5):
    """Run a shell command, return (stdout, returncode)."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.returncode
    except FileNotFoundError:
        return "command not found", -1
    except subprocess.TimeoutExpired:
        return "timeout", -1
    except Exception as e:
        return str(e), -1


def read_proc_file(filename):
    """Read a file from the host's /proc mount."""
    path = os.path.join(HOST_PROC, filename)
    try:
        with open(path) as f:
            return f.read()
    except Exception:
        return ""


def get_meminfo():
    """Parse /proc/meminfo for total, available, used RAM."""
    data = read_proc_file("meminfo")
    mem = {}
    for line in data.splitlines():
        if "MemTotal" in line:
            mem["total"] = int(line.split()[1]) * 1024
        elif "MemAvailable" in line:
            mem["available"] = int(line.split()[1]) * 1024
        elif "SwapTotal" in line:
            mem["swap_total"] = int(line.split()[1]) * 1024
        elif "SwapFree" in line:
            mem["swap_free"] = int(line.split()[1]) * 1024
    if "total" in mem and "available" in mem:
        mem["used"] = mem["total"] - mem["available"]
        mem["percent"] = round(mem["used"] / mem["total"] * 100, 1)
    return mem


def get_uptime():
    """Parse /proc/uptime."""
    data = read_proc_file("uptime")
    try:
        return float(data.split()[0])
    except (IndexError, ValueError):
        return 0


def get_loadavg():
    """Parse /proc/loadavg."""
    data = read_proc_file("loadavg")
    try:
        parts = data.split()
        return {
            "load_1": float(parts[0]),
            "load_5": float(parts[1]),
            "load_15": float(parts[2]),
            "running": parts[3] if len(parts) > 3 else "",
            "last_pid": int(parts[4]) if len(parts) > 4 else 0,
        }
    except (IndexError, ValueError):
        return {}


def get_cpu_percent():
    """Calculate CPU usage from /proc/stat since last call."""
    data = read_proc_file("stat")
    for line in data.splitlines():
        if line.startswith("cpu "):
            parts = line.split()
            if len(parts) < 5:
                return 0
            user = int(parts[1])
            nice = int(parts[2])
            system = int(parts[3])
            idle = int(parts[4])
            iowait = int(parts[5]) if len(parts) > 5 else 0
            irq = int(parts[6]) if len(parts) > 6 else 0
            softirq = int(parts[7]) if len(parts) > 7 else 0
            steal = int(parts[8]) if len(parts) > 8 else 0
            total = user + nice + system + idle + iowait + irq + softirq + steal
            # Use stored values from previous call
            prev = getattr(get_cpu_percent, "_prev", None)
            get_cpu_percent._prev = (total, idle)
            if prev:
                total_delta = total - prev[0]
                idle_delta = idle - prev[1]
                if total_delta > 0:
                    return round((1 - idle_delta / total_delta) * 100, 1)
            return 0
    return 0


def get_disk_usage():
    """Get root disk usage from mounted host root."""
    out, code = run(["df", "-B1", HOST_ROOT])
    if code != 0:
        return {}
    lines = out.splitlines()
    if len(lines) < 2:
        return {}
    parts = lines[1].split()
    if len(parts) < 4:
        return {}
    try:
        total = int(parts[1])
        used = int(parts[2])
        available = int(parts[3])
        return {
            "total": total,
            "used": used,
            "available": available,
            "percent": round(used / total * 100, 1) if total else 0,
        }
    except (ValueError, IndexError):
        return {}


def get_docker_info():
    """Get Docker containers via mounted Docker socket (docker CLI)."""
    # Get container list
    out, _ = run([
        "docker", "ps", "--format",
        '{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}'
    ])
    containers = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        containers.append({
            "name": parts[0] if len(parts) > 0 else "",
            "status": parts[1] if len(parts) > 1 else "",
            "image": parts[2] if len(parts) > 2 else "",
            "ports": parts[3] if len(parts) > 3 else "",
        })

    # Get stats (CPU, memory)
    stats_out, _ = run([
        "docker", "stats", "--no-stream", "--format",
        '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}'
    ], timeout=10)
    stats_map = {}
    for line in stats_out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            stats_map[parts[0]] = {
                "cpu": parts[1] if len(parts) > 1 else "",
                "mem_usage": parts[2] if len(parts) > 2 else "",
                "mem_percent": parts[3] if len(parts) > 3 else "",
                "net_io": parts[4] if len(parts) > 4 else "",
                "block_io": parts[5] if len(parts) > 5 else "",
            }

    # Merge stats into containers
    for c in containers:
        stats = stats_map.get(c["name"], {})
        c["stats"] = stats

    # Get Docker info (version, containers count)
    info_out, _ = run(["docker", "info", "--format", "{{json .}}"], timeout=5)
    docker_info = {}
    if info_out and info_out != "command not found":
        try:
            parsed = json.loads(info_out)
            docker_info["containers_running"] = parsed.get("ContainersRunning", 0)
            docker_info["containers_total"] = parsed.get("Containers", 0)
            docker_info["server_version"] = parsed.get("ServerVersion", "")
            docker_info["os_type"] = parsed.get("OSType", "")
        except json.JSONDecodeError:
            pass

    return {"containers": containers, "info": docker_info}


def get_backend_health():
    """Check backend health via localhost:3000."""
    try:
        req = Request(f"{BACKEND_URL}/api/v1/health", method="GET")
        with urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return {"status": "ok", "data": data}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def find_process(process_name):
    """Check if a process is running by scanning /host/proc/[pid]/cmdline.
       Returns tuple (is_running: bool, pids: list).
    """
    proc_path = HOST_PROC
    found_pids = []
    try:
        for entry in os.listdir(proc_path):
            if not entry.isdigit():
                continue
            cmdline_path = os.path.join(proc_path, entry, "cmdline")
            try:
                with open(cmdline_path, "rb") as f:
                    raw = f.read()
                # cmdline is null-byte separated; replace with spaces and decode
                cmdline = raw.replace(b"\x00", b" ").decode("utf-8", errors="replace")
                if process_name in cmdline:
                    found_pids.append(int(entry))
            except (OSError, IOError):
                continue
    except (OSError, IOError):
        return False, []
    return len(found_pids) > 0, sorted(found_pids)


def get_service_status(service_name):
    """Check service status by scanning host processes.
       Works inside Docker via mounted /host/proc.
    """
    running, pids = find_process(service_name)
    if running:
        return "active"
    else:
        return "inactive"


def get_tunnel_details():
    """Check if Cloudflare Tunnel process is running."""
    running, pids = find_process("cloudflared")
    if not running or not pids:
        return 0
    return 1


def get_seed_counts():
    """Get entity counts from backend API."""
    try:
        # Try to get overview from backend
        req = Request(f"{BACKEND_URL}/api/v1/overview", method="GET")
        try:
            with urlopen(req, timeout=3) as resp:
                return json.loads(resp.read())
        except Exception:
            pass
    except Exception:
        pass
    return {}


def collect_status():
    """Collect all status metrics into a single dict."""
    mem = get_meminfo()
    uptime_secs = get_uptime()
    load = get_loadavg()
    disk = get_disk_usage()
    docker = get_docker_info()
    backend = get_backend_health()
    cpu = get_cpu_percent()

    return {
        "timestamp": int(time.time()),
        "system": {
            "hostname": os.uname().nodename,
            "platform": os.uname().sysname,
            "release": os.uname().release,
            "uptime": uptime_secs,
            "uptime_human": format_uptime(uptime_secs),
            "load": load,
            "cpu_percent": cpu,
            "memory": mem,
            "disk": disk,
            "cpus": os.cpu_count() or 0,
        },
        "docker": docker,
        "backend": backend,
        "nginx": {
            "status": get_service_status("nginx"),
        },
        "tunnel": {
            "status": get_service_status("cloudflared"),
            "connections": get_tunnel_details(),
        },
        "refresh_interval": REFRESH_INTERVAL,
    }


def format_uptime(seconds):
    """Format seconds into human-readable uptime string."""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    if days > 0:
        return f"{days}д {hours}ч {minutes}м"
    elif hours > 0:
        return f"{hours}ч {minutes}м"
    else:
        return f"{minutes}м"


class MonitoringHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/api/status":
            self.send_json(collect_status())
        elif self.path == "/api/status/history":
            self.send_json({"history": history[-HISTORY_SIZE:]})
        elif self.path == "/":
            self.serve_file("index.html", "text/html; charset=utf-8")
        else:
            self.send_error(404, "Not Found")

    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def serve_file(self, filename, content_type):
        try:
            with open(filename, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404, f"{filename} not found")

    def log_message(self, format, *args):
        """Suppress default logging; use custom format."""
        msg = str(args[0]) if args else ""
        if "/api/status" in msg:
            return  # Don't log frequent API calls
        print(f"[monitor] {self.client_address[0]} - {msg}")


def main():
    # Warm up CPU measurement (first call returns 0)
    get_cpu_percent()
    time.sleep(0.5)
    get_cpu_percent()

    server = HTTPServer((HOST, PORT), MonitoringHandler)
    print(f"🚀 KPPDF Monitoring Server")
    print(f"   URL:  http://{HOST}:{PORT}")
    print(f"   API:  http://{HOST}:{PORT}/api/status")
    print(f"   Dash: http://{HOST}:{PORT}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        server.server_close()


if __name__ == "__main__":
    main()
