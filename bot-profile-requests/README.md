# Bot Profile Requests

This directory contains bot profile requests submitted by users through the TPV Career Mode website.

## How It Works

1. **User Submission**: Users submit bot profile requests via the profile page modal
2. **Firestore Storage**: Requests are stored in the Firestore `botProfileRequests` collection with `processed: false`
3. **Automated Processing**: When race results are processed, the system checks for pending requests
4. **File Update**: Pending requests are appended to `requests.txt` and marked as processed in Firestore
5. **Admin Review**: Admins review the requests file and create bot profiles accordingly

## Files

- `requests.txt` - Contains all submitted bot profile requests in chronological order
- `README.md` - This file, documenting the system

## Request Format

Each request in `requests.txt` contains:
- Timestamp
- Firestore Document ID
- User UID (submitter)
- Bot UID
- Bot Name
- Bot ARR
- Bot Country
- Interesting Fact

## Processing

Requests are automatically processed by `process-results.js` during race result processing:
- Queries Firestore for unprocessed requests (`processed == false`)
- Appends each request to `requests.txt`
- Marks each request as processed with a `processedAt` timestamp
- Updates are committed to GitHub along with race results

## Security

Firestore security rules ensure:
- Only authenticated users can create requests
- Users can only read their own requests (admins can read all)
- Only the server-side script can mark requests as processed
- All requests must include required fields and start with `processed: false`
