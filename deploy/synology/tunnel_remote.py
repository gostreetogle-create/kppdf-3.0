"""Setup Cloudflare Tunnel on Ubuntu VM"""
import paramiko, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"
tunnel_id = "ef681860-9c4e-4959-a34d-e8e4fed823f5"

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


print("=== Step 1: Check cert installed ===")
out = run("ls -la ~/.cloudflared/ 2>&1")
print(out)

print()
print("=== Step 2: Check existing tunnels ===")
out = run("cloudflared tunnel list 2>&1")
print(out)

print()
print("=== Step 3: Create config for tunnel ===")
config = f"""tunnel: {tunnel_id}
credentials-file: /home/tiit/.cloudflared/{tunnel_id}.json

ingress:
  - hostname: sport-set.ru
    service: http://localhost:3000
  - hostname: www.sport-set.ru
    service: http://localhost:3000
  - service: http_status:404
"""
sftp = ssh.open_sftp()
with sftp.file("/home/tiit/.cloudflared/config.yml", "w") as f:
    f.write(config)
sftp.close()
print("Config created")

print()
print("=== Step 4: Test tunnel run (5s) ===")
stdin, stdout, stderr = ssh.exec_command(
    f"timeout 5 cloudflared tunnel run {tunnel_id} 2>&1 || true",
    timeout=15
)
out = stdout.read().decode("utf-8", errors="replace").strip()
print(out[:500])

print()
print("=== Step 5: Install as systemd service ===")
out = sudo("cloudflared service install", timeout=30)
print(out[:500])

print()
print("=== Step 6: Start systemd service ===")
out = sudo("systemctl start cloudflared && systemctl enable cloudflared", timeout=30)
print(out[:300])

time.sleep(5)

print()
print("=== Step 7: Status ===")
out = sudo("systemctl status cloudflared --no-pager -l 2>&1 | head -20", timeout=15)
print(out)

print()
print("=== All tunnel steps done ===")
ssh.close()
