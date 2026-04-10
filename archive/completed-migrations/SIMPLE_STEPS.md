# 🚀 Simple Steps - Database Consolidation

## ⚡ Quick & Easy (2 Commands)

### Step 1: Run Migrations
```bash
cd multysis-backend
npm run db:migrate
```

This single command will:
- ✅ Apply both consolidation migrations
- ✅ Migrate all existing data automatically
- ✅ Update your database schema
- ✅ Drop old tables

### Step 2: Verify It Worked
```bash
npm run dev
```

If your server starts without errors, you're good to go! 🎉

---

## That's It!

The migrations are **safe** and will:
- Preserve all your existing data
- Automatically migrate everything
- Clean up old tables

## Optional: Visual Check

If you want to see the data visually:
```bash
npm run db:studio
```
Then open http://localhost:5555 and check the tables.

---

## ⚠️ Note

If you want to be extra safe, backup your database first:
```bash
# PostgreSQL example
pg_dump -U your_user -d your_database > backup.sql
```

But for development, just run the migrations - they're designed to be safe!

