"""GET /api/social -> the latest Timepiece videos for the website carousels, refreshed on its own.

Snapchat: read from the PUBLIC profile page snapchat.com/@timepiece.qa (the page's own JSON), no login and no key.
          Every new Spotlight they post shows up here on the next refresh. Videos play through Snapchat's official embed.
Instagram: Instagram does not show a profile's posts to a server without the owner's permission. When Timepiece connects
          their Instagram (Instagram API with Instagram Login), put the token in the IG_TOKEN environment variable and new
          reels show up on their own too. Until then "instagram.items" is null and the page keeps its hand-picked reels.

Runs as a Vercel Python function (api/social.py) and inside serve.py on localhost. Cached: 15 min in memory locally,
and on Vercel the CDN keeps it 15 min (s-maxage) and serves the old copy while it refreshes."""
import json
import os
import re
import time
import urllib.request
from http.server import BaseHTTPRequestHandler

SNAP_USER = "timepiece.qa"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.8"}
# posts that are not Timepiece stock (a partner's handbags) are left out of the watch carousel
SKIP = re.compile(r"elegance|hermes|hermès|هيرمز|birkin|kelly|بيركن|كيلي", re.I)
TTL = 900
_cache = {"t": 0, "data": None}


def _get(url, timeout=20):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read().decode("utf-8", "replace")


def _clean_caption(text):
    """'Titanium & BMG | Ahmad by timepiece | +974 3035 1113 | 26586xt' -> 'Titanium & BMG · 26586xt'"""
    if not text:
        return ""
    parts = [p.strip() for p in re.split(r"\s*\|\s*", text) if p.strip()]
    # drop the watermark, phone numbers and prices (the site says "Price on request"; prices are given on WhatsApp)
    parts = [p for p in parts if not re.search(r"ahmad by timepiece|snapchat|^\+?\d[\d\s]{7,}$|qar|ريال|سعر", p, re.I)]
    return " · ".join(parts[:2])[:90]


def snapchat():
    html = _get(f"https://www.snapchat.com/@{SNAP_USER}")
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    pp = json.loads(m.group(1))["props"]["pageProps"]
    meta = {}
    for s in pp.get("spotlightStoryMetadata") or []:
        vm = s.get("videoMetadata") or {}
        url = vm.get("contentUrl") or ""
        meta[url] = vm
    items = []
    for h in pp.get("spotlightHighlights") or []:
        sid = (h.get("storyId") or {}).get("value")
        snap = (h.get("snapList") or [{}])[0]
        media = (snap.get("snapUrls") or {}).get("mediaUrl") or ""
        vm = meta.get(media, {})
        cap = vm.get("embeddedTextCaption") or vm.get("name") or ""
        if not sid or SKIP.search(cap):
            continue
        ts = int((snap.get("timestampInSec") or {}).get("value") or 0)
        items.append({
            "id": sid,
            "url": f"https://www.snapchat.com/@{SNAP_USER}/spotlight/{sid}",
            "embed": f"https://www.snapchat.com/spotlight/{sid}/embed",
            "cover": (h.get("thumbnailUrl") or {}).get("value") or vm.get("thumbnailUrl"),
            "caption": _clean_caption(cap),
            "date": time.strftime("%Y-%m-%d", time.gmtime(ts)) if ts else "",
            "views": int(vm.get("viewCount") or 0),
        })
    items.sort(key=lambda x: x["date"], reverse=True)
    return {"profile": f"https://www.snapchat.com/@{SNAP_USER}", "items": items}


def instagram():
    token = os.environ.get("IG_TOKEN", "").strip()
    if not token:
        return {"profile": "https://www.instagram.com/timepiece/", "source": "static", "items": None}
    fields = "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp"
    data = json.loads(_get(f"https://graph.instagram.com/me/media?fields={fields}&limit=24&access_token={token}"))
    items = []
    for p in data.get("data", []):
        code = re.search(r"/(?:reel|p)/([A-Za-z0-9_-]+)", p.get("permalink") or "")
        if p.get("media_type") != "VIDEO" or not code:
            continue
        items.append({"id": code.group(1), "url": p["permalink"], "embed": f"https://www.instagram.com/reel/{code.group(1)}/embed/",
                      "cover": p.get("thumbnail_url"), "caption": (p.get("caption") or "").split("\n")[0][:120],
                      "date": (p.get("timestamp") or "")[:10]})
    return {"profile": "https://www.instagram.com/timepiece/", "source": "api", "items": items}


def feed():
    now = time.time()
    if _cache["data"] and now - _cache["t"] < TTL:
        return _cache["data"]
    out = {"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
    for key, fn in (("snapchat", snapchat), ("instagram", instagram)):
        try:
            out[key] = fn()
        except Exception as e:  # one network failing never breaks the page: the static cards stay
            out[key] = {"items": None, "error": type(e).__name__}
    _cache.update(t=now, data=out)
    return out


def body():
    return json.dumps(feed(), ensure_ascii=False).encode("utf-8")


class handler(BaseHTTPRequestHandler):  # Vercel Python function entry point
    def do_GET(self):
        b = body()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)
