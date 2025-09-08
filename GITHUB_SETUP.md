# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `content-request-app`
3. Description: `Content Request Application with Microsoft Authentication`
4. Make it **Public** (required for Azure Static Web Apps free tier)
5. Do NOT initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Get Repository URL

After creating the repository, GitHub will show you the repository URL. It will look like:
`https://github.com/YOUR_USERNAME/content-request-app.git`

## Step 3: Add Remote and Push

Once you have the repository URL, run these commands in the terminal:

```bash
cd content-request-app
git remote add origin https://github.com/YOUR_USERNAME/content-request-app.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 4: Automatic Deployment

Once you push the code, Azure Static Web Apps will automatically deploy your application because we have the GitHub Actions workflow configured in `.github/workflows/azure-static-web-apps.yml`.

The deployment will create a public URL that you can share with others.

## Next Steps

After pushing to GitHub:
1. Check GitHub Actions tab in your repository to monitor the deployment
2. The deployment will provide a public URL for your application
3. Add this URL to your Azure AD app registration redirect URIs
4. Test the application with the live URL
