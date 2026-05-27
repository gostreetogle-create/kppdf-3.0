"""Setup Nginx reverse proxy on Ubuntu VM + update Cloudflare tunnel"""
import paramiko, sys, io, time

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


print("=== Step 1: Install Nginx ===")
out = sudo("apt update -qq && apt install -y nginx", timeout=120)
print(out[-300:])
print()

print("=== Step 2: Verify Nginx installed ===")
out = run("nginx -v 2>&1")
print(out)

print()
print("=== Step 3: Create Nginx config ===")
nginx_config = """server {
    listen 80;
    listen [::]:80;
    server_name sport-set.ru www.sport-set.ru;

    access_log /var/log/nginx/kppdf-access.log;
    error_log  /var/log/nginx/kppdf-error.log;

    # Angular frontend static files
    root /opt/kppdf-3.0/frontend;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback — все не-файловые роуты отдаём index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Статика с кэшированием
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API — прокси на backend (порт 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Health check без редиректа
    location /health {
        proxy_pass http://127.0.0.1:3000/api/v1/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
"""

sudo(f"cat > /etc/nginx/sites-available/kppdf << 'NGINXEOF'\n{nginx_config}\nNGINXEOF")

# Enable site
out = sudo("ln -sf /etc/nginx/sites-available/kppdf /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default")
print("Config created and enabled")

print()
print("=== Step 4: Test Nginx config ===")
out = sudo("nginx -t 2>&1")
print(out)

print()
print("=== Step 5: Restart Nginx ===")
out = sudo("systemctl restart nginx && systemctl enable nginx", timeout=15)
print(out[:200])

time.sleep(2)

print()
print("=== Step 6: Verify Nginx is running ===")
out = sudo("systemctl status nginx --no-pager -l 2>&1 | head -15", timeout=10)
print(out)

print()
print("=== Step 7: Test local request via Nginx ===")
out = run("curl -sf -o /dev/null -w 'HTTP %{http_code} - %{content_type}' http://localhost:80/ 2>&1")
print("Frontend:", out)
out = run("curl -sf http://localhost:80/api/v1/health 2>&1")
print("Health:", out[:100])

print()
print("=== Step 8: Check old direct port 3000 still works ===")
out = run("curl -sf -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000/ 2>&1")
print("Direct 3000:", out)

print()
print("=== Nginx setup complete ===")
ssh.close()
