"""
KPPDF 3.0 - Deploy to Synology NAS / Ubuntu server

Usage:
    python deploy/synology/deploy.py [--seed]
    python deploy/synology/deploy.py --password YOUR_PASSWORD --seed
    python deploy/synology/deploy.py --platform ubuntu --seed

Config: deploy/synology/config.env (copy from config.env.example)

Steps:
    1. Load config.env
    2. Build Angular frontend (npm run build)
    3. Create archive (backend/ + shared/ + frontend/ + docker-compose.prod.yml)
    4. Connect via paramiko
    5. Upload & extract + .env (JWT secrets)
    6. Docker build + up
    7. Health check + seed (optional)
    8. Verify API + frontend
"""

import argparse
import base64
import os
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path


# -- Platform defaults --------------------------------------------------

PLATFORMS = {
    "ubuntu": {
        "remote_dir": "/opt/kppdf-3.0",
        "data_dir": "/var/lib/kppdf",
        "docker": "docker",
    },
    "synology": {
        "remote_dir": "/volume1/docker/kppdf-3.0",
        "data_dir": "/volume1/docker/kppdf-data",
        "docker": "/usr/local/bin/docker",
    },
}

ARCHIVE_NAME = "kppdf-deploy.tar.gz"
CONFIG_FILE = "config.env"


# -- Config loader ------------------------------------------------------

def load_config(project_root):
    """Load deploy/synology/config.env (KEY=VALUE, # comments)."""
    cfg = {}
    cfg_path = project_root / "deploy" / "synology" / CONFIG_FILE
    if not cfg_path.exists():
        return cfg
    for line in cfg_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        cfg[key.strip()] = val.strip()
    return cfg


def resolve_settings(args, cfg):
    """Merge CLI args, config.env, platform defaults."""
    platform = (args.platform or cfg.get("PLATFORM") or "ubuntu").lower()
    if platform not in PLATFORMS:
        fail("Unknown platform: " + platform + ". Use ubuntu or synology.")

    defaults = PLATFORMS[platform]
    host = args.host or cfg.get("DEPLOY_HOST") or "192.168.1.134"
    user = args.user or cfg.get("DEPLOY_USER") or "ubuntu"
    password = args.password or cfg.get("DEPLOY_PASSWORD") or None
    remote_dir = cfg.get("REMOTE_DIR") or defaults["remote_dir"]
    data_dir = cfg.get("KPPDF_DATA_DIR") or defaults["data_dir"]
    docker = cfg.get("DOCKER_CMD") or defaults["docker"]
    seed = args.seed or cfg.get("SEED", "").lower() in ("true", "1", "yes")
    cors = cfg.get("CORS_ORIGIN") or "https://sport-set.ru"

    jwt_secret = cfg.get("JWT_SECRET", "")
    jwt_refresh = cfg.get("JWT_REFRESH_SECRET", "")
    if not jwt_secret or "CHANGE_ME" in jwt_secret:
        jwt_secret = secrets.token_hex(32)
        warn("JWT_SECRET auto-generated — save it in config.env!")
    if not jwt_refresh or "CHANGE_ME" in jwt_refresh:
        jwt_refresh = secrets.token_hex(32)
        warn("JWT_REFRESH_SECRET auto-generated — save it in config.env!")

    return {
        "platform": platform,
        "host": host,
        "user": user,
        "password": password,
        "remote_dir": remote_dir,
        "data_dir": data_dir,
        "docker": docker,
        "seed": seed,
        "cors": cors,
        "jwt_secret": jwt_secret,
        "jwt_refresh": jwt_refresh,
    }


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

    def __init__(self, host, user, password=None, docker="docker"):
        self.host = host
        self.user = user
        self.password = password
        self.docker = docker
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
        try:
            stdin, stdout, stderr = self._ssh.exec_command(
                command, timeout=timeout)
            out = stdout.read().decode("utf-8", errors="replace").strip()
            err = stderr.read().decode("utf-8", errors="replace").strip()
            if err and "password" not in err.lower() and "Warning" not in err:
                return out + "\nERR: " + err
            return out
        except Exception as e:
            return "ERROR: " + str(e)

    def exec_sudo(self, command, timeout=30):
        pwd = self.password or ""
        full = "echo '" + pwd + "' | sudo -S bash -c '" + command.replace("'", "'\\''") + "'"
        return self.exec(full, timeout=timeout)

    def upload_file(self, local_path, remote_dir):
        filename = os.path.basename(local_path)
        remote_path = remote_dir + "/" + filename

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

        try:
            sftp = self._ssh.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            ok("Uploaded via SFTP")
            return
        except Exception as e:
            warn("SFTP: " + str(e))

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

    def upload_text(self, content, remote_path):
        """Upload small text file via SFTP or echo."""
        try:
            sftp = self._ssh.open_sftp()
            with sftp.file(remote_path, "w") as f:
                f.write(content)
            sftp.close()
            ok("Uploaded " + os.path.basename(remote_path))
            return
        except Exception as e:
            warn("SFTP text: " + str(e))

        b64 = base64.b64encode(content.encode()).decode()
        self.exec("rm -f " + remote_path)
        chunk_size = 8000
        for i in range(0, len(b64), chunk_size):
            chunk = b64[i:i + chunk_size]
            self._ssh.exec_command("echo -n '" + chunk + "' >> " + remote_path + ".b64", timeout=30)
        self.exec("base64 -d " + remote_path + ".b64 > " + remote_path + " && rm -f " + remote_path + ".b64")
        ok("Uploaded " + os.path.basename(remote_path) + " via pipe")

    def docker_exec(self, container, cmd, timeout=30):
        full = self.docker + " exec " + container + " " + cmd
        return self.exec(full, timeout=timeout)

    def docker_compose(self, remote_dir, action, timeout=300):
        docker_cmd = (
            "export PATH=/usr/local/bin:/usr/bin:/sbin:$PATH && "
            "cd " + remote_dir + " && "
            + self.docker + " compose -f docker-compose.prod.yml " + action
        )
        return self.exec_sudo(docker_cmd, timeout=timeout)


# -- Frontend build -----------------------------------------------------

def build_frontend(project_root):
    log("Building Angular frontend...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(project_root),
        capture_output=True, text=True, timeout=300,
        shell=(os.name == "nt"))
    if result.returncode != 0:
        err_lines = (result.stderr or result.stdout or "").strip().split("\n")
        for line in err_lines[-8:]:
            print("   " + line)
        fail("Angular build failed")
    ok("Angular build OK")

    dist_browser = project_root / "dist" / "kppdf-3.0" / "browser" / "index.html"
    if not dist_browser.exists():
        fail("dist/kppdf-3.0/browser/index.html not found after build")

    frontend_dir = project_root / "frontend" / "browser"
    if frontend_dir.exists():
        shutil.rmtree(str(frontend_dir))
    frontend_dir.mkdir(parents=True, exist_ok=True)
    for item in (project_root / "dist" / "kppdf-3.0" / "browser").iterdir():
        dest = frontend_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)
    ok("Frontend copied to frontend/browser/")


# -- Archive creation ---------------------------------------------------

def create_archive(archive_path, project_root):
    log("Creating archive...")
    items = ["backend/", "shared/", "frontend/", "docker-compose.prod.yml"]
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
        backup_script = project_root / "deploy" / "synology" / "backup.sh"
        if backup_script.exists():
            tar.add(str(backup_script), arcname="backup.sh")
    size = os.path.getsize(archive_path)
    ok("Archive: " + str(size // 1024) + " KB")


def make_env_file(settings):
    """Generate .env for docker compose on remote host."""
    return (
        "JWT_SECRET=" + settings["jwt_secret"] + "\n"
        "JWT_REFRESH_SECRET=" + settings["jwt_refresh"] + "\n"
        "CORS_ORIGIN=" + settings["cors"] + "\n"
        "KPPDF_DATA_DIR=" + settings["data_dir"] + "\n"
    )


def ensure_data_dirs(remote, settings):
    """Create persistent data directories on host (outside REMOTE_DIR)."""
    data_dir = settings["data_dir"]
    user = settings["user"]
    log("Ensuring data dirs: " + data_dir)
    cmd = (
        "mkdir -p " + data_dir + "/mongodb " + data_dir + "/media " + data_dir + "/backups && "
        "chown -R 999:999 " + data_dir + "/mongodb && "
        "chown -R " + user + ":" + user + " " + data_dir + "/media " + data_dir + "/backups"
    )
    r = remote.exec_sudo(cmd, timeout=30)
    ok("Data dirs ready: mongodb/, media/, backups/")
    if r and "ERR:" in r:
        warn(r[:150])


# -- Verification helpers -----------------------------------------------

def ensure_mongodb_running(remote, remote_dir):
    status = remote.exec(remote.docker + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB running")
        return True
    log("MongoDB not running. Starting...")
    remote.exec(remote.docker + " start kppdf-mongodb")
    time.sleep(3)
    status = remote.exec(remote.docker + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB started")
        return True
    log("Trying docker compose up...")
    remote.docker_compose(remote_dir, "up -d mongodb", timeout=60)
    time.sleep(5)
    status = remote.exec(remote.docker + " ps --filter name=kppdf-mongodb --format '{{.Status}}'")
    if "Up" in status:
        ok("MongoDB running via compose")
        return True
    warn("MongoDB not running. Seed may fail.")
    return False


def wait_for_backend(remote, max_wait=90):
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
    parser = argparse.ArgumentParser(description="Deploy KPPDF to Synology/Ubuntu")
    parser.add_argument("--host", default=None)
    parser.add_argument("--user", default=None)
    parser.add_argument("--password", default=None)
    parser.add_argument("--platform", choices=["ubuntu", "synology"], default=None)
    parser.add_argument("--seed", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent
    cfg = load_config(project_root)
    settings = resolve_settings(args, cfg)
    archive_path = os.path.join(tempfile.gettempdir(), ARCHIVE_NAME)

    print()
    print("=== KPPDF 3.0 - Deploy (" + settings["platform"] + ") ===")
    print("  Host: " + settings["host"])
    print("  App:  " + settings["remote_dir"])
    print("  Data: " + settings["data_dir"])
    print()

    print("Step 1/8: Verify source code...")
    if not (project_root / "backend" / "src").exists():
        fail("backend/src not found!")
    if not (project_root / "shared" / "types").exists():
        fail("shared/types not found!")
    ok("Source OK")

    if not args.skip_build:
        print()
        print("Step 2/8: Build Angular frontend...")
        build_frontend(project_root)
    else:
        print()
        print("Step 2/8: Skip frontend build (--skip-build)")

    print()
    print("Step 3/8: Create archive...")
    create_archive(archive_path, project_root)

    print()
    print("Step 4/8: Connect...")
    remote = RemoteHost(
        settings["host"], settings["user"], settings["password"],
        docker=settings["docker"])
    remote.remote_dir = settings["remote_dir"]
    remote.connect()
    remote.exec("mkdir -p " + settings["remote_dir"])
    ensure_data_dirs(remote, settings)

    print()
    print("Step 5/8: Upload & extract...")
    remote.upload_file(archive_path, settings["remote_dir"])
    os.remove(archive_path)

    env_content = make_env_file(settings)
    remote.upload_text(env_content, settings["remote_dir"] + "/.env")
    ok(".env uploaded (JWT secrets)")

    r = remote.exec(
        "cd " + settings["remote_dir"] + " && tar xzf " + ARCHIVE_NAME + " && "
        "rm -f " + ARCHIVE_NAME + " && ls -d */",
        timeout=60)
    ok("Extracted: " + r[:120])

    print()
    print("Step 6/8: Docker build & start...")
    if args.skip_build:
        r = remote.docker_compose(settings["remote_dir"], "up -d", timeout=120)
    else:
        r = remote.docker_compose(
            settings["remote_dir"],
            "down 2>/dev/null; build --no-cache backend && up -d",
            timeout=600)
    ok("Docker: " + (r[:200] if r else "ok"))

    backend_ok = wait_for_backend(remote)

    if not backend_ok:
        warn("Backend not ready — check logs on server")
        remote.close()
        fail("Deploy incomplete")

    if settings["seed"]:
        print()
        print("Step 7/8: Seed...")
        ensure_mongodb_running(remote, settings["remote_dir"])
        remote.exec(remote.docker + " restart kppdf-backend", timeout=15)
        time.sleep(3)
        wait_for_backend(remote)

        log("Running seed...")
        seed_out = remote.docker_exec(
            "kppdf-backend", "node dist/backend/src/seed.js", timeout=120)
        for line in seed_out.split("\n"):
            if line.strip():
                safe = line.strip()[:120].encode("ascii", errors="replace").decode("ascii")
                print("    " + safe)
        ok("Seed done")
    else:
        print()
        print("Step 7/8: Seed skipped (use --seed for first deploy)")

    print()
    print("Step 8/8: Verify...")
    h = remote.exec("curl -sf http://localhost:3000/api/v1/health", timeout=10)
    ok("Health: " + (h[:80] if h else "no response"))

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
    b64_script = base64.b64encode(auth_script.encode()).decode()
    ver_cmd = (
        remote.docker + " exec kppdf-backend sh -c "
        "'echo " + b64_script + " | base64 -d > /tmp/verify.js && node /tmp/verify.js'"
    )
    auth_out = remote.exec(ver_cmd, timeout=15)
    if "PRODUCTS:" in auth_out:
        for line in auth_out.split("\n"):
            if line.strip():
                safe = line.strip().encode("ascii", errors="replace").decode("ascii")
                print("     " + safe)
        ok("API verified (auth + products)")
    else:
        warn("Verification: " + (auth_out[:150] if auth_out else "no output"))

    log("Verifying frontend...")
    front_status = remote.exec(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/", timeout=10)
    if "200" in front_status:
        ok("Frontend HTTP 200 OK")
    else:
        warn("Frontend: HTTP " + front_status[:10])

    remote.close()

    print()
    print("=== Deploy complete ===")
    print()
    print("  API:      http://" + settings["host"] + ":3000/api/v1/health")
    print("  Frontend: http://" + settings["host"] + ":3000/")
    print("  Prod:     " + settings["cors"])
    print("  Auth:     admin / admin123")
    print()
    print("  Data:   " + settings["data_dir"] + "/ (mongodb, media, backups)")
    print()
    print("  SSH:")
    print("    ssh " + settings["user"] + "@" + settings["host"])
    print("    cd " + settings["remote_dir"])
    print("    " + settings["docker"] + " compose -f docker-compose.prod.yml ps|logs")
    print("    bash " + settings["remote_dir"] + "/backup.sh")
    print()


if __name__ == "__main__":
    main()
