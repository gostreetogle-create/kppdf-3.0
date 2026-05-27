"""Update Cloudflare tunnel to point to Nginx on port 80"""
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


print("=== Step 1: Update cloudflared config.yml → port 80 ===")
config = f"""tunnel: {tunnel_id}
credentials-file: /etc/cloudflared/{tunnel_id}.json

ingress:
  - hostname: sport-set.ru
    service: http://localhost:80
  - hostname: www.sport-set.ru
    service: http://localhost:80
  - service: http_status:404
"""

# Write to /etc/cloudflared/config.yml via sudo tee
sudo(f"cat > /etc/cloudflared/config.yml << 'EOF'\n{config}\nEOF")
print("Config updated → port 80")

print()
print("=== Step 2: Verify config ===")
out = run("cat /etc/cloudflared/config.yml")
print(out)

print()
print("=== Step 3: Restart cloudflared ===")
out = sudo("systemctl restart cloudflared", timeout=15)
print(out[:200])

time.sleep(5)

print()
print("=== Step 4: Service status ===")
out = sudo("systemctl status cloudflared --no-pager -l 2>&1 | head -15", timeout=10)
print(out)

print()
print("=== Step 5: Verify tunnel list ===")
out = run("cloudflared tunnel list 2>&1")
print(out[:300])

print()
print("=== Step 6: Test locally via Nginx ===")
out = run("curl -sf -o /dev/null -w 'HTTP %{http_code}' http://localhost:80/ 2>&1")
print("Frontend:", out)
out = run("curl -sf http://localhost:80/api/v1/health 2>&1")
print("Health:", out[:100])

print()
print("=== Tunnel updated successfully ===")
ssh.close()
