"""Collect system monitoring data from Ubuntu VM"""
import paramiko, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=user, password=password, timeout=15, allow_agent=False, look_for_keys=False)


def sudo(cmd, timeout=60):
    full = f"echo '{password}' | sudo -S bash -c '{cmd}'"
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + ("\nSTDERR: " + err if err else "")


def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + ("\nERR: " + err if err else "")


print("=== 🖥️ CPU LOAD ===")
out = run("uptime && echo '---' && top -bn1 | grep 'CPU' | head -3")
print(out)

print()
print("=== 🐏 MEMORY ===")
out = run("free -h && echo '---' && cat /proc/meminfo | grep -E 'MemTotal|MemAvailable|MemFree'")
print(out)

print()
print("=== 💾 DISK ===")
out = run("df -h / /var/lib/kppdf 2>&1 && echo '---' && docker system df 2>&1")
print(out)

print()
print("=== 🐳 DOCKER CONTAINERS ===")
out = run("sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}' 2>&1")
print(out)

print()
print("=== 📋 DOCKER LOGS (backend, last 20 lines) ===")
out = sudo("docker logs --tail=20 kppdf-backend 2>&1", timeout=15)
print(out)

print()
print("=== 📋 DOCKER LOGS (mongodb, last 10 lines) ===")
out = sudo("docker logs --tail=10 kppdf-mongodb 2>&1", timeout=15)
print(out)

print()
print("=== 🔒 CLOUDFLARE TUNNEL ===")
out = run("cloudflared tunnel list 2>&1")
print(out)
print()
out = sudo("systemctl status cloudflared --no-pager -l 2>&1 | head -20", timeout=10)
print(out)

print()
print("=== 🌐 NETWORK CONNECTIONS ===")
out = run("ss -tlnp | grep -E '3000|27017' 2>&1")
print(out)

print()
print("=== 🔄 UPTIME & PROCESSES ===")
out = run("ps aux --sort=-%mem | head -8")
print(out)

ssh.close()
