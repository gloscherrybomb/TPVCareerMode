# Firestore Security Rules Setup

## Overview
The bot profile request system uses Firestore to store submissions from users. These requests are automatically processed and appended to `bot-profile-requests/requests.txt` when race results are processed.

## Deploying Security Rules

### Option 1: Using Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `careermodelogin`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Using Firebase CLI
If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this directory (if not done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## Security Rules Summary

The `firestore.rules` file configures:

### Bot Profile Requests (`botProfileRequests` collection)
- **Create**: Any authenticated user can create a request with their own UID
- **Read**: Users can read their own requests; admins can read all
- **Update/Delete**: Only server-side scripts (no client access)

### Users (`users` collection)
- **Read**: Anyone can read user profiles
- **Write**: Users can only update their own profile; admins can update any

### Standings (`standings` collection)
- **Read**: Anyone can read standings
- **Write**: Only server-side scripts (no client access)

### Bot Profiles (`botProfiles` collection)
- **Read**: Anyone can read bot profiles
- **Write**: Only admins

## Testing

After deploying the rules, test the bot profile request submission:

1. Log in to your website
2. Navigate to a bot in the standings
3. Click "Request Profile"
4. Fill out the form and submit
5. Check your browser console for any errors
6. Verify the request appears in Firestore:
   - Go to Firebase Console → Firestore Database
   - Look for the `botProfileRequests` collection
   - Verify your request is there with `processed: false`

## Troubleshooting

### Error: "Missing or insufficient permissions"
- Security rules not deployed correctly
- Verify rules in Firebase Console
- Check that the user is authenticated

### Error: "User is not authenticated"
- Make sure you're logged in on the website
- Check that Firebase Auth is properly initialized

### Requests not appearing in text file
- Requests are only processed when race results are processed
- Check GitHub Actions logs for processing errors
- Verify the request exists in Firestore with `processed: false`
