import fs from "node:fs";

const [sourcePath, destinationPath] = process.argv.slice(2);
if (!sourcePath || !destinationPath) {
  throw new Error("Usage: node convert-asc-to-obj.mjs source.asc destination.obj");
}

const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
const objects = [];
let current = null;

for (const line of lines) {
  const objectMatch = line.match(/^Named object: "(.+)"/);
  if (objectMatch) {
    current = { name: objectMatch[1], vertices: [], faces: [] };
    objects.push(current);
    continue;
  }
  if (!current) continue;

  const vertexMatch = line.match(/^Vertex \d+:\s+X:([-\d.]+)\s+Y:([-\d.]+)\s+Z:([-\d.]+)/);
  if (vertexMatch) {
    const [, sourceX, sourceY, sourceZ] = vertexMatch.map(Number);
    current.vertices.push([sourceY, sourceZ, sourceX]);
    continue;
  }

  const faceMatch = line.match(/^Face \d+:\s+A:(\d+) B:(\d+) C:(\d+)/);
  if (faceMatch) current.faces.push(faceMatch.slice(1).map(Number));
}

let vertexOffset = 1;
const output = ["# Converted from 3D Studio ASCII for HOVERTANK"];
for (const object of objects) {
  output.push(`o ${object.name}`);
  for (const vertex of object.vertices) output.push(`v ${vertex.join(" ")}`);
  for (const face of object.faces) {
    output.push(`f ${face.map(index => index + vertexOffset).join(" ")}`);
  }
  vertexOffset += object.vertices.length;
}

fs.writeFileSync(destinationPath, `${output.join("\n")}\n`);
console.log(`Converted ${objects.length} objects, ${vertexOffset - 1} vertices.`);
