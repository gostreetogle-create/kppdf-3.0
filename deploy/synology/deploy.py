"""
KPPDF 3.0 - Deploy to Synology NAS

Usage:
    python deploy/synology/deploy.py [--password PASSWORD] [--seed]

Examples:
    python deploy/synology/deploy.py --seed
    python deploy/synology/deploy.py --password YOUR_PASSWORD --seed
    python deploy/synology/deploy.py --skip-build --seed

Steps:
    1. Create archive (backend/ + shared/ + docker-compose.prod.yml)
    2. Connect to Synology via paramiko
    3. Upload & extract archive
    4. Docker build + up
    5. Health check + seed (optional)
    6. Verify API
"""

import argparse
import base64
import os
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path


# -- Config -------------------------------------------------------------

HOST = "192.168.1.134"
USER = "nastiit"
REMOTE_DIR = "/volume1/docker/kppdf-3.0"
DOCKER = "/usr/local/bin/docker"
ARCHIVE_NAME = "kppdf-deploy.tar.gz"


# -- Helpers ------------------------------------------------------------

def log(msg):
    print("  " + msg)


def ok(msg):
    print("  [OK] " + msg)


def warn(msg):
    print("  [WARN] " + msg)


def fail(msg):
    print("  [FAIL] " + msg)
    sys.exit(1)


class RemoteHost:
    """SSH connection via paramiko (supports password & key auth)."""

    def __init__(self, host, user, password=None):
        self.host = host
        self.user = user
        self.password = password
        self._ssh = None

    def connect(self):
        import paramiko
        self._ssh = paramiko.SSHClient()
        self._ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        kwargs = {"hostname": self.host, "username": self.user, "timeout": 15}
        if self.password:
            kwargs["password"] = self.password
            kwargs["allow_agent"] = False
            kwargs["look_for_keys"] = False
        else:
            kwargs["allow_agent"] = True
            kwargs["look_for_keys"] = True
        try:
            self._ssh.connect(**kwargs)
            ok("Connected to " + self.user + "@" + self.host)
        except paramiko.AuthenticationException:
            fail("Auth failed. Use --password or setup SSH keys.")
        except Exception as e:
            fail("Connection failed: " + str(e))

    def close(self):
        if self._ssh:
            self._ssh.close()

    def exec(self, command, timeout=30):
        """Run a shell command and return stdout."""
        try:
            stdin, stdout, stderr = self._ssh.exec_command(
                command, timeout=timeout)
            out = stdout.read().decode('utf-8', errors='replace').strip()
            err = stderr.read().decode('utf-8', errors='replace').strip()
            if err and "password" not in err.lower() and "Warning" not in err:
                return out + "\nERR: " + err
            return out
        except Exception as e:
            return "ERROR: " + str(e)

    def exec_sudo(self, command, timeout=30):
        """Run a command with sudo (password via stdin)."""
        pwd = self.password or ""
        full = "echo '" + pwd + "' | sudo -S bash -c '" + command.replace("'", "'\\''") + "'"
        return self.exec(full, timeout=timeout)

    def upload_file(self, local_path, remote_dir):
        """Upload a file. Tries SCP, then SFTP, then base64 pipe."""
        filename = os.path.basename(local_path)
        remote_path = remote_dir + "/" + filename

        # Try SCP (fastest)
        try:
            result = subprocess.run(
                ["scp", "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=no",
                 local_path, self.user + "@" + self.host + ":" + remote_path],
                capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                ok("Uploaded via SCP")
                return
        except Exception as e:
            warn("SCP: " + str(e))

        # Try SFTP
        try:
            sftp = self._ssh.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            ok("Uploaded via SFTP")
            return
        except Exception as e:
            warn("SFTP: " + str(e))

        # Base64 pipe (last resort)
        with open(local_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        chunk_size = 8000
        chunks = [b64[i:i + chunk_size] for i in range(0, len(b64), chunk_size)]

        self.exec("rm -f " + remote_path)
        for chunk in chunks:
            self._ssh.exec_command("echo -n '" + chunk + "' >> " + remote_path, timeout=30)
        self.exec("base64 -d " + remote_path + " > " + remote_path + ".tmp && "
                  "mv " + remote_path + ".tmp " + remote_path)
        ok("Uploaded via pipe")

    def docker_exec(self, container, cmd, timeout=30):
        """Run a command inside a Docker container."""
        full = DOCKER + " exec " + container + " " + cmd
        return self.exec(full, timeout=timeout)

    def docker_compose(self, remote_dir, action, timeout=300):
        """Run docker-compose action."""
        docker_cmd = (
            "export PATH=/usr/local/bin:/sbin:$PATH && "
            "cd " + remote_dir + " && "
            + DOCKER + " compose -f docker-compose.prod.yml " + action
        )
        return self.exec_sudo(docker_cmd, timeout=timeout)


# -- Archive creation ---------------------------------------------------

def create_archive(archive_path, project_root):
    """Create deploy archive with backend/ + shared/ + docker-compose.prod.yml."""
    log("Creating archive...")
    items = ["backend/", "shared/", "docker-compose.prod.yml"]
    exclude = [
        "backend/node_modules", "backend/dist", "backend/.git",
        "backend/src/__tests__", "backend/.env", "backend/.env.local",
        "backend/coverage",
    ]

    def excluded(rel):
        rel = rel.replace("\\", "/")
        for p in exclude:
            p2 = p.replace("\\", "/")
            if rel == p2 or rel.startswith(p2 + "/"):
                return True
        return False

    with tarfile.open(archive_path, "w:gz") as tar:
        for item in items:
            item_path = project_root / item
            if not item_path.exists():
                warn(item + " not found, skip")
                continue
            if item_path.is_dir():
                for root, dirs, files in os.walk(item_path):
                    rel = os.path.relpath(root, project_root)
                    dirs[:] = [d for d in dirs if not excluded(os.path.join(rel, d))]
                    for f in files:
                        fp = os.path.join(root, f)
                        an = os.path.relpath(fp, project_root).replace("\\", "/")
                        if not excluded(an):
                            tar.add(fp, arcname=an)
            else:
                an = os.path.relpath(item_path, project_root).replace("\\", "/")
                tar.add(str(item_path), arcname=an)
    size = os.path.getsize(archive_path)
    ok("Archive: " + str(size // 1024) + " KB")


# -- Verification helpers ------------------------------------------------

def ensure_mongodb_running(remote):
    """Ensure kppdf-mongodb container is running."""
    status = remote.exec(DOCKER + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB running")
        return True
    log("MongoDB not running. Starting...")
    r = remote.exec(DOCKER + " start kppdf-mongodb")
    time.sleep(3)
    status = remote.exec(DOCKER + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB started")
        return True
    # Fall back to docker compose up
    log("Trying docker compose up...")
    remote.docker_compose(REMOTE_DIR, "up -d mongodb", timeout=60)
    time.sleep(5)
    status = remote.exec(DOCKER + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB running via compose")
        return True
    warn("MongoDB not running. Seed may fail.")
    return False


def wait_for_backend(remote, max_wait=60):
    """Wait until backend health check passes."""
    log("Waiting for backend (up to " + str(max_wait) + "s)...")
    for i in range(max_wait // 5):
        time.sleep(5)
        h = remote.exec("curl -sf http://localhost:3000/api/v1/health", timeout=10)
        if "ok" in h.lower() and "mongodb" in h.lower():
            ok("Backend ready! (mongodb connected)")
            return True
        if "ok" in h.lower():
            log("Backend up, waiting for mongodb connection...")
            continue
        if i % 3 == 0 and i > 0:
            log("  (" + str((i + 1) * 5) + "s)")
    warn("Backend not ready within timeout")
    return False


# -- Main ---------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Deploy KPPDF to Synology")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--user", default=USER)
    parser.add_argument("--password", default=None)
    parser.add_argument("--seed", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent
    archive_path = os.path.join(tempfile.gettempdir(), ARCHIVE_NAME)

    print()
    print("=== KPPDF 3.0 - Deploy to Synology ===")
    print()

    # Step 1: Verify source
    print("Step 1/6: Verify source code...")
    if not (project_root / "backend" / "src").exists():
        fail("backend/src not found!")
    if not (project_root / "shared" / "types").exists():
        fail("shared/types not found!")
    ok("Source: backend/ + shared/ + docker-compose.prod.yml")

    # Step 2: Create archive
    print()
    print("Step 2/6: Create archive...")
    create_archive(archive_path, project_root)

    # Step 3: Connect
    print()
    print("Step 3/6: Connect to Synology...")
    remote = RemoteHost(args.host, args.user, args.password)
    remote.connect()
    remote.exec("mkdir -p " + REMOTE_DIR)

    # Step 4: Upload & extract
    print()
    print("Step 4/6: Upload & extract...")
    remote.upload_file(archive_path, REMOTE_DIR)
    os.remove(archive_path)
    r = remote.exec(
        "cd " + REMOTE_DIR + " && tar xzf " + ARCHIVE_NAME + " && "
        "rm -f " + ARCHIVE_NAME + " && ls -d */",
        timeout=60)
    ok("Extracted: " + r[:120])

    # Step 5: Docker build & start
    print()
    print("Step 5/6: Docker build & start...")
    if args.skip_build:
        r = remote.docker_compose(REMOTE_DIR, "up -d", timeout=60)
    else:
        r = remote.docker_compose(REMOTE_DIR,
                                   "down 2>/dev/null; "
                                   "build --no-cache backend && "
                                   "up -d",
                                   timeout=600)
    ok("Docker: " + (r[:200] if r else "ok"))

    # Wait for backend
    backend_ok = wait_for_backend(remote)

    if not backend_ok:
        if args.seed:
            warn("Backend not ready. Trying to ensure MongoDB manually...")
        warn("Skipping API verification")
        remote.close()
        return

    # Step 6: Seed (optional)
    if args.seed:
        print()
        print("Step 6/6: Seed...")
        ensure_mongodb_running(remote)

        # Restart backend to reconnect to MongoDB if it was down
        remote.exec(DOCKER + " restart kppdf-backend", timeout=15)
        time.sleep(3)
        wait_for_backend(remote)

        log("Running seed...")
        # WORKDIR is /app, dist is at /app/dist/backend/src/seed.js
        seed_out = remote.docker_exec("kppdf-backend",
                                       "node dist/backend/src/seed.js", timeout=120)
        for line in seed_out.split('\n'):
            if line.strip():
                safe = line.strip()[:120].encode('ascii', errors='replace').decode('ascii')
                print("    " + safe)
        ok("Seed done")

    # Verify health
    print()
    log("Verifying API...")
    h = remote.exec("curl -sf http://localhost:3000/api/v1/health", timeout=10)
    ok("Health: " + (h[:80] if h else "no response"))

    # Auth check via node inside container (avoids quoting issues on host)
    log("Verifying auth & products...")
    auth_script = (
        "const h=require('http');"
        "const d=JSON.stringify({username:'admin',password:'admin123'});"
        "const r=h.request({hostname:'localhost',port:3000,path:'/api/v1/auth/login',method:'POST',"
        "headers:{'Content-Type':'application/json','Content-Length':d.length}},"
        "res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>{"
        "try{const j=JSON.parse(b);const t=j.data?.accessToken||'';"
        "if(!t){console.log('NO_TOKEN');process.exit(1)}"
        "const p=h.get({hostname:'localhost',port:3000,path:'/api/v1/products',"
        "headers:{'Authorization':'Bearer '+t}},pr=>{let pb='';pr.on('data',c=>pb+=c);"
        "pr.on('end',()=>{try{const j2=JSON.parse(pb);const d=j2.data||{};"
        "const items=d.items||d;const total=d.total||items.length;"
        "console.log('PRODUCTS:'+total);"
        "(Array.isArray(items)?items:[]).slice(0,3).forEach(x=>"
        "console.log(' '+x.name+'|isActive:'+x.isActive));"
        "process.exit(0)}catch(e){console.log('PARSE_ERR');process.exit(1)}})});"
        "p.end()}"
        "catch(e){console.log('LOGIN_ERR');process.exit(1)}})});"
        "r.write(d);r.end()"
    )
    # Write script to temp file inside container to avoid quoting issues
    b64_script = base64.b64encode(auth_script.encode()).decode()
    ver_cmd = (
        DOCKER + " exec kppdf-backend sh -c "
        "'echo " + b64_script + " | base64 -d > /tmp/verify.js && node /tmp/verify.js'"
    )
    auth_out = remote.exec(ver_cmd, timeout=15)
    if "PRODUCTS:" in auth_out:
        for line in auth_out.split('\n'):
            if line.strip():
                safe = line.strip().encode('ascii', errors='replace').decode('ascii')
                print("     " + safe)
        ok("API verified (auth + products)")
    else:
        warn("Verification: " + (auth_out[:150] if auth_out else "no output"))

    remote.close()

    print()
    print("=== Deploy complete ===")
    print()
    print("  API:  http://" + args.host + ":3000/api/v1/health")
    print("  Auth: admin / admin123")
    print()
    print("  SSH access:")
    print("    ssh " + args.user + "@" + args.host)
    print("    cd " + REMOTE_DIR)
    print("    " + DOCKER + " compose -f docker-compose.prod.yml ps|logs|down")
    print("    " + DOCKER + " compose -f docker-compose.prod.yml logs -f --tail=50")
    print()


if __name__ == "__main__":
    main()
