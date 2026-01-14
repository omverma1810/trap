# TRAP Inventory - Backup & Recovery Guide

Procedures for backing up and restoring the TRAP Inventory system.

---

## Database Backup

### Cloud SQL Automated Backups

Cloud SQL provides automated daily backups with 7-day retention by default.

**Enable automated backups:**
```bash
gcloud sql instances patch trap-postgres \
  --backup-start-time=03:00 \
  --enable-bin-log
```

### Manual Backup (On-Demand)

```bash
# Create a backup
gcloud sql backups create --instance=trap-postgres

# List backups
gcloud sql backups list --instance=trap-postgres
```

### Export to Cloud Storage

```bash
# Create a storage bucket for backups
gsutil mb gs://trap-inventory-backups

# Export database to SQL file
gcloud sql export sql trap-postgres \
  gs://trap-inventory-backups/backup-$(date +%Y%m%d-%H%M%S).sql \
  --database=trap_inventory
```

### Local Backup (Development)

```bash
# Using pg_dump
docker compose exec postgres pg_dump -U postgres trap_inventory > backup.sql

# Or directly
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h localhost -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

---

## Database Recovery

### Restore from Cloud SQL Backup

1. Go to Cloud Console → SQL → trap-postgres → Backups
2. Find the backup you want to restore
3. Click "Restore" and follow the prompts

**CLI method:**
```bash
# List backups
gcloud sql backups list --instance=trap-postgres

# Restore (creates new instance)
gcloud sql instances restore-backup trap-postgres \
  --backup-id=BACKUP_ID
```

### Restore from SQL Export

```bash
# Import from Cloud Storage
gcloud sql import sql trap-postgres \
  gs://trap-inventory-backups/backup-20260114.sql \
  --database=trap_inventory
```

### Restore Locally

```bash
# Using psql
docker compose exec -T postgres psql -U postgres trap_inventory < backup.sql

# Or directly
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

---

## Media Files Backup

### Cloud Storage for Media

Media files should be stored in Cloud Storage for production:

```bash
# Sync media to Cloud Storage
gsutil -m rsync -r ./media gs://trap-inventory-media/

# Sync back from Cloud Storage
gsutil -m rsync -r gs://trap-inventory-media/ ./media
```

### Backup Retention Policy

```bash
# Set lifecycle policy for automatic deletion after 30 days
gsutil lifecycle set lifecycle.json gs://trap-inventory-backups
```

**lifecycle.json:**
```json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }
  ]
}
```

---

## Application State Recovery

### Redeploy Backend

```bash
# Get the latest image tag
gcloud artifacts docker images list \
  asia-south1-docker.pkg.dev/trap-inventory/trap/trap-api \
  --limit=5

# Redeploy specific version
gcloud run deploy trap-api \
  --image asia-south1-docker.pkg.dev/trap-inventory/trap/trap-api:COMMIT_SHA \
  --region asia-south1
```

### Rollback Backend

```bash
# List revisions
gcloud run revisions list --service=trap-api --region=asia-south1

# Route traffic to previous revision
gcloud run services update-traffic trap-api \
  --to-revisions=trap-api-REVISION=100 \
  --region=asia-south1
```

### Rollback Frontend (Vercel)

1. Go to Vercel Dashboard → Project → Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

**CLI method:**
```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote DEPLOYMENT_URL
```

---

## Disaster Recovery Scenarios

### Scenario 1: Database Corrupted

1. Stop the Cloud Run service to prevent further writes
2. Restore from the most recent backup
3. Restart the service
4. Verify data integrity

```bash
# Pause service (scale to 0)
gcloud run services update trap-api --min-instances=0 --max-instances=0 --region=asia-south1

# Restore backup
gcloud sql backups list --instance=trap-postgres
gcloud sql instances restore-backup trap-postgres --backup-id=BACKUP_ID

# Resume service
gcloud run services update trap-api --min-instances=0 --max-instances=10 --region=asia-south1
```

### Scenario 2: Bad Deployment

1. Rollback to previous revision immediately
2. Investigate the issue
3. Fix and redeploy

```bash
# Immediate rollback
gcloud run services update-traffic trap-api \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=asia-south1
```

### Scenario 3: Secret Compromised

1. Rotate the compromised secret immediately
2. Update Secret Manager
3. Trigger new deployment

```bash
# Update secret
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy to pick up new secret
gcloud run services update trap-api --region=asia-south1
```

---

## Backup Schedule

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Cloud SQL Automated | Daily | 7 days | GCP |
| Database Export | Weekly | 30 days | Cloud Storage |
| Media Files | Daily | 30 days | Cloud Storage |

---

## Recovery Testing

**Monthly checklist:**

- [ ] Restore database backup to test instance
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Document any issues
- [ ] Update recovery procedures if needed
