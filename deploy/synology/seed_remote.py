"""Seed the remote KPPDF database"""
import paramiko, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

host = "192.168.1.46"
user = "tiit"
password = "Tg30121986"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=host, username=user, password=password, timeout=15, allow_agent=False, look_for_keys=False)


def sudo(cmd, timeout=120):
    full = f"echo '{password}' | sudo -S bash -c '{cmd}'"
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out + ("\nSTDERR: " + err if err else "")


print("=== Running seed... ===")
out = sudo("docker exec kppdf-backend node dist/backend/src/seed.js", timeout=120)
print(out)

print()
print("=== Seed done ===")
ssh.close()
