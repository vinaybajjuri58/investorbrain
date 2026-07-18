# InvestorBrain: change and redeploy

This is the day-to-day deployment runbook for the Hackathon/InvestorBrain
application on the Hostinger KVM 2 VPS. Coolify builds
`/deploy/docker-compose.coolify.yml`, and the production site is
<https://brain.desiquant.com>.

## 1. Make and verify a change

Start from the latest `main` branch:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

For web changes, run:

```bash
cd web
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm build
cd ..
```

Commit and push only the intended files:

```bash
git status
git add <files-you-changed>
git commit -m "Describe the change"
git push -u origin HEAD
```

Merge the reviewed branch into `main`. Pushing updates GitHub but does not
guarantee a deployment unless a Coolify webhook or GitHub App has been set up.

## 2. Open Coolify

Create an SSH tunnel using your permanent VPS key:

```bash
ssh -N -L 8000:127.0.0.1:8000 root@72.60.102.148
```

Open <http://127.0.0.1:8000>. If that local port is occupied, use port 18000:

```bash
ssh -N -L 18000:127.0.0.1:8000 root@72.60.102.148
```

Then open <http://127.0.0.1:18000>.

## 3. Redeploy

1. Open the InvestorBrain project and production environment.
2. Open its Docker Compose application.
3. Confirm the branch is `main` and the Compose path is
   `/deploy/docker-compose.coolify.yml`.
4. Select **Deploy** or **Redeploy** and watch both build and runtime logs.
5. Confirm `web` and `cognee` are healthy, then test the production site.

The public edge nginx routes `brain.desiquant.com` to the Coolify web container
over the external `edge` Docker network. Do not remove that network, rename the
web network alias, or publish ports 80/443 from this Compose stack without also
coordinating the nginx route.

## Environment-variable changes

Change secrets in the Coolify resource's **Environment Variables** screen,
save, and redeploy. Never commit `.env` files or secret values. Keep `AUTH_URL`
set to `https://brain.desiquant.com`. Treat `AUTH_SECRET`, OAuth credentials,
`FASTAPI_USERS_JWT_SECRET`, `COGNEE_USER_SECRET`, and model-provider keys as
sensitive.

Changing authentication/JWT secrets can invalidate users or break communication
between `web` and `cognee`; rotate them as a coordinated change. Keep the pinned
`COGNEE_IMAGE` digest during ordinary web deployments. Upgrade Cognee in its own
deployment after taking and testing backups.

## Verify the deployment

```bash
curl -fsS https://brain.desiquant.com/ >/dev/null && echo "site is reachable"
```

Also verify:

- Google sign-in and owner authorization work.
- Existing sources, graph reads, and recall still return stored data.
- One small ingest completes successfully.
- Neither `web` nor `cognee` is restarting or producing new errors.
- The old preserved stack remains stopped; never run two Cognee instances
  against the same local data.

## Roll back

Use the Coolify resource's **Deployments** list to redeploy the last known-good
Git revision. If the release changed Cognee itself or its persisted data format,
stop the resource and restore both matching volume backups before deploying the
old image.

Never delete or recreate `cognee_data` or `cognee_system` during a routine
redeploy. Take a fresh backup of both before Cognee upgrades, storage changes,
or data migrations. The original migration and recovery details are in
[`deploy/COOLIFY.md`](deploy/COOLIFY.md).
