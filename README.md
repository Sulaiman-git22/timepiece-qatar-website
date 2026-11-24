# Timepiece Qatar · website

Bilingual (English + Arabic) store website for Timepiece Qatar, a rare and luxury watch boutique inside InterContinental Doha Beach.

**Live demo:** https://timepiece-qatar-demo.vercel.app

## What is here
- `index.html` English, `ar/` Arabic, `p/<watch>/` a page per watch (its share image is the watch photo, used in WhatsApp previews)
- `assets/` styles, scripts, fonts and images
- `api/social.py` serverless function that keeps the Snapchat carousel up to date (Instagram once the account is connected)
- `vercel.json`, `robots.txt`, `blocked.html` security headers and AI-crawler blocking for Vercel

## Run locally
```
python -m http.server 5098
```
then open http://127.0.0.1:5098 (the live social feed needs Vercel or a server that runs `api/social.py`).
