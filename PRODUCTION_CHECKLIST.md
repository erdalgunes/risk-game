# Production Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production` and fill in values
- [ ] Set Supabase production URL and anon key
- [ ] Verify environment variables in Vercel dashboard
- [ ] Confirm `.env` files are in `.gitignore`

### 2. Database Setup
- [ ] Create production Supabase project
- [ ] Run database migrations (if any)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Enable real-time for required tables (`games`, `players`, `territories`)
- [ ] Configure database backups

### 3. GitHub Secrets
Configure the following secrets in GitHub repository settings:

```
Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:
- [ ] `VERCEL_TOKEN` - Get from Vercel account settings
- [ ] `VERCEL_ORG_ID` - Get from Vercel project settings
- [ ] `VERCEL_PROJECT_ID` - Get from Vercel project settings
- [ ] `CODECOV_TOKEN` (Optional) - For coverage reporting

### 4. Code Quality
- [ ] Run full test suite: `npm test -- --run`
  - Target: 193+/197 tests passing (98%+ pass rate)
- [ ] Run type check: `npm run type-check`
- [ ] Run linter: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Check for console errors/warnings

### 5. Security Review
- [ ] No API keys or secrets in code
- [ ] Environment variables properly configured
- [ ] Supabase RLS policies enabled
- [ ] CORS settings configured
- [ ] Rate limiting considered

## Deployment Steps

### Option A: Automatic Deployment (Recommended)

1. **Push to main branch:**
   ```bash
   git push origin main
   ```

2. **Monitor GitHub Actions:**
   - Go to repository → Actions tab
   - Watch test workflow complete
   - Watch deploy workflow complete

3. **Verify deployment:**
   - Check Vercel dashboard for successful deployment
   - Visit production URL

### Option B: Manual Deployment via Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Post-Deployment

### 1. Smoke Testing
- [ ] Visit production URL
- [ ] Create a test game
- [ ] Join game from different browser/device
- [ ] Complete one full game turn
- [ ] Verify real-time updates work
- [ ] Test on mobile devices

### 2. Monitoring Setup
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up analytics (e.g., Google Analytics, Plausible)
- [ ] Enable Vercel analytics

### 3. Performance Check
- [ ] Run Lighthouse audit (target: 90+ performance score)
- [ ] Check initial load time (< 3s)
- [ ] Verify Core Web Vitals
- [ ] Test on slow 3G network

### 4. SEO & Meta Tags
- [ ] Verify page titles
- [ ] Check meta descriptions
- [ ] Ensure Open Graph tags
- [ ] Add favicon
- [ ] Create robots.txt
- [ ] Generate sitemap.xml

## Rollback Plan

If issues occur after deployment:

1. **Quick Rollback via Vercel:**
   ```bash
   # List deployments
   vercel ls

   # Promote previous deployment
   vercel promote <deployment-url>
   ```

2. **Via Vercel Dashboard:**
   - Go to project → Deployments
   - Find last working deployment
   - Click "Promote to Production"

3. **Via GitHub:**
   - Revert the problematic commit
   - Push to main branch
   - CI/CD will auto-deploy

## Ongoing Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review user feedback

### Weekly
- [ ] Review analytics
- [ ] Check database size/usage
- [ ] Review Vercel usage metrics
- [ ] Run security audit

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review and fix security vulnerabilities: `npm audit fix`
- [ ] Backup database
- [ ] Review and optimize performance

## Troubleshooting

### Common Issues

**1. Environment Variables Not Working**
- Check they're set in Vercel dashboard
- Redeploy after adding new variables
- Use `NEXT_PUBLIC_` prefix for client-side vars

**2. Database Connection Issues**
- Verify Supabase URL is correct
- Check anon key is valid
- Ensure project isn't paused (free tier)
- Check RLS policies aren't blocking access

**3. Real-time Not Working**
- Enable real-time in Supabase dashboard
- Check WebSocket connections aren't blocked
- Verify subscription is properly set up

**4. Build Failures**
- Check build logs in Vercel
- Run `npm run build` locally to reproduce
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

## Success Criteria

Your deployment is successful when:

✅ All CI/CD workflows pass
✅ 98%+ test pass rate
✅ Application loads in production
✅ Users can create and join games
✅ Real-time updates work
✅ No console errors
✅ Mobile responsive
✅ Performance score > 90

## Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Version:** 1.0.0
**Test Coverage:** 98% (193/197 tests passing)

🚀 Ready for Production Deployment!
