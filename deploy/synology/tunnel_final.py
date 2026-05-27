"""Finalize Cloudflare Tunnel setup - config, DNS, service"""
import paramiko, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"
tunnel_id = "b6e27272-24c3-4551-a4f5-30031f0798cb"

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


print("=== Step 1: Create config.yml ===")
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
print("Config.yml created OK")

print()
print("=== Step 2: Validate config ===")
out = run("cloudflared tunnel validate 2>&1")
print(out[:300])

print()
print("=== Step 3: DNS records - update via API ===")
# Check current DNS records
out = run("cloudflared tunnel route dns --overwrite-dns {} sport-set.ru 2>&1".format(tunnel_id))
print("sport-set.ru:", out[:200])
out = run("cloudflared tunnel route dns --overwrite-dns {} www.sport-set.ru 2>&1".format(tunnel_id))
print("www.sport-set.ru:", out[:200])

print()
print("=== Step 4: Install systemd service ===")
out = sudo("cloudflared service install", timeout=30)
print(out[:500])

print()
print("=== Step 5: Start service ===")
out = sudo("systemctl daemon-reload && systemctl enable cloudflared && systemctl start cloudflared", timeout=30)
print(out[:300])

time.sleep(10)

print()
print("=== Step 6: Service status ===")
out = sudo("systemctl status cloudflared --no-pager -l 2>&1 | head -30", timeout=15)
print(out)

print()
print("=== Step 7: Check tunnel ===")
out = run("cloudflared tunnel list 2>&1")
print(out[:500])

# Check if it's working locally
print()
print("=== Step 8: Local health check ===")
out = run("curl -sf http://localhost:3000/api/v1/health 2>&1")
print("Health:", out[:100])

ssh.close()
print()
print("=== All done ===")
