# Azure Static Web Apps Build Monitoring & Troubleshooting

## 🚨 Current Status: BUILD FAILURES DETECTED

**Issue:** All recent Azure Static Web Apps deployments are failing
**Impact:** Site continues serving old cached content from last successful deployment
**Root Cause:** Unknown build errors preventing successful deployment

## 📊 Build Failure Pattern

| Commit | Timestamp | Status | Duration | Notes |
|--------|-----------|--------|----------|-------|
| e48dc86 | Sep 17 21:08 | ❌ FAILED | 1m 3s | Emergency deployment fix attempt |
| c96c922 | Sep 17 20:57 | ❌ FAILED | 1m 4s | Merge conflict resolution |
| 0ef12a9 | Sep 17 20:27 | ❌ FAILED | 1m 13s | Previous attempt |

## 🔍 How to Monitor Build Status

### 1. GitHub Actions Dashboard
- **URL:** https://github.com/AbbyMSFT/content-request-app/actions
- **Look for:** 
  - ✅ Green checkmark = Success
  - ❌ Red X = Failed (current issue)
  - 🟡 Yellow circle = In progress

### 2. Set Up Email Notifications
```bash
# In GitHub repository settings:
1. Go to Settings > Notifications
2. Enable "Actions" notifications
3. Choose "Email" for failed workflows
```

### 3. Azure Portal Monitoring
- Check Azure Static Web Apps deployment logs
- Set up Azure Monitor alerts for deployment failures

## 🛠️ Troubleshooting Build Failures

### Common Azure Static Web Apps Build Issues:

1. **Node.js Version Mismatch**
   - Azure may use different Node version than local
   - Solution: Specify Node version in package.json engines

2. **Missing Environment Variables**
   - Build-time variables not available in Azure
   - Solution: Configure in Azure Static Web Apps settings

3. **Build Dependencies**
   - Missing or incompatible packages
   - Solution: Check package.json and lock files

4. **File Path Issues**
   - Case sensitivity differences between local/Azure
   - Solution: Verify import paths and file names

5. **Build Script Failures**
   - TypeScript errors, linting issues, etc.
   - Solution: Run `npm run build` locally to reproduce

## ⚡ Immediate Actions Needed

1. **Get detailed build logs** (requires GitHub sign-in)
2. **Test local build** with `npm run build`
3. **Fix identified issues**
4. **Set up monitoring** to catch future failures
5. **Create backup deployment strategy**

## 📧 Notification Setup Template

```yaml
# .github/workflows/notify-on-failure.yml
name: Notify on Build Failure
on:
  workflow_run:
    workflows: ["Azure Static Web Apps CI/CD"]
    types: [completed]

jobs:
  notify:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: echo "BUILD FAILED - Check logs immediately"
```

## 🎯 Success Criteria

✅ Build succeeds without errors
✅ Deployment completes successfully  
✅ Site shows latest code (no cached content)
✅ Notifications work for future failures
✅ Clear troubleshooting process established
