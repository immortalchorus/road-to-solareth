import { copyFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative } from "node:path";

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

const binaryTypes = {
  ".jpg": "image/jpeg",
  ".mtl": "text/plain; charset=utf-8",
  ".obj": "text/plain; charset=utf-8",
  ".png": "image/png"
};
const assetFiles = (await readdir("assets", { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && binaryTypes[extname(entry.name).toLowerCase()])
  .map(entry => relative(process.cwd(), `${entry.parentPath}/${entry.name}`).replaceAll("\\", "/"));
const binaryEntries = await Promise.all(assetFiles.map(async file => {
  const route = `/${file}`;
  const type = binaryTypes[extname(file).toLowerCase()];
  const body = (await readFile(file)).toString("base64");
  return `  ${JSON.stringify(route)}: { type: ${JSON.stringify(type)}, body: ${JSON.stringify(body)} }`;
}));

const worker = `const TEXT_DECODER = new TextDecoder();
const TEXT_ASSETS = {
${entries.join(",\n")}
};
const BINARY_ASSETS = {
${binaryEntries.join(",\n")}
};
const AUDIO_SOURCE = "https://raw.githubusercontent.com/immortalchorus/road-to-solareth/main";

function decodeText(base64) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return TEXT_DECODER.decode(bytes);
}

function decodeBinary(base64) {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname === "" ? "/" : url.pathname;
    if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
    const asset = TEXT_ASSETS[pathname];
    if (asset) {
      return new Response(decodeText(asset.body), {
        headers: { "content-type": asset.type, "cache-control": "no-store" }
      });
    }
    const binaryAsset = BINARY_ASSETS[pathname];
    if (binaryAsset) {
      return new Response(decodeBinary(binaryAsset.body), {
        headers: { "content-type": binaryAsset.type, "cache-control": "public, max-age=3600" }
      });
    }
    if (pathname.startsWith("/assets/") && pathname.endsWith(".mp3")) {
      return Response.redirect(AUDIO_SOURCE + pathname, 302);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
};
`;

await mkdir("hosting", { recursive: true });
await mkdir("dist/server", { recursive: true });
await writeFile("hosting/worker.js", worker);
await writeFile("dist/server/index.js", worker);
await Promise.all(["index.html", "style.css", "main.js"].map(file => copyFile(file, `dist/${file}`)));
await cp("assets", "dist/assets", { recursive: true, force: true });
console.log("Built hosted game bundle.");
