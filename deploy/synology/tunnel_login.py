"""Run cloudflared tunnel login on remote VM and capture URL"""
import paramiko, sys, io, threading, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=user, password=password, timeout=15, allow_agent=False, look_for_keys=False)

print("Starting cloudflared tunnel login on VM...")
print("It will generate a URL - open it in your browser!")
print()

stdin, stdout, stderr = ssh.exec_command("cloudflared tunnel login 2>&1", timeout=120, get_pty=True)

# Read output line by line until we get the URL or login completes
start = time.time()
url_found = False
while time.time() - start < 100:
    if stdout.channel.recv_ready():
        line = stdout.channel.recv(4096).decode("utf-8", errors="replace")
        print(line, end="")
        if "https://" in line and "cloudflare" in line:
            url_found = True
    elif stderr.channel.recv_stderr_ready():
        line = stderr.channel.recv_stderr(4096).decode("utf-8", errors="replace")
        print(line, end="")
        if "https://" in line and "cloudflare" in line:
            url_found = True
    else:
        if url_found:
            # After URL is printed, wait a bit more for completion
            time.sleep(5)
            if not stdout.channel.recv_ready() and not stderr.channel.recv_stderr_ready():
                break
        time.sleep(1)

# Get any remaining output
while stdout.channel.recv_ready():
    print(stdout.channel.recv(4096).decode("utf-8", errors="replace"), end="")
while stderr.channel.recv_stderr_ready():
    print(stderr.channel.recv_stderr(4096).decode("utf-8", errors="replace"), end="")

print()
print("=== Login process completed ===")

# Check if cert was installed
stdin2, stdout2, stderr2 = ssh.exec_command("ls -la ~/.cloudflared/ && echo '---' && cat ~/.cloudflared/cert.pem 2>&1 | head -5", timeout=10)
print(stdout2.read().decode("utf-8", errors="replace").strip())

ssh.close()
