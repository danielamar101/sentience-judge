# PostHog Analytics Setup

PostHog has been integrated into the Mirror Arena app for tracking visitor analytics.

## Setup Instructions

### 1. Create a PostHog Account

1. Go to [PostHog Cloud](https://app.posthog.com/signup) or use [PostHog EU Cloud](https://eu.posthog.com/signup)
2. Sign up for a free account (1 million events/month free)
3. Create a new project or use the default project

### 2. Get Your Project API Key

1. In your PostHog dashboard, click on your project
2. Go to **Settings** → **Project** → **Project API Key**
3. Copy your **Project API Key** (starts with `phc_`)

### 3. Configure Environment Variables

Add your PostHog credentials to `.env`:

```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_your_actual_key_here"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"  # or https://eu.posthog.com for EU
```

### 4. Restart Your Development Server

```bash
npm run dev
```

## What's Being Tracked

- Page views (automatically captured on route changes)
- Page leave events
- Session recordings (if enabled in PostHog dashboard)
- Custom events (can be added later)

## Viewing Analytics

1. Log in to [PostHog](https://app.posthog.com)
2. Go to your project dashboard
3. View:
   - **Insights**: Page views, unique visitors, trends
   - **Sessions**: User session recordings
   - **Events**: All captured events
   - **Persons**: Individual user profiles (for identified users)

## Privacy

PostHog is configured with `person_profiles: 'identified_only'` which means:
- Anonymous visitors are tracked without creating person profiles
- Only users who explicitly identify themselves get person profiles
- GDPR and privacy-friendly by default

## Custom Event Tracking (Optional)

To track custom events (like button clicks), use the PostHog hook:

```tsx
import { usePostHog } from 'posthog-js/react'

function MyComponent() {
  const posthog = usePostHog()

  const handleClick = () => {
    posthog?.capture('button_clicked', {
      button_name: 'signup',
      location: 'homepage'
    })
  }

  return <button onClick={handleClick}>Sign Up</button>
}
```

## Disabling Analytics

To disable analytics, simply remove or leave empty the `NEXT_PUBLIC_POSTHOG_KEY` environment variable.
