# Risk Game Clone - Deployment Guide

This guide will walk you through deploying your Risk game clone to production using Supabase and Vercel.

---

## Prerequisites

- [Supabase Account](https://supabase.com) (free tier works)
- [Vercel Account](https://vercel.com) (free tier works)
- [Node.js 18+](https://nodejs.org/) installed locally
- Git repository (GitHub, GitLab, or Bitbucket)

---

## Step 1: Set Up Supabase Project

### 1.1 Create a New Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `risk-game` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### 1.2 Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the `supabase-schema.sql` file from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: `Success. No rows returned`

### 1.3 Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `games`
   - `players`
   - `territories`
   - `game_actions`

### 1.4 Get Your Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** section
3. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

---

## Step 2: Configure Environment Variables Locally

### 2.1 Update `.env.local`

Replace the placeholder values in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2.2 Test Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and test:
- Create a game
- Join with multiple browser tabs (incognito mode)
- Place armies
- Attack territories
- Win the game

---

## Step 3: Deploy to Vercel

### 3.1 Push to Git Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial Risk game implementation"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/risk-game.git

# Push to main branch
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"** (DON'T configure env vars yet - we'll do it next)

### 3.3 Configure Environment Variables

1. After deployment completes, go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
     - **Value**: Your Supabase project URL
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Value**: Your Supabase anon key
4. Click **"Save"**

### 3.4 Redeploy with Environment Variables

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"..."** (three dots) → **"Redeploy"**
4. Check **"Use existing build cache"**
5. Click **"Redeploy"**

---

## Step 4: Verify Production Deployment

### 4.1 Basic Checks

1. Visit your Vercel URL (e.g., `https://risk-game.vercel.app`)
2. You should see the lobby page
3. Open browser console - no errors

### 4.2 Full Game Test

**Open 2-3 browser tabs/windows:**

1. **Tab 1** (Player 1):
   - Click "Create Game"
   - Enter username: `Alice`
   - Select color: `red`
   - Copy the game URL

2. **Tab 2** (Player 2):
   - Paste game URL
   - Enter username: `Bob`
   - Select color: `blue`
   - Click "Join Game"

3. **Tab 1**:
   - You should see Bob in the player list (real-time update!)
   - Click **"Start Game"**

4. **Both tabs**:
   - Territories should be distributed
   - Place initial armies
   - When all armies placed, game auto-starts

5. **Test gameplay**:
   - ✅ Reinforcement phase
   - ✅ Attack territories
   - ✅ Battle results display
   - ✅ Fortify phase
   - ✅ End turn
   - ✅ Next player's turn

6. **Test win condition**:
   - Continue playing until one player conquers all
   - Victory screen should appear

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `risk.yourdomain.com`)
4. Follow DNS configuration instructions

### 5.2 Update DNS

Add the records shown in Vercel:
- **Type**: CNAME
- **Name**: `risk` (or `@` for root)
- **Value**: `cname.vercel-dns.com`

Wait 5-10 minutes for DNS propagation.

---

## Step 6: Post-Deployment

### 6.1 Enable Supabase Realtime (Critical!)

1. Go to Supabase dashboard → **Database** → **Replication**
2. Find these tables:
   - `games`
   - `players`
   - `territories`
   - `game_actions`
3. Toggle **"Realtime"** to **ON** for each table
4. This enables live multiplayer updates

### 6.2 Monitor Performance

**Supabase Dashboard:**
- Go to **Reports** → check database usage
- Free tier: 500 MB database, 2 GB bandwidth/month

**Vercel Dashboard:**
- Go to **Analytics** → check page views
- Go to **Speed Insights** → check performance scores
- Free tier: Unlimited bandwidth, 100 GB/month

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:**
- Verify environment variables in Vercel dashboard
- Ensure they start with `NEXT_PUBLIC_`
- Redeploy after adding variables

### Issue: "Real-time updates not working"

**Solution:**
- Check Supabase Realtime is enabled for tables
- Verify WebSocket connections in browser console
- Check Supabase logs for errors

### Issue: "TypeError: Cannot read properties of undefined"

**Solution:**
- Clear browser cache
- Hard refresh (Cmd/Ctrl + Shift + R)
- Check browser console for specific error

### Issue: "Game stuck in setup phase"

**Solution:**
- All players must place all initial armies
- Check `armies_available` in Supabase Table Editor
- Auto-transition triggers when all are 0

---

## Production Best Practices

### Security

1. **Row Level Security (RLS)**:
   - Already enabled in schema
   - Prevents unauthorized data access

2. **Environment Variables**:
   - Never commit `.env.local` to Git
   - Use Vercel's environment variables

3. **Rate Limiting** (Future Enhancement):
   - Add rate limiting for server actions
   - Prevent abuse

### Performance

1. **Caching**:
   - Next.js automatically caches static assets
   - Vercel Edge Network provides global CDN

2. **Database Indexes**:
   - Already added in schema for frequent queries
   - Monitor slow queries in Supabase

3. **Bundle Size**:
   - Current: 157 KB (optimized)
   - Monitor with `npm run build`

### Monitoring

1. **Vercel Analytics**:
   - Enable in project settings (free)
   - Track page views, performance

2. **Supabase Logs**:
   - Check database logs for errors
   - Monitor connection pool usage

3. **Error Tracking** (Optional):
   - Add Sentry for error reporting
   - Track client-side errors

---

## Costs

### Free Tier Limits

**Supabase:**
- 500 MB database storage
- 2 GB bandwidth/month
- Unlimited API requests
- 50,000 monthly active users

**Vercel:**
- 100 GB bandwidth/month
- Unlimited deployments
- Unlimited static hosting
- 100 hours serverless function execution

### Estimated Usage

For **100 concurrent games** (200-400 players):
- Database: ~50 MB
- Bandwidth: ~10 GB/month
- Well within free tier limits!

---

## Scaling Beyond Free Tier

### When to Upgrade

**Supabase Pro ($25/month):**
- 8 GB database storage
- 50 GB bandwidth
- Daily backups
- Email support

**Vercel Pro ($20/month):**
- 1 TB bandwidth
- Advanced analytics
- Team collaboration
- Priority support

### Performance Optimization

1. **Database Connection Pooling**:
   - Supabase handles automatically
   - Consider Prisma for ORM if scaling

2. **Edge Functions**:
   - Move game logic to Supabase Edge Functions
   - Reduce latency globally

3. **Redis Caching**:
   - Cache game state
   - Reduce database queries

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check Supabase dashboard for errors
- Monitor Vercel deployment logs
- Review user feedback

**Monthly:**
- Update dependencies: `npm update`
- Review Supabase/Vercel usage
- Backup database (Supabase Pro)

### Updating the Game

```bash
# Pull latest changes
git pull origin main

# Test locally
npm run dev

# Deploy to production
git push origin main

# Vercel auto-deploys on push
```

---

## Support

### Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)

### Community

- [Supabase Discord](https://discord.supabase.com/)
- [Vercel Discord](https://vercel.com/discord)
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)

---

## Success Checklist

- ✅ Supabase project created
- ✅ Schema migration successful
- ✅ Environment variables configured
- ✅ Deployed to Vercel
- ✅ Custom domain added (optional)
- ✅ Realtime enabled for tables
- ✅ Full game test passed
- ✅ Victory screen working
- ✅ Monitoring set up

**Congratulations! Your Risk game clone is now live! 🎉**

Share the URL with friends and start playing!
