![Social Media Scheduler Image](https://social-media-scheduler.jdge.cc/images/Wiki_Image.png)

# Social Media Scheduler

A simple DIY scheduler for 1 post/day across Instagram, Facebook, Pinterest, and X (Twitter). Built with HTML/JS frontend on Cloudflare Pages + Workers backend for cron-scheduled posting via APIs.

## Features
- Queue posts with text, image URLs, and dates.
- Visual calendar preview.
- Auto-posts daily via Cloudflare Cron Triggers.
- Free tier APIs only—no subs.

## Setup
1. Get API keys: [X Dev Portal](https://developer.x.com), [Pinterest Devs](https://developers.pinterest.com), [Meta for Developers](https://developers.facebook.com) (need FB Page + IG Business account).
2. Deploy frontend to Cloudflare Pages (already synced).
3. Set up Worker (see below) and bind KV for queues.
4. Add your tokens to Worker env vars.

## Platforms & Limits
| Platform | API Endpoint | Free Limits | Notes |
|----------|--------------|-------------|-------|
| **X** | POST /2/tweets | 500 posts/mo | OAuth 2.0; threads/polls ok. |
| **Pinterest** | POST /v5/pins | 1k calls/day | OAuth; direct pins to boards. |
| **Facebook** | POST /{page-id}/feed | No hard cap (rate ~200/hr) | Page access token; needs Page role. |
| **Instagram** | POST /{ig-user-id}/media | No hard cap | Graph API; Business/Creator account required—no consumer profiles. |

## Run Locally
Open `index.html` in browser. For full test, deploy Worker.

## Todo
- Add image upload (base64 to KV).
- Error retries.
- Multi-user auth.

Built Oct 2025. Questions? @ your GitHub issues.