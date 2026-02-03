---
name: deploy
description: Rebuild and restart the Docker containers
---

# Deploy Mirror Arena

Rebuilding and restarting the Docker containers...

```bash
cd /Users/danielamar/Desktop/sentience-judge && docker compose up -d --build app
```

After the containers restart, verify the deployment:

```bash
docker compose ps
docker compose logs --tail=20 app
```

If you also need to run database migrations:

```bash
docker compose exec app npx prisma migrate deploy
```
