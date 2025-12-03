# Database Migration - Add DECLINED Status

## ✅ Already Configured - No Action Needed!

Your `apps/api/Dockerfile` already runs migrations automatically:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

**What this means:**
- Every time your API service deploys/restarts on Render
- It automatically runs `npx prisma migrate deploy`
- Applies any pending migrations (including the new DECLINED status)
- Then starts your API server

---

## What Will Happen Next

1. **You pushed the code** ✅ (already done)
2. **Render auto-deploys** - Pulls latest code, builds Docker image
3. **Container starts** - Runs `npx prisma migrate deploy` automatically
4. **Migration applies** - DECLINED status added to database
5. **API starts** - New endpoints and status available

---

## Verify Migration Success

After Render finishes deploying, check the **API service logs** for:

```
[+] Running migration: 20231203_add_declined_status
The migration has been applied successfully
✓ Database schema updated
[API] Server listening on http://localhost:3001
```

---

## Test the Features

Once deployed:
1. Login to admin dashboard
2. Submit a test scan request
3. Verify Google Drive link is visible (if provided)
4. Click "DECLINE" button
5. Check your email for the professional decline notification
6. Try the "STOP" button on a running scan

---

## If Migration Fails

If you see errors in the logs, it's likely a database connection issue. Check:
- `DATABASE_URL` environment variable is set correctly
- Database is accessible from Render
- No syntax errors in schema files

You can always run the migration locally first:
```bash
cd apps/api
npx prisma migrate dev --name add_declined_status
```

Then push the migration files (which are already committed).
