import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const textAssets = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/style.css", "style.css", "text/css; charset=utf-8"],
  ["/main.js", "main.js", "application/javascript; charset=utf-8"]
];

const entries = await Promise.all(textAssets.map(async ([route, file, type]) => {
  const body = (await readFile(file)).toString("base64");
  return `  ${JSON.stringify(route)}: { type: ${JSON.stringify(type)}, body: ${JSON.stringify(body)} }`;
}));

const worker = `const TEXT_DECODER = new TextDecoder();
const TEXT_ASSETS = {
${entries.join(",\n")}
};

function decodeText(base64) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return TEXT_DECODER.decode(bytes);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "" ? "/" : url.pathname;
    if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
    const asset = TEXT_ASSETS[pathname];
    if (asset) {
      return new Response(decodeText(asset.body), {
        headers: { "content-type": asset.type, "cache-control": "no-store" }
      });
    }
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
};
`;

await mkdir("hosting", { recursive: true });
await mkdir("dist/server", { recursive: true });
await writeFile("hosting/worker.js", worker);
await writeFile("dist/server/index.js", worker);
await Promise.all(["index.html", "style.css", "main.js"].map(file => copyFile(file, `dist/${file}`)));
console.log("Built hosted game bundle.");
