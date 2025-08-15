# Automatic Email Tool

A simple way to send emails right now or schedule them for later.

It runs entirely on AWS. When you hit the API, you can either send the email instantly or tell it exactly when to go out. AWS stores and delivers through SES.

Why it’s useful:

- Works 24/7 without you running anything

- Handles both plain text and HTML

- Requires virtually no resources to keep live

Example funcitons:

# Send now
curl -X POST "https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/email" \
  -H "Content-Type: application/json" \
  -d '{"to":["me@example.com"],"subject":"Hello","text":"Test"}'

# Schedule for later
curl -X POST "https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/schedule" \
  -H "Content-Type: application/json" \
  -d '{"sendAt":"2025-08-15T16:00:00-04:00","to":["me@example.com"],"subject":"Reminder","text":"This will send later"}'

Once it's deployed, it's always ready.
