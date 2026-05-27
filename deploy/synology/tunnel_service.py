"""Finalize Cloudflare Tunnel - copy config to /etc, install service"""
import paramiko, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"
tunnel_id = "b6e27272-24c3-4551-a4f5-30031f0798cb"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=user, password=password, timeout=15, allow_agent=False, look_for_keys=False)


def sudo(cmd, timeout=120):
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


print("=== Step 1: Create /etc/cloudflared/config.yml via sudo ===")
config_content = f"""tunnel: {tunnel_id}
credentials-file: /etc/cloudflared/{tunnel_id}.json

ingress:
  - hostname: sport-set.ru
    service: http://localhost:3000
  - hostname: www.sport-set.ru
    service: http://localhost:3000
  - service: http_status:404
"""

# Write config via sudo tee
out = sudo(f'mkdir -p /etc/cloudflared && cat > /etc/cloudflared/config.yml << \'EOF\'\n{config_content}\nEOF\nchmod 644 /etc/cloudflared/config.yml')
print(out[:200])

print()
print("=== Step 2: Copy credentials file to /etc/cloudflared via sudo ===")
# First read the credentials file as tiit, then write via sudo
stdin, stdout, stderr = ssh.exec_command(f"cat /home/tiit/.cloudflared/{tunnel_id}.json", timeout=10)
creds = stdout.read().decode("utf-8", errors="replace")
if creds:
    out = sudo(f'cat > /etc/cloudflared/{tunnel_id}.json << \'EOF\'\n{creds}\nEOF\nchmod 600 /etc/cloudflared/{tunnel_id}.json')
    print("Credentials copied")
else:
    print("Failed to read credentials")

print()
print("=== Step 3: Verify /etc/cloudflared ===")
out = run("ls -la /etc/cloudflared/")
print(out)

print()
print("=== Step 4: Install systemd service ===")
out = sudo("cloudflared service install", timeout=30)
print(out[:500])

print()
print("=== Step 5: Enable and start ===")
out = sudo("systemctl daemon-reload && systemctl enable cloudflared && systemctl start cloudflared", timeout=30)
print(out[:300])

time.sleep(10)

print()
print("=== Step 6: Service status ===")
out = sudo("systemctl status cloudflared --no-pager -l 2>&1 | head -40", timeout=15)
print(out)

print()
print("=== Step 7: Verify tunnel ===")
out = run("cloudflared tunnel list 2>&1")
print(out[:500])

print()
print("=== Step 8: Verify health ===")
out = run("curl -sf http://localhost:3000/api/v1/health 2>&1")
print("Health:", out[:100])

# Check DNS resolution
print()
print("=== Step 9: Try resolving sport-set.ru ===")
out = run("curl -sf -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000/ 2>&1")
print("Frontend:", out[:100])

ssh.close()
print()
print("=== All done ===")
