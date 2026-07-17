# Coolify migration notes

Use `deploy/docker-compose.coolify.yml` as the Compose file. Coolify owns the
reverse proxy and TLS, so this stack deliberately contains no Caddy/nginx and
publishes no host ports. Assign `https://brain.desiquant.com` to the `web`
service on port `3000`; never assign a public domain to `cognee`.

## Before cutover

1. Take a Hostinger snapshot.
2. Copy the current server `.env` to secure backup storage. It contains OAuth,
   Cognee JWT, and model-provider secrets. Do not commit it or upload it as a
   build artifact.
3. Stop Cognee briefly for a consistent backup, then archive **both** existing
   volume contents (`cognee_data` and `cognee_system`). Find the real names with
   `docker volume ls`/`docker volume inspect`; Compose project prefixes vary.
4. Record the currently deployed Cognee image digest with
   `docker image inspect cognee/cognee:main --format '{{index .RepoDigests 0}}'`.
   Set `COGNEE_IMAGE` to that digest for the migration. The `main` tag is mutable
   and should not be upgraded during a data migration.
5. Create all variables shown in `.env.example` in Coolify. Set `AUTH_URL` to
   `https://brain.desiquant.com`. Generate new secrets only if deliberately
   rotating them; changing Cognee's JWT secret can invalidate existing tokens.
6. Restore both archives into the two new Coolify-managed volumes before the
   first production start. Verify ownership and permissions match the source.

The default KVM 2 limits are 1.25 CPU/3 GiB for Cognee and 0.5 CPU/768 MiB for
the web service. Override `COGNEE_CPU_LIMIT`, `COGNEE_MEMORY_LIMIT`,
`WEB_CPU_LIMIT`, or `WEB_MEMORY_LIMIT` in Coolify only after observing real
usage. Cognee ingestion is intentionally constrained so it cannot starve the
other applications; large ingestions will take longer.

## Cutover

Keep `deploy/docker-compose.vps.yml` and the existing nginx route running while
testing the Coolify deployment on a temporary hostname. At cutover, stop the old
stack, perform one final volume backup/restore, move the production hostname to
Coolify, and test login, source listing, graph reads, recall, and a small ingest.
Do not run old and new Cognee containers against the same local volume.

Retain the old stack and backups until the production hostname and data have
been verified. Rollback means stopping the Coolify stack, restoring the old
nginx route/stack, and using the untouched source volumes.
