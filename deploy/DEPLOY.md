# InvestorBrain — Production Deployment Runbook

Target: single Ubuntu 24.04 VPS (8 GB RAM), Docker Compose, one domain, auto-TLS via Caddy.

---

## 1. Provision a VPS and add your SSH key

**Hetzner (recommended):** CX32 — 4 vCPU, 8 GB RAM, 80 GB NVMe, ~$10/mo  
**DigitalOcean alternative:** 8 GB Droplet (Basic / Premium Intel)

During provisioning, paste your SSH public key so you can log in as root immediately.

---

## 2. Point a DNS A record at the VPS

In your DNS provider, create:

```
A    investorbrain.example.com    <vps-ipv4>    TTL 300
```

Wait for propagation before deploying (Caddy's ACME challenge requires DNS to resolve).  
Verify with: `dig +short investorbrain.example.com`

---

## 3. Harden the VPS (run as root)

SSH into the VPS as root, then run the hardening script.

**Option A — fetch from GitHub (after the repo is public):**

```bash
curl -fsSL https://raw.githubusercontent.com/vinaybajjuri58/investorbrain/main/deploy/harden.sh \
  | bash -s -- deploy
```

**Option B — copy the file first (always works):**

```bash
# On your local machine:
scp deploy/harden.sh root@<vps-ip>:/root/harden.sh

# On the VPS:
bash /root/harden.sh deploy
```

The script creates a `deploy` user (or the name you pass as `$1`), copies your
root authorized_keys, hardens sshd, enables ufw, installs fail2ban and Docker.

**Verify SSH before closing the root session:**

```bash
# In a NEW terminal on your local machine:
ssh deploy@<vps-ip>
```

---

## 4. Configure the environment

As the `deploy` user on the VPS:

```bash
git clone https://github.com/vinaybajjuri58/investorbrain ~/investorbrain
cd ~/investorbrain

# Copy the example and fill in real values
cp .env.example .env
nano .env
```

Required values to set in `.env`:

| Variable | What to set |
|---|---|
| `LLM_API_KEY` | Your OpenAI API key (`sk-...`) |
| `FASTAPI_USERS_JWT_SECRET` | A long random string (`openssl rand -hex 32`) |
| `DOMAIN` | Your domain name, e.g. `investorbrain.example.com` |
| `AUTH_SECRET` | Random secret for Auth.js (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID (see setup below) |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `OWNER_EMAIL` | Your Google account email — maps to the "investing" dataset |

All other variables can stay as-is from `.env.example` for a standard deployment.

**Why DOMAIN goes in `.env`:** Docker Compose auto-loads the `.env` file from the
project root.  The `caddy` service forwards `DOMAIN` into the container where
Caddy reads it as `{$DOMAIN}` in the Caddyfile for automatic TLS provisioning.

---

## 5. Deploy

```bash
cd ~/investorbrain

# First deploy (builds the web image, pulls cognee + caddy):
docker compose -f deploy/docker-compose.prod.yml up -d --build

# Watch startup logs until all three services are healthy:
docker compose -f deploy/docker-compose.prod.yml logs -f
```

---

## 6. Verify

```bash
# All three services should show "Up" with health status:
docker compose -f deploy/docker-compose.prod.yml ps

# Hit the live HTTPS endpoint (Caddy provisions the cert on first request;
# allow ~30 s for the ACME challenge to complete):
curl -I https://investorbrain.example.com
# Expect: HTTP/2 200
```

---

## 7. Operational notes

### Cognee is never publicly reachable

Port 8000 is not published.  The Next.js server-side routes call
`http://cognee:8000` over the internal Docker network.  No firewall rule
is needed to protect it.

### Pre-ingest the demo corpus before recording

Cognee's graph-building step (`cognify`) is slow (minutes, not seconds).
Run the ingest through the app's UI or the Cognee REST API before your demo:

```bash
# Example: trigger ingest via the Cognee API from inside the web container
docker compose -f deploy/docker-compose.prod.yml exec cognee \
  curl -X POST http://localhost:8000/v1/cognify
```

### Backups

Two options (pick one or both):

1. **VPS snapshot** — cheapest; Hetzner/DO both offer one-click snapshots.
2. **Volume tar** — more portable:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml stop cognee
   tar -czf cognee-backup-$(date +%Y%m%d).tar.gz \
     $(docker volume inspect investorbrain_cognee_data --format '{{.Mountpoint}}') \
     $(docker volume inspect investorbrain_cognee_system --format '{{.Mountpoint}}')
   docker compose -f deploy/docker-compose.prod.yml start cognee
   ```

Also back up `/home/deploy/investorbrain/.env` — it is gitignored and contains your secrets.

### Updating the application

```bash
cd ~/investorbrain
git pull

# Rebuild the web image and restart only changed services:
docker compose -f deploy/docker-compose.prod.yml up -d --build

# Caddy and cognee restart only if their image/config changed.
```

### Rotating the LLM API key

1. Edit `.env`, update `LLM_API_KEY`
2. `docker compose -f deploy/docker-compose.prod.yml up -d cognee`  
   (restarts only the cognee container to pick up the new key)

### Viewing logs

```bash
# All services:
docker compose -f deploy/docker-compose.prod.yml logs -f

# One service:
docker compose -f deploy/docker-compose.prod.yml logs -f web
docker compose -f deploy/docker-compose.prod.yml logs -f cognee
docker compose -f deploy/docker-compose.prod.yml logs -f caddy
```

### TLS certificate renewal

Caddy renews certificates automatically.  No cron job or manual step required.
Certificates are stored in the `caddy_data` Docker volume and survive restarts.

---

## Google OAuth setup

InvestorBrain uses Google as the sole sign-in provider. Each user receives an
isolated Cognee dataset. The owner's email (set in `OWNER_EMAIL`) maps to the
pre-populated `investing` dataset.

### Steps

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials → OAuth 2.0 Client ID**.
3. Application type: **Web application**. Give it a name (e.g. `InvestorBrain`).
4. Under **Authorised redirect URIs**, add:
   ```
   https://DOMAIN/api/auth/callback/google
   ```
   Replace `DOMAIN` with your actual domain (e.g. `investorbrain.example.com`).
   For local development, also add `http://localhost:3000/api/auth/callback/google`.
5. Click **Create**. Copy the **Client ID** and **Client Secret**.
6. In your server `.env`, set:
   ```
   AUTH_GOOGLE_ID=<Client ID>
   AUTH_GOOGLE_SECRET=<Client Secret>
   AUTH_SECRET=<openssl rand -base64 32>
   OWNER_EMAIL=<your Google account email>
   ```
7. Redeploy: `docker compose -f deploy/docker-compose.prod.yml up -d --build web`

The `AUTH_URL` is automatically set to `https://${DOMAIN}` by the compose file.
You do not need to set it manually in `.env`.
