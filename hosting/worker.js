const COMMIT = "9eed48a05a60fc0c078878bed0aa29017b4b64d3";
const CDN_BASE = "https://cdn.jsdelivr.net/gh/immortalchorus/road-to-solareth@" + COMMIT;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png"
};

function contentType(pathname) {
  const match = pathname.match(/\.[a-z0-9]+$/i);
  return match ? MIME_TYPES[match[0].toLowerCase()] || "application/octet-stream" : "application/octet-stream";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    if (!["/index.html", "/style.css", "/main.js", "/assets/mountain-panorama.png"].includes(pathname)) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = await fetch(CDN_BASE + pathname);
    if (!upstream.ok) return new Response("Asset unavailable", { status: 502 });

    const headers = new Headers(upstream.headers);
    headers.set("content-type", contentType(pathname));
    headers.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
