# Bot Profile Request System - Setup Guide

## Overview
Bot profile requests are now stored in GitHub as a text file (`bot-profile-requests/requests.txt`). When users submit a request through the modal, it creates a GitHub issue via the API, which automatically triggers a workflow that appends the request to the text file.

## Setup Steps

### 1. Create a GitHub Personal Access Token (Fine-Grained)
You need to create a token that allows the website to create issues:

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Configure the token:
   - **Token name**: TPV Career Mode Bot Profile Requests
   - **Expiration**: Choose "No expiration" or set a far future date (you'll need to update it when it expires)
   - **Description**: Token for creating bot profile request issues
   - **Repository access**: Select "Only select repositories" → Choose `gloscherrybomb/TPVCareerMode`
   - **Permissions**:
     - Repository permissions → Issues → Access: **Read and write**
     - All other permissions: None/Read-only
4. Click "Generate token"
5. **IMPORTANT**: Copy the token (starts with `github_pat_...`)
6. Open `profile.js` and replace `YOUR_GITHUB_TOKEN_HERE` with your actual token on line 1011

**Security Note**: This token will be visible in the public source code. That's why we're using a fine-grained token with ONLY permission to create issues in this specific repository. The worst someone can do is create spam issues, which you can delete.

### 2. Create the `bot-profile-request` Label
You need to create a label in your GitHub repository:

1. Go to https://github.com/gloscherrybomb/TPVCareerMode/labels
2. Click "New label"
3. Enter the following details:
   - **Name**: `bot-profile-request`
   - **Description**: Bot profile requests submitted by users
   - **Color**: Choose any color (e.g., `#0075ca` for blue)
4. Click "Create label"

### 3. Enable GitHub Issues
Make sure GitHub Issues are enabled for your repository:

1. Go to https://github.com/gloscherrybomb/TPVCareerMode/settings
2. Scroll to the "Features" section
3. Ensure "Issues" is checked

### 4. Test the System
1. Commit and push all the changes
2. Go to your profile page on the website
3. Find a bot in the standings and click "Request Profile"
4. Fill out the form and click submit
5. Check the success message
6. Go to your GitHub repository's Issues tab
7. Verify the issue was created with the `bot-profile-request` label
8. The workflow will automatically:
   - Append the request to `bot-profile-requests/requests.txt`
   - Add a comment to the issue confirming it was recorded
   - Commit and push the changes

## How It Works

### User Flow
1. User fills out bot profile request form on website
2. User clicks "Submit" in the modal
3. JavaScript creates a GitHub issue via the API
4. User sees success message
5. Request is automatically saved to text file via GitHub Actions

### Automated Processing
- Workflow: `.github/workflows/submit-bot-profile-request.yml`
- Trigger: When an issue is opened with the `bot-profile-request` label
- Action: Extracts data from issue, appends to `requests.txt`, commits and pushes

### Request File
- Location: `bot-profile-requests/requests.txt`
- Format: Human-readable text with clear separators
- Each request includes: timestamp, issue number, user UID, bot details

## Troubleshooting

### Issue: "Error submitting request" message
- Check browser console (F12) for specific error
- Verify the GitHub token is correctly set in `profile.js`
- Test the token by making a manual API call
- Check if the token has expired

### Issue: 401 Unauthorized error
- Token is invalid or expired
- Create a new token and update `profile.js`

### Issue: 403 Forbidden error
- Token doesn't have permission to create issues
- Recreate the token with "Issues: Read and write" permission

### Issue: Workflow doesn't run
- Check that the `bot-profile-request` label exists
- Check that the issue has the label applied
- Check GitHub Actions tab for any errors

### Issue: Workflow fails
- Check the Actions tab for error details
- Ensure the workflow has write permissions to the repository

## Maintenance

### Reviewing Requests
Simply open `bot-profile-requests/requests.txt` to see all requests in chronological order.

### Processing a Request
After creating a bot profile:
1. Close the associated GitHub issue
2. Optionally add a comment with the profile URL
