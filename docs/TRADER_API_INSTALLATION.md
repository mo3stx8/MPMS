# INSTALLATION INSTRUCTIONS - Trader Module API Routes

## Step 1: Locate the Server File
Open the file: `/supabase/functions/server/index.tsx`

## Step 2: Find the Insertion Point
Scroll to the bottom of the file and find this line:
```typescript
Deno.serve(app.fetch);
```

## Step 3: Add the Trader API Routes
**INSERT** all the code from `/TRADER_API_ROUTES.txt` **BEFORE** the `Deno.serve(app.fetch);` line.

The final structure should look like:
```typescript
// ... existing wharf routes ...
});

// TRADER API ROUTES (ADD THESE)
app.get("/make-server-85dcafc8/trader-stats", async (c) => {
  // ... trader stats code ...
});

app.get("/make-server-85dcafc8/trader-containers", async (c) => {
  // ... trader containers code ...
});

// ... rest of trader routes ...

app.post("/make-server-85dcafc8/init-trader-data", async (c) => {
  // ... init trader data code ...
});

Deno.serve(app.fetch); // This line stays at the very end
```

## Step 4: Verify
After adding the routes:
1. Save the file
2. The Deno server should automatically restart
3. Check console for any errors
4. Test by logging in as a trader

## Quick Test
1. Login with a trader account
2. Click "Initialize Data" on the Trader Dashboard
3. Verify data appears in all 4 pages

## API Routes Added (7 total):
1. GET  `/trader-stats` - Dashboard statistics
2. GET  `/trader-containers` - List containers
3. GET  `/discharge-requests` - List discharge requests
4. POST `/discharge-request` - Submit new request
5. GET  `/trader-notifications` - List notifications
6. POST `/mark-notification-read` - Mark notification read
7. POST `/init-trader-data` - Initialize sample data

## Troubleshooting
- **404 errors:** Routes not added correctly, check placement
- **500 errors:** Check console logs for syntax errors
- **No data:** Run init-trader-data endpoint first
- **Filter issues:** Verify traderEmail parameter matches logged-in user

## Alternative: Copy-Paste Method
1. Open `/TRADER_API_ROUTES.txt`
2. Select ALL content (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)
4. Open `/supabase/functions/server/index.tsx`
5. Go to line 606 (before `Deno.serve`)
6. Paste (Ctrl+V / Cmd+V)
7. Save file

Done! The Trader module backend is now fully integrated.
