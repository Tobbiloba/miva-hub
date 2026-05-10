# Askly Capture — Volunteer Guide

## What is Askly Capture?

Askly Capture is a Chrome extension that lets MIVA University students help build the Askly AI study assistant by capturing lesson content from the MIVA LMS. When you visit a lesson page on the LMS, the extension detects videos and PDFs, and lets you submit them to Askly with one click.

**You're essentially helping your fellow students** — the content you capture powers the AI that helps everyone study better.

## What data we collect

When you capture a lesson, we send to Askly's servers:

- **The lesson page URL** (e.g., `lms.miva.university/mod/page/view.php?id=15671`)
- **Detected content**: Vimeo video ID or PDF download URL
- **Metadata you confirm**: course code, week number, lesson title, session/cohort
- **Your Askly user ID** (so we can credit your contribution)

We do **not** collect:
- Your LMS login credentials
- Your browsing history on other sites
- Any personal information beyond your Askly account
- Content from pages you don't explicitly capture

All captured content goes through an **admin review queue** before being made available to students. Nothing you capture is published automatically.

## Installation

### Step 1: Get the extension files

Download the extension folder from the repository (or get the zip from your team lead):

```
askly-capture/
├── manifest.json
├── background.js
├── content-script.js
├── popup.html, popup.js, popup.css
├── options.html, options.js
└── icons/
```

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `askly-capture` folder (the one containing `manifest.json`)
5. The Askly Capture icon should appear in your Chrome toolbar

> **Tip**: Pin the extension by clicking the puzzle icon in the toolbar and pinning "Askly Capture".

### Step 3: Log in to Askly

1. Click the Askly Capture icon in the toolbar
2. Click **"Login to Askly"** — this opens the settings page
3. Enter your MIVA email (`you@miva.edu.ng`) and Askly password
4. Click **Login**
5. You should see your name and a "Logged in" confirmation

> **Note**: You must have volunteer access enabled on your Askly account. Ask your admin if you see a "Volunteer access required" error.

### Step 4 (Dev only): Set API URL

If you're testing against a local development server:

1. Open the extension settings (gear icon in popup, or right-click extension → Options)
2. In the **API URL** field, enter `http://localhost:3000`
3. Click **Save**

Leave this blank for production use — it defaults to the live Askly server.

## How to capture a lesson

### 1. Navigate to a MIVA lesson page

Go to the LMS and open a specific lesson page. These are typically URLs like:
```
https://lms.miva.university/mod/page/view.php?id=15671
```

The extension works on pages that contain:
- A **Vimeo video** (embedded iframe)
- A **PDF link** (hosted on `lms-assets.miva.university`)

### 2. Click the Askly Capture icon

The popup will show:
- **Content type** detected (VIDEO or PDF badge)
- **Course code** (auto-detected from the page, e.g., COS102)
- **Week number** (if detected)
- **Lesson title** (from the page heading)
- **Session/Cohort** (e.g., "September Cohort 2025")

### 3. Verify and correct the detected info

The extension does its best to auto-detect everything, but it can get things wrong. Please verify:

- **Course code**: Make sure this is correct (e.g., COS102, not COS101)
- **Week number**: Fill this in if it wasn't detected
- **Lesson title**: Clean up if it includes extra text
- **Session**: Fill in if not detected (e.g., "September Cohort 2025")

### 4. Hit "Capture this lesson"

Click the button and wait for confirmation. You'll see:
- **"Captured! Job ID: abc123..."** — Success! The content is queued for processing.
- An error message if something went wrong (see Troubleshooting below).

### 5. Check status

Your recent captures appear at the bottom of the popup with status badges:
- **Queued** — Waiting to be processed
- **Downloading** — Content is being downloaded to Askly's servers
- **Completed** — Content downloaded and ready for admin review
- **Failed** — Something went wrong (hover for details)

## Troubleshooting

### "Volunteer access required" error
Your Askly account needs volunteer access. Contact your admin to enable it.

### "Course 'XXX' not found" error
The course code detected by the extension doesn't match any course in Askly's database. Double-check the course code and correct it manually in the popup before capturing.

### Extension doesn't detect anything
- Make sure you're on a **lesson page** (not a course outline or dashboard)
- The page must contain a Vimeo iframe or a PDF link on `lms-assets.miva.university`
- Try refreshing the page and clicking the extension again
- Some pages may have content loaded dynamically — wait a few seconds after the page loads

### "Not logged in" or authentication errors
- Open the extension settings and log in again
- If using a local dev server, make sure the API URL is set correctly
- Clear extension storage: right-click extension icon → "Options" → log out and log in again

### Extension icon is grayed out
- The extension only activates on `lms.miva.university` pages
- Make sure you're on the MIVA LMS, not a different site

## FAQ

**Q: Can I capture the same lesson twice?**
A: Yes, but the admin may reject duplicates during moderation.

**Q: Do I need to stay on the page while it processes?**
A: No. Once you see "Captured!", the job is queued on the server. You can close the tab.

**Q: Can I capture content from other LMS platforms?**
A: No, v1 only supports MIVA's LMS (lms.miva.university).

**Q: Who can see the content I capture?**
A: Only admins see it in the moderation queue. It becomes visible to students only after an admin approves it.

**Q: How do I report a bug?**
A: Open an issue at https://github.com/Tobbiloba/miva-hub/issues with the label `extension-bug`. Include:
- The LMS page URL
- What you expected to happen
- What actually happened
- A screenshot if possible

## Thank you!

Every lesson you capture helps your fellow MIVA students study better with AI. Your contributions are tracked and credited — thank you for volunteering!
