# Database Migration - Add DECLINED Status

## Run this after pulling the latest code

### For API Service

```bash
cd apps/api
npx prisma migrate dev --name add_declined_status
npx prisma generate
```

### For Worker Service

```bash
cd apps/worker
npx prisma generate
```

## What this does

- Adds `DECLINED` to the `JobStatus` enum
- Updates the Prisma client to recognize the new status
- Allows admins to decline pending requests

## After Migration

- Restart API service
- Restart Worker service
- Test decline functionality in admin dashboard
