# **App Name**: GeminiClipper

## Core Features:

- Video Upload UI: Accepts video file uploads up to 1 hour in length through a user interface.
- Video Upload API: Accepts video file uploads up to 1 hour in length via API calls.
- AI Scene Detection: Leverages Gemini 2.5 Flash tool to analyze uploaded videos, identifying key scenes based on video content.
- Scene Review & Edit: Provides an interface for users to review and adjust automatically detected scenes. Timestamps can be manually edited.
- Efficient Video Clipping: Accurately extracts user-specified video scenes without re-encoding, minimizing processing time and preserving quality.
- Secure Clip Delivery: Generates secure, time-limited URLs for accessing the processed video clips.
- Cloud Native Deployment: Designed to run as a serverless application using Cloud Run Jobs on Google Cloud, optimizing cost-efficiency and scalability.

## Style Guidelines:

- Primary color: Deep Indigo (#4B0082) to evoke intelligence, focus, and high-tech innovation.
- Background color: Very light gray (#F0F0F0), near white, to keep the focus on the video content and timestamps
- Accent color: Bright Purple (#DA70D6) for interactive elements, highlights, and calls to action. It complements the indigo, creating visual interest.
- Headline font: 'Space Grotesk' sans-serif. The scientific feel suits the use of LLMs, while it is clean and suitable for a headline.
- Body font: 'Inter' sans-serif; it supports a wide array of glyphs/languages, is very readable, and won't distract from the video.
- Minimalist icons, line-based icons. Focused on clear representation of actions (play, pause, clip, download). Icons should be the purple accent color for emphasis.
- Clean and intuitive layout, placing key video controls front and center. Ample spacing around interactive elements, maximizing ease of use and accessibility.