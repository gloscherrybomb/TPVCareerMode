# Bot Profile Requests

This directory contains bot profile requests submitted by users through the TPV Career Mode website.

## How It Works

1. **User Submission**: Users submit bot profile requests via the profile page on the website
2. **GitHub Issue Created**: The submission creates a GitHub issue with the label `bot-profile-request`
3. **Automated Processing**: A GitHub Actions workflow automatically processes the issue and appends the request to `requests.txt`
4. **Admin Review**: Admins can review the requests file and create bot profiles accordingly

## Files

- `requests.txt` - Contains all submitted bot profile requests in chronological order
- `README.md` - This file, documenting the system

## Request Format

Each request in `requests.txt` contains:
- Timestamp
- GitHub issue number
- User UID (submitter)
- Bot UID
- Bot Name
- Bot ARR
- Bot Country
- Interesting Fact (optional)

## Workflow

The automated workflow is defined in `.github/workflows/submit-bot-profile-request.yml`
