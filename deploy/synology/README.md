# Deploy KPPDF 3.0 on Synology NAS

> Production deployment to Synology NAS via Docker.

## Requirements

- Synology NAS with SSH access (DSM 7+)
- Docker installed via Package Center
- Node.js 22+ on dev machine (for building)
- Python 3 + `paramiko` on dev machine (for deploy script)

## Quick Deploy (Automated Script)

The easiest way: run the deploy script from your dev machine.

### First time: Setup SSH key (one-time)

```bash
# On dev machine (cmd/powershell)
ssh-keygen -t ed25519 -f %USERPROFILE%\.ssh\id_ed25519 -N ""
type %USERPROFILE%\.ssh\id_ed25519.pub
```

Copy the output. Then on Synology (via DSM Control Panel > Terminal & SNMP > Enable SSH):

```bash
# Or via SSH with password:
ssh nastiit@192.168.1.134
mkdir -p ~/.ssh
echo "ssh-ed25519 AAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit

# Test (should work without password):
ssh nastiit@192.168.1.134 "echo OK"
```

### Deploy

```bash
# Build backend TypeScript FIRST
cd backend
npx tsc

# Deploy with seed
cd ..
python deploy/synology/deploy.py --password YOUR_PASSWORD --seed

# Or deploy without seed (if data already exists)
python deploy/synology/deploy.py --password YOUR_PASSWORD

# Or skip Docker build (if only seed/restart needed)
python deploy/synology/deploy.py --password YOUR_PASSWORD --skip-build --seed
```

### What the script does

1. Creates archive with `backend/` + `shared/` + `docker-compose.prod.yml`
2. Connects to Synology via SSH (paramiko)
3. Uploads archive (SCP > SFTP > base64 pipe — auto-fallback)
4. Extracts on Synology into `/volume1/docker/kppdf-3.0/`
5. Runs `docker compose build --no-cache && up -d`
6. Waits for health check (mongodb connected)
7. Runs seed (if `--seed` flag)
8. Verifies auth + products API

## Manual Deploy (step by step)

### 1. Build TypeScript

```bash
cd backend
npx tsc
cd ..
```

### 2. Prepare archive

```bash
tar czf deploy.tar.gz \
  backend/ shared/ docker-compose.prod.yml \
  --exclude='backend/node_modules' \
  --exclude='backend/dist' \
  --exclude='backend/.git' \
  --exclude='backend/src/__tests__' \
  --exclude='backend/.env'
```

Important: Include `shared/` directory — it contains shared TypeScript types
needed for compilation. Without it, `tsc` inside the Docker build will fail.

### 3. Copy to Synology

```bash
scp deploy.tar.gz nastiit@192.168.1.134:/volume1/docker/kppdf-3.0/
```

### 4. Build & start on Synology

```bash
ssh nastiit@192.168.1.134
cd /volume1/docker/kppdf-3.0
sudo tar xzf deploy.tar.gz
sudo rm deploy.tar.gz

# Build and start
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml down
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml build --no-cache backend
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml up -d
```

Note: Use full path `/usr/local/bin/docker` — Docker is not in root's PATH on Synology.

### 5. Check health

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"success":true,"data":{"status":"ok","mongodb":"connected"}}
```

### 6. Seed data (first deploy or after DB reset)

```bash
sudo /usr/local/bin/docker exec kppdf-backend node dist/backend/src/seed.js
```

Note: The WORKDIR is `/app` inside the container, so relative path is `dist/backend/src/seed.js`
(which resolves to `/app/dist/backend/src/seed.js`).

### 7. Verify

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get products (use token from login response)
curl http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Structure on Synology

```
/volume1/docker/kppdf-3.0/
  docker-compose.prod.yml
  backend/
    src/           # TypeScript source (for Docker build)
    package.json
    tsconfig.json
  shared/
    types/         # Shared TypeScript interfaces (needed for build!)
```

## Common Issues & Solutions

### "docker: command not found"

Docker is at `/usr/local/bin/docker` but may not be in PATH for root.
Always use full path: `/usr/local/bin/docker` or `export PATH=$PATH:/usr/local/bin`.

### "getaddrinfo ENOTFOUND kppdf-mongodb"

MongoDB container is not running. Check with `docker ps` and start it:
```bash
/usr/local/bin/docker start kppdf-mongodb
# Or if it doesn't exist:
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml up -d mongodb
```

### Seed fails with MongoDB connection error

The seed runs inside the kppdf-backend container. Ensure:
1. MongoDB container is running (`docker start kppdf-mongodb`)
2. Backend container is running and health check passes
3. Use the correct path: `node dist/backend/src/seed.js` (relative to WORKDIR `/app`)

### "Cannot find module 'mongodb-memory-server'"

Production Docker image uses `npm ci --only=production` and does NOT have
`mongodb-memory-server`. The seed connects to the real MongoDB at
`mongodb://kppdf-mongodb:27017/kppdf30` (set via MONGO_URI env var).

### TypeScript build on Synology fails

Make sure the archive includes `shared/` directory. Without it, the Docker
build's TypeScript compilation will fail because shared types (`*.interface.ts`)
are missing.

## Docker Commands (Quick Reference)

```bash
# Container management
/usr/local/bin/docker ps -a
/usr/local/bin/docker logs kppdf-backend
/usr/local/bin/docker restart kppdf-backend

# Docker Compose (use full path)
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml ps
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml up -d
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml down
sudo /usr/local/bin/docker compose -f docker-compose.prod.yml logs -f --tail=50

# Inside container
sudo /usr/local/bin/docker exec -it kppdf-backend sh
/usr/local/bin/docker exec kppdf-backend node dist/backend/src/seed.js
```

## Access

| Service | URL |
|---------|-----|
| API Health | http://192.168.1.134:3000/api/v1/health |
| Login | POST http://192.168.1.134:3000/api/v1/auth/login |
| Default auth | admin / admin123 |
