#!/usr/bin/env python3
"""KPPDF 3.0 — Monitoring Server
   Runs on port 3001, serves:
     /api/status  → JSON with all server metrics
     /            → Beautiful dashboard (index.html)
"""

import json
import math
import os
import platform
import subprocess
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request

# Default User-Agent to avoid Cloudflare blocking
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

HOST = os.getenv("MONITOR_HOST", "0.0.0.0")
PORT = int(os.getenv("MONITOR_PORT", "3001"))
HOST_PROC = os.getenv("HOST_PROC", "/host/proc")
HOST_ROOT = os.getenv("HOST_ROOT", "/hostroot")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
REFRESH_INTERVAL = int(os.getenv("REFRESH_INTERVAL", "10"))
HISTORY_SIZE = 30  # keep last 30 snapshots

# ─── Remote site check ───
SITE_URL = os.getenv("SITE_URL", "https://sport-set.ru")

# ─── Telegram alerts ───
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
DISK_ALERT_THRESHOLD = int(os.getenv("DISK_ALERT_THRESHOLD", "90"))
ALERT_CHECK_INTERVAL = int(os.getenv("ALERT_CHECK_INTERVAL", "300"))  # 5 minutes


def check_site_url(url, timeout=8):
    """Check a remote URL: returns (status_code, response_time_ms, error)."""
    try:
        start = time.time()
        req = Request(url, method="GET")
        req.add_header("User-Agent", BROWSER_UA)
        with urlopen(req, timeout=timeout) as resp:
            elapsed = int((time.time() - start) * 1000)
            return {
                "status_code": resp.status,
                "response_time_ms": elapsed,
                "error": None,
            }
    except Exception as e:
        return {
            "status_code": None,
            "response_time_ms": None,
            "error": str(e),
        }


def get_site_frontend_status():
    """Check the frontend (main page) of the remote site."""
    result = check_site_url(SITE_URL)
    return {
        "url": SITE_URL,
        "status": "ok" if result["status_code"] == 200 else "error",
        **result,
    }


def get_site_backend_status():
    """Check the backend health endpoint of the remote site."""
    api_url = f"{SITE_URL}/api/v1/health"
    result = check_site_url(api_url)
    data = None
    if result["status_code"] == 200:
        try:
            req = Request(api_url, method="GET")
            with urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read())
        except Exception:
            pass
    return {
        "url": api_url,
        "status": "ok" if result["status_code"] == 200 else "error",
        "data": data,
        **result,
    }

# Track previous state to avoid alert spam
_alert_state = {
    "backend_ok": True,
    "disk_over_threshold": False,
    "tunnel_ok": True,
}
_alert_state_lock = threading.Lock()

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


def get_nginx_metrics():
    """Fetch and parse Nginx stub_status metrics from localhost."""
    try:
        req = Request("http://127.0.0.1:80/nginx_status", method="GET")
        with urlopen(req, timeout=3) as resp:
            text = resp.read().decode("utf-8")
    except Exception as e:
        return {"error": str(e), "active": 0, "total_requests": 0, "reading": 0, "writing": 0, "waiting": 0}

    metrics = {"error": None}
    lines = text.strip().split("\n")

    for line in lines:
        line = line.strip()
        # Active connections: 1
        if line.startswith("Active connections:"):
            try:
                metrics["active"] = int(line.split(":")[1].strip())
            except (IndexError, ValueError):
                metrics["active"] = 0
        # 66 66 120  (accepts handled requests)
        elif line.replace(" ", "").isdigit():
            parts = line.split()
            if len(parts) >= 3:
                try:
                    metrics["accepts"] = int(parts[0])
                    metrics["handled"] = int(parts[1])
                    metrics["total_requests"] = int(parts[2])
                except ValueError:
                    pass
        # Reading: 0 Writing: 1 Waiting: 0
        if "Reading:" in line:
            try:
                metrics["reading"] = int(line.split("Reading:")[1].split()[0])
            except (IndexError, ValueError):
                metrics["reading"] = 0
        if "Writing:" in line:
            try:
                metrics["writing"] = int(line.split("Writing:")[1].split()[0])
            except (IndexError, ValueError):
                metrics["writing"] = 0
        if "Waiting:" in line:
            try:
                metrics["waiting"] = int(line.split("Waiting:")[1].split()[0])
            except (IndexError, ValueError):
                metrics["waiting"] = 0

    return metrics


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


def send_telegram_alert(message):
    """Send an alert message via Telegram bot."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML",
        }).encode("utf-8")
        req = Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        with urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[alert] Telegram send failed: {e}")
        return False


def check_and_alert():
    """Check current status and send alerts if thresholds exceeded."""
    global _alert_state
    status = collect_status()
    alerts = []

    backend = status.get("backend", {})
    backend_ok = backend.get("status") == "ok"

    disk = status.get("system", {}).get("disk", {})
    disk_pct = disk.get("percent", 0)
    disk_over = disk_pct > DISK_ALERT_THRESHOLD

    tunnel = status.get("tunnel", {})
    tunnel_ok = tunnel.get("status") == "active"

    with _alert_state_lock:
        # Backend changed
        if backend_ok != _alert_state["backend_ok"]:
            if not backend_ok:
                alerts.append(f"🔴 <b>Backend недоступен!</b>\n{backend.get('error', 'Нет ответа')}")
            else:
                alerts.append(f"🟢 <b>Backend восстановлен</b>")
            _alert_state["backend_ok"] = backend_ok

        # Disk crossed threshold
        if disk_over and not _alert_state["disk_over_threshold"]:
            used = fmt_bytes(disk.get("used", 0))
            total = fmt_bytes(disk.get("total", 0))
            alerts.append(f"⚠️ <b>Диск заполнен на {disk_pct}%</b>\n{used} / {total}")
            _alert_state["disk_over_threshold"] = True
        elif not disk_over and _alert_state["disk_over_threshold"]:
            alerts.append(f"✅ <b>Диск в норме</b> ({disk_pct}%)")
            _alert_state["disk_over_threshold"] = False

        # Tunnel changed
        if tunnel_ok != _alert_state["tunnel_ok"]:
            if not tunnel_ok:
                alerts.append(f"🔴 <b>Cloudflare Tunnel отключён!</b>")
            else:
                alerts.append(f"🟢 <b>Cloudflare Tunnel восстановлен</b>")
            _alert_state["tunnel_ok"] = tunnel_ok

    if alerts:
        msg = "🚀 <b>KPPDF 3.0 — Мониторинг</b>\n" + "─" * 20 + "\n"
        msg += "\n\n".join(alerts)
        msg += f"\n\n🕐 {time.strftime('%d.%m.%Y %H:%M:%S')}"
        send_telegram_alert(msg)


def alert_worker():
    """Background thread: periodically check status and alert."""
    print(f"[alert] Telegram alerts{' enabled' if TELEGRAM_BOT_TOKEN else ' disabled (no token)'}")
    print(f"[alert] Disk threshold: {DISK_ALERT_THRESHOLD}%, Check interval: {ALERT_CHECK_INTERVAL}s")
    while True:
        time.sleep(ALERT_CHECK_INTERVAL)
        try:
            check_and_alert()
        except Exception as e:
            print(f"[alert] Error: {e}")


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
    site_frontend = get_site_frontend_status()
    site_backend = get_site_backend_status()

    return {
        "timestamp": int(time.time()),
        "system": {
            "hostname": platform.node(),
            "platform": platform.system(),
            "release": platform.release(),
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
            "metrics": get_nginx_metrics(),
        },
        "tunnel": {
            "status": get_service_status("cloudflared"),
            "connections": get_tunnel_details(),
        },
        "site": {
            "frontend": site_frontend,
            "backend": site_backend,
        },
        "refresh_interval": REFRESH_INTERVAL,
    }


def fmt_bytes(bytes_val):
    """Format bytes to human-readable string."""
    if not bytes_val:
        return "0 B"
    k = 1024
    sizes = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.log(bytes_val, k)) if bytes_val > 0 else 0
    return f"{bytes_val / (k ** i):.1f} {sizes[i]}"


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

    # Start Telegram alert worker in background
    alert_thread = threading.Thread(target=alert_worker, daemon=True)
    alert_thread.start()

    server = HTTPServer((HOST, PORT), MonitoringHandler)
    print("[KPPDF] Monitoring Server starting...")
    print(f"   URL:  http://{HOST}:{PORT}")
    print(f"   API:  http://{HOST}:{PORT}/api/status")
    print(f"   Dash: http://{HOST}:{PORT}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[monitor] Shutting down...")
        server.server_close()


if __name__ == "__main__":
    main()
