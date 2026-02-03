---
name: deploy-reminder
enabled: true
event: bash
pattern: git commit
action: warn
---

🚀 **Commit detected! Don't forget to deploy.**

After committing, run `/deploy` to rebuild and restart the Docker containers:

```bash
docker compose up -d --build app
```

Or run the full deploy script:
```bash
./scripts/deploy.sh
```
