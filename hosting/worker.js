export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetRequest = new Request(new URL(pathname, request.url), request);
    const response = await env.ASSETS.fetch(assetRequest);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }
};
