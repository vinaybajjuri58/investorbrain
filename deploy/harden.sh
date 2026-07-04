#!/usr/bin/env bash
# =============================================================================
# harden.sh — Idempotent Ubuntu 24.04 VPS hardening for InvestorBrain
#
# Usage (as root on the VPS):
#   bash harden.sh [deploy-username]
#
# Default deploy username: "deploy"
#
# What it does (in order):
#   1. apt update & upgrade
#   2. Create non-root sudo user with your SSH public key
#   3. Harden sshd (no password auth, no root login, pubkey only)
#   4. Configure ufw firewall (default deny in; allow SSH, 80, 443)
#   5. Install fail2ban with a sshd jail
#   6. Install Docker Engine + Compose plugin (official Docker apt repo)
#   7. Add the deploy user to the docker group
#
# Guard rails:
#   - Refuses to run as non-root
#   - Warns and requires typed confirmation before disabling password auth
#     when the new user has no authorized_keys yet (would lock you out)
#
# Idempotency: each step checks current state and skips if already applied.
# Safe to re-run.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers (degrade gracefully when not in an interactive terminal)
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    NC=''
fi

ok()   { printf "${GREEN}✔ %s${NC}\n"  "$*"; }
warn() { printf "${YELLOW}⚠ %s${NC}\n" "$*" >&2; }
die()  { printf "${RED}✘ %s${NC}\n"    "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Must run as root
# ---------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    die "This script must be run as root.  Try: sudo bash harden.sh"
fi

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEPLOY_USER="${1:-deploy}"
HOME_DIR="/home/${DEPLOY_USER}"
SSH_DIR="${HOME_DIR}/.ssh"
AUTH_KEYS="${SSH_DIR}/authorized_keys"
SSHD_HARDENING_CONF="/etc/ssh/sshd_config.d/99-hardening.conf"
FAIL2BAN_JAIL="/etc/fail2ban/jail.local"
DOCKER_KEYRING="/etc/apt/keyrings/docker.asc"
DOCKER_LIST="/etc/apt/sources.list.d/docker.list"

printf '\n%s InvestorBrain VPS hardening%s\n' "${GREEN}" "${NC}"
printf 'Deploy user: %s\n\n' "${DEPLOY_USER}"

# ---------------------------------------------------------------------------
# 1. System update
# ---------------------------------------------------------------------------
printf '=== 1/7  System update ===\n'
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq
ok "System packages updated and cleaned"

# ---------------------------------------------------------------------------
# 2. Create deploy user (idempotent)
# ---------------------------------------------------------------------------
printf '\n=== 2/7  Deploy user: %s ===\n' "${DEPLOY_USER}"

if ! id "${DEPLOY_USER}" > /dev/null 2>&1; then
    useradd \
        --create-home \
        --shell /bin/bash \
        --groups sudo \
        "${DEPLOY_USER}"
    # Lock password: key-only login will be enforced by sshd
    passwd -l "${DEPLOY_USER}"
    ok "Created user '${DEPLOY_USER}' with sudo access"
else
    ok "User '${DEPLOY_USER}' already exists — skipping creation"
fi

# Ensure .ssh directory exists with correct permissions
mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"

# Copy root's authorized_keys to the deploy user if not already present
if [ ! -f "${AUTH_KEYS}" ]; then
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys "${AUTH_KEYS}"
        ok "Copied /root/.ssh/authorized_keys → ${AUTH_KEYS}"
    else
        warn "No /root/.ssh/authorized_keys found."
        warn "You MUST add your public key to ${AUTH_KEYS} before logging out!"
    fi
else
    ok "authorized_keys already present for '${DEPLOY_USER}'"
fi

chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${SSH_DIR}"
# authorized_keys must be mode 600 or sshd will reject it
if [ -f "${AUTH_KEYS}" ]; then
    chmod 600 "${AUTH_KEYS}"
fi

# ---------------------------------------------------------------------------
# 3. Harden sshd
# ---------------------------------------------------------------------------
printf '\n=== 3/7  SSH hardening ===\n'

# Safety check: if authorized_keys is missing or empty, disabling password
# auth will lock everyone out.  Require explicit confirmation.
if [ ! -s "${AUTH_KEYS}" ]; then
    warn "DANGER: ${AUTH_KEYS} is missing or empty."
    warn "Disabling password authentication without a valid key will"
    warn "permanently lock you out of this server."
    printf '\nType exactly: I understand the risk\n> '
    read -r CONFIRM
    if [ "${CONFIRM}" != "I understand the risk" ]; then
        die "Aborted. Add your SSH public key to ${AUTH_KEYS} and re-run."
    fi
fi

# Write the hardening drop-in (overwrites on re-run — idempotent)
mkdir -p /etc/ssh/sshd_config.d
cat > "${SSHD_HARDENING_CONF}" << 'EOF'
# Managed by harden.sh — do not edit manually.
# Drop-in config; loaded after /etc/ssh/sshd_config.
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
UsePAM no
X11Forwarding no
PrintMotd no
EOF

# Reload sshd (reload keeps existing sessions alive; safer than restart)
# Ubuntu 24.04 uses the service name "ssh"; fall back to "sshd" just in case
if systemctl reload ssh 2>/dev/null; then
    ok "sshd reloaded (service: ssh)"
elif systemctl reload sshd 2>/dev/null; then
    ok "sshd reloaded (service: sshd)"
else
    die "Failed to reload sshd — check 'systemctl status ssh'"
fi

# ---------------------------------------------------------------------------
# 4. ufw firewall
# ---------------------------------------------------------------------------
printf '\n=== 4/7  Firewall (ufw) ===\n'

apt-get install -y -qq ufw

# Reset to a clean slate (idempotent: safe to call again)
ufw --force reset

ufw default deny incoming
ufw default allow outgoing

# Allow SSH first — before enabling ufw — so we don't lock ourselves out
ufw allow OpenSSH

# HTTP and HTTPS (TCP)
ufw allow 80/tcp
ufw allow 443/tcp

# HTTP/3 over QUIC (UDP)
ufw allow 443/udp

# Enable (--force skips the interactive "proceed?" prompt)
ufw --force enable

ok "ufw enabled — allowed inbound: OpenSSH, 80/tcp, 443/tcp, 443/udp"

# ---------------------------------------------------------------------------
# 5. fail2ban
# ---------------------------------------------------------------------------
printf '\n=== 5/7  fail2ban ===\n'

apt-get install -y -qq fail2ban

# Write jail.local (overwrites on re-run — idempotent)
cat > "${FAIL2BAN_JAIL}" << 'EOF'
# Managed by harden.sh — do not edit manually.
[DEFAULT]
# Ban IPs for 1 hour after 5 failures within a 10-minute window
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled  = true
port     = ssh
# Let fail2ban pick the right log source (journald on Ubuntu 24.04)
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban
ok "fail2ban installed and sshd jail active"

# ---------------------------------------------------------------------------
# 6. Docker Engine + Compose plugin (official Docker apt repo)
# ---------------------------------------------------------------------------
printf '\n=== 6/7  Docker Engine ===\n'

if command -v docker > /dev/null 2>&1; then
    ok "Docker already installed ($(docker --version)) — skipping"
else
    # Prerequisites
    apt-get install -y -qq ca-certificates curl gnupg

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o "${DOCKER_KEYRING}"
    chmod a+r "${DOCKER_KEYRING}"

    # Detect architecture and Ubuntu codename
    ARCH="$(dpkg --print-architecture)"
    # Source /etc/os-release in a subshell to avoid polluting the environment
    CODENAME="$(
        # shellcheck source=/dev/null
        . /etc/os-release
        printf '%s' "${UBUNTU_CODENAME:-${VERSION_CODENAME:-noble}}"
    )"

    # Add the stable Docker apt repository
    printf 'deb [arch=%s signed-by=%s] https://download.docker.com/linux/ubuntu %s stable\n' \
        "${ARCH}" "${DOCKER_KEYRING}" "${CODENAME}" \
        > "${DOCKER_LIST}"

    apt-get update -qq
    apt-get install -y -qq \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    ok "Docker Engine installed and running"
fi

# ---------------------------------------------------------------------------
# 7. Add deploy user to docker group
# ---------------------------------------------------------------------------
printf '\n=== 7/7  Docker group ===\n'

if groups "${DEPLOY_USER}" | grep -qw docker; then
    ok "'${DEPLOY_USER}' is already in the docker group"
else
    usermod -aG docker "${DEPLOY_USER}"
    ok "Added '${DEPLOY_USER}' to the docker group"
fi

# ---------------------------------------------------------------------------
# Done — summary and next steps
# ---------------------------------------------------------------------------
printf '\n'
printf '%s══════════════════════════════════════════════════════%s\n' "${GREEN}" "${NC}"
printf '%s  VPS hardening complete!%s\n'                              "${GREEN}" "${NC}"
printf '%s══════════════════════════════════════════════════════%s\n' "${GREEN}" "${NC}"
printf '
%sIMPORTANT — verify SSH access BEFORE closing this session:%s

  Open a NEW terminal on your local machine and run:
    ssh %s@<server-ip>

  Only after confirming login works, close this root session.

%sNext steps (as %s):%s

  1. Clone the repository:
       git clone https://github.com/vinaybajjuri58/investorbrain ~/investorbrain
       cd ~/investorbrain

  2. Configure environment:
       cp .env.example .env
       nano .env   # set LLM_API_KEY, FASTAPI_USERS_JWT_SECRET, DOMAIN, etc.

  3. Deploy:
       export DOMAIN=yourdomain.com
       docker compose -f deploy/docker-compose.prod.yml up -d --build

  4. Monitor:
       docker compose -f deploy/docker-compose.prod.yml logs -f

  5. Note: the docker group change takes effect on your NEXT login.
       Log out and back in if docker commands return permission errors.

' "${YELLOW}" "${NC}" "${DEPLOY_USER}" "${GREEN}" "${DEPLOY_USER}" "${NC}"
