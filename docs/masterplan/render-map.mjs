import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const world = JSON.parse(readFileSync(join(root, "world.json"), "utf8"));

const errors = [];
const bounds = world.bounds;
const inside = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
const areaOverlap = (a, b) => {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  return w > 1 && h > 1 ? w * h : 0;
};

for (let i = 0; i < world.districts.length; i += 1) {
  const district = world.districts[i];
  if (district.x0 < bounds.x0 || district.x1 > bounds.x1 || district.z0 < bounds.z0 || district.z1 > bounds.z1) {
    errors.push(`${district.id} leaves the world`);
  }
  for (let j = i + 1; j < world.districts.length; j += 1) {
    const other = world.districts[j];
    const area = areaOverlap(district, other);
    if (area > 0) errors.push(`${district.id} overlaps ${other.id} by ${Math.round(area)} m²`);
  }
}

const byId = new Map(world.districts.map((district) => [district.id, district]));
for (const mark of world.landmarks) {
  const district = byId.get(mark.district);
  if (!district) errors.push(`${mark.id} has no district`);
  else if (mark.x < district.x0 || mark.x > district.x1 || mark.z < district.z0 || mark.z > district.z1) {
    errors.push(`${mark.id} is outside ${mark.district}`);
  }
  if (!inside(mark.x, mark.z)) errors.push(`${mark.id} is outside the world`);
}

const anchor = world.prototypeAnchor;
const playable = { x0: anchor.worldX - 48, x1: anchor.worldX + 48, z0: anchor.worldZ - 24, z1: anchor.worldZ + 38 };
const marina = byId.get("marina");
if (areaOverlap(playable, { x0: marina.x0 - 1, x1: marina.x1 + 1, z0: marina.z0 - 1, z1: marina.z1 + 1 }) === 0) {
  errors.push("playable marina is outside the Marina District");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const mapW = 1280;
const mapH = (mapW * (bounds.z1 - bounds.z0)) / (bounds.x1 - bounds.x0);
const padL = 56;
const padT = 72;
const padR = 280;
const padB = 48;
const width = padL + mapW + padR;
const height = padT + mapH + padB;
const scale = mapW / (bounds.x1 - bounds.x0);
const X = (x) => padL + (x - bounds.x0) * scale;
const Y = (z) => padT + (bounds.z1 - z) * scale;
const poly = (points) => points.map(([x, z]) => `${X(x).toFixed(1)},${Y(z).toFixed(1)}`).join(" ");

const fill = {
  downtown: "#7d8b99",
  brickell: "#8aa0b5",
  palm: "#9aaf78",
  azure: "#d7c0a0",
  ocean: "#efd3b4",
  marina: "#8fbfb6",
  port: "#b3a89a",
  bayview: "#7eae86",
};

const roadStroke = {
  freeway: { color: "#1e2428", width: 36 },
  boulevard: { color: "#3c4650", width: 22 },
  bridge: { color: "#14181c", width: 18 },
  beach: { color: "#5c5348", width: 16 },
  street: { color: "#4e575f", width: 12 },
  residential: { color: "#6a6258", width: 10 },
  service: { color: "#7a756c", width: 8 },
  alley: { color: "#8a847c", width: 6 },
};

const lines = [];
const road = (roadClass, points) => {
  const style = roadStroke[roadClass];
  lines.push(
    `<polyline points="${poly(points)}" fill="none" stroke="${style.color}" stroke-width="${(style.width * scale).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`,
  );
};

for (const district of world.districts) {
  lines.push(
    `<rect x="${X(district.x0).toFixed(1)}" y="${Y(district.z1).toFixed(1)}" width="${((district.x1 - district.x0) * scale).toFixed(1)}" height="${((district.z1 - district.z0) * scale).toFixed(1)}" fill="${fill[district.id]}" fill-opacity="0.55"/>`,
  );
}

lines.push(
  `<rect x="${X(world.water.atlantic.x0).toFixed(1)}" y="${Y(world.water.atlantic.z1).toFixed(1)}" width="${((world.water.atlantic.x1 - world.water.atlantic.x0) * scale).toFixed(1)}" height="${((world.water.atlantic.z1 - world.water.atlantic.z0) * scale).toFixed(1)}" fill="#1b6d90"/>`,
);
lines.push(`<polygon points="${poly(world.water.bay)}" fill="#2f9eb4"/>`);
lines.push(`<polygon points="${poly(world.water.northInlet)}" fill="#1b6d90"/>`);
lines.push(`<polygon points="${poly(world.water.portChannel)}" fill="#1b6d90"/>`);
for (const canal of world.water.canals) {
  if (canal.z !== undefined) {
    lines.push(
      `<line x1="${X(canal.x0).toFixed(1)}" y1="${Y(canal.z).toFixed(1)}" x2="${X(canal.x1).toFixed(1)}" y2="${Y(canal.z).toFixed(1)}" stroke="#248f96" stroke-width="${(canal.width * scale).toFixed(2)}" stroke-linecap="square"/>`,
    );
  } else {
    lines.push(
      `<line x1="${X(canal.x).toFixed(1)}" y1="${Y(canal.z0).toFixed(1)}" x2="${X(canal.x).toFixed(1)}" y2="${Y(canal.z1).toFixed(1)}" stroke="#248f96" stroke-width="${(canal.width * scale).toFixed(2)}" stroke-linecap="square"/>`,
    );
  }
}
lines.push(`<polygon points="${poly(world.islands.barrier)}" fill="#e4d3b4" stroke="#c6b496" stroke-width="1"/>`);
lines.push(`<polygon points="${poly(world.islands.northCay)}" fill="#d5e4c4" stroke="#b7c8a4" stroke-width="1"/>`);
for (const district of world.districts.filter((item) => item.id === "ocean" || item.id === "bayview")) {
  lines.push(
    `<clipPath id="clip-${district.id}"><rect x="${X(district.x0).toFixed(1)}" y="${Y(district.z1).toFixed(1)}" width="${((district.x1 - district.x0) * scale).toFixed(1)}" height="${((district.z1 - district.z0) * scale).toFixed(1)}"/></clipPath>`,
  );
}
lines.push(`<polygon points="${poly(world.islands.barrier)}" fill="${fill.ocean}" fill-opacity="0.45" clip-path="url(#clip-ocean)"/>`);
lines.push(`<polygon points="${poly(world.islands.northCay)}" fill="${fill.bayview}" fill-opacity="0.5" clip-path="url(#clip-bayview)"/>`);

for (const item of world.roads) road(item.class, item.points);
for (const grid of world.grids) {
  if (grid.spacing) {
    for (let x = grid.x0; x <= grid.x1 + 0.1; x += grid.spacing) road(grid.class, [[x, grid.z0], [x, grid.z1]]);
    for (let z = grid.z0; z <= grid.z1 + 0.1; z += grid.spacing) road(grid.class, [[grid.x0, z], [grid.x1, z]]);
  } else {
    for (const x of grid.verticalX) road(grid.class, [[x, grid.z0], [x, grid.z1]]);
    for (const z of grid.horizontalZ) road(grid.class, [[grid.x0, z], [grid.x1, z]]);
  }
}

lines.push(
  `<rect x="${X(playable.x0).toFixed(1)}" y="${Y(playable.z1).toFixed(1)}" width="${((playable.x1 - playable.x0) * scale).toFixed(1)}" height="${((playable.z1 - playable.z0) * scale).toFixed(1)}" fill="none" stroke="#9a3412" stroke-width="2"/>`,
);

const nudge = {
  helion: [8, 14],
  civic: [8, -10],
  "meridian-residences": [8, 14],
  "grove-market": [10, 16],
  "azure-lock": [8, -10],
  "lantern-hotel": [8, -10],
  "east-pier": [8, 14],
  "marina-office": [-92, 4],
  "harbor-light": [8, -12],
  "port-beacon": [8, 14],
  "bayview-shell": [8, 14],
  "central-bascule": [8, 18],
};
for (const mark of world.landmarks) {
  const shift = nudge[mark.id] ?? [8, -8];
  lines.push(`<circle cx="${X(mark.x).toFixed(1)}" cy="${Y(mark.z).toFixed(1)}" r="4.5" fill="#9a3412" stroke="#fffaf3" stroke-width="1"/>`);
  lines.push(
    `<text x="${(X(mark.x) + shift[0]).toFixed(1)}" y="${(Y(mark.z) + shift[1]).toFixed(1)}" font-size="11" fill="#7a2e10">${mark.name}</text>`,
  );
}
lines.push(
  `<text x="${(X(-1750) + 8).toFixed(1)}" y="${Y(400).toFixed(1)}" font-size="12" fill="#1e2428" transform="rotate(-90 ${X(-1750).toFixed(1)} ${Y(400).toFixed(1)})">Coast Highway</text>`,
);
lines.push(
  `<text x="${X(-2500).toFixed(1)}" y="${(Y(-1850) - 6).toFixed(1)}" font-size="12" fill="#1e2428">Port Expressway</text>`,
);
lines.push(`<text x="${X(1680).toFixed(1)}" y="${(Y(-900)).toFixed(1)}" font-size="12" fill="#3f3a34">Lantern Road</text>`);

for (let x = bounds.x0; x <= bounds.x1; x += 800) {
  lines.push(
    `<line x1="${X(x).toFixed(1)}" y1="${Y(bounds.z0).toFixed(1)}" x2="${X(x).toFixed(1)}" y2="${Y(bounds.z1).toFixed(1)}" stroke="#1c1915" stroke-opacity="0.08"/>`,
  );
  lines.push(
    `<text x="${X(x).toFixed(1)}" y="${(Y(bounds.z0) + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="#3f3a34">${x}</text>`,
  );
}
for (let z = bounds.z0; z <= bounds.z1; z += 800) {
  lines.push(
    `<text x="${(padL - 8).toFixed(1)}" y="${(Y(z) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#3f3a34">${z}</text>`,
  );
}

const label = (text, x, z, size = 13) =>
  `<text x="${X(x).toFixed(1)}" y="${Y(z).toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="600" fill="#1c1915">${text}</text>`;

for (const district of world.districts) lines.push(label(district.name, district.label[0], district.label[1], 15));
lines.push(
  `<text x="${X(anchor.worldX).toFixed(1)}" y="${(Y(playable.z0) + 14).toFixed(1)}" text-anchor="middle" font-size="11" fill="#9a3412">Playable marina</text>`,
);
lines.push(`<text x="${X(2700).toFixed(1)}" y="${Y(400).toFixed(1)}" text-anchor="middle" font-size="18" fill="#e7f4f8" font-weight="650">Atlantic</text>`);
lines.push(`<text x="${X(860).toFixed(1)}" y="${Y(1280).toFixed(1)}" text-anchor="middle" font-size="16" fill="#e7f6f8" font-weight="650">Bay</text>`);

const legendX = padL + mapW + 24;
const legend = [
  ["#e7dcc4", "Mainland"],
  ["#1b6d90", "Atlantic and inlets"],
  ["#2f9eb4", "Bay and yacht basin"],
  ["#248f96", "Canals"],
  ...world.districts.map((district) => [fill[district.id], district.name]),
  ["#1e2428", "Freeway"],
  ["#3c4650", "Boulevard"],
  ["#14181c", "Causeway"],
  ["#9a3412", "Landmark and playable block"],
];
lines.push(`<text x="${legendX}" y="${padT + 8}" font-size="14" font-weight="650" fill="#1c1915">Legend</text>`);
legend.forEach(([color, name], index) => {
  const y = padT + 28 + index * 22;
  lines.push(`<rect x="${legendX}" y="${y - 11}" width="14" height="14" fill="${color}" stroke="#1c1915" stroke-opacity="0.3"/>`);
  lines.push(`<text x="${legendX + 22}" y="${y}" font-size="12" fill="#1c1915">${name}</text>`);
});
lines.push(
  `<text x="${legendX}" y="${padT + 40 + legend.length * 22}" font-size="12" fill="#3f3a34">North is up. 1 unit = 1 m.</text>`,
);
lines.push(
  `<text x="${legendX}" y="${padT + 58 + legend.length * 22}" font-size="12" fill="#3f3a34">Grid labels are world coordinates.</text>`,
);

const barX = padL + 16;
const barY = padT + 18;
lines.push(`<line x1="${barX}" y1="${barY}" x2="${barX + 1000 * scale}" y2="${barY}" stroke="#1c1915" stroke-width="3"/>`);
lines.push(`<text x="${barX}" y="${barY + 16}" font-size="12" fill="#1c1915">1 km</text>`);
lines.push(`<polygon points="${padL + mapW - 28},${padT + 36} ${padL + mapW - 40},${padT + 64} ${padL + mapW - 16},${padT + 64}" fill="#1c1915"/>`);
lines.push(`<text x="${padL + mapW - 28}" y="${padT + 28}" text-anchor="middle" font-size="12" font-weight="700" fill="#1c1915">N</text>`);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}">
  <rect width="100%" height="100%" fill="#f6f1e8"/>
  <text x="${padL}" y="32" font-size="22" font-weight="700" fill="#1c1915" font-family="Georgia, serif">The Coast — proposed geography</text>
  <text x="${padL}" y="52" font-size="13" fill="#3f3a34" font-family="Georgia, serif">6.4 km east–west, 5.2 km north–south. Atlantic on the east. Proposal, not the playable city.</text>
  <rect x="${padL}" y="${padT}" width="${mapW}" height="${mapH}" fill="#e7dcc4"/>
  <g font-family="Georgia, serif">
    ${lines.join("\n    ")}
  </g>
  <rect x="${padL}" y="${padT}" width="${mapW}" height="${mapH}" fill="none" stroke="#1c1915" stroke-width="1.5"/>
</svg>
`;

writeFileSync(join(root, "coast-masterplan.svg"), svg);
console.log(`wrote coast-masterplan.svg (${world.districts.length} districts, ${world.landmarks.length} landmarks)`);
