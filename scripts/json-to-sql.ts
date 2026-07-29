import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const LIKES_JSON = process.argv[2] || "/tmp/likes-prod.json";
const VISITORS_JSON = process.argv[3] || "/tmp/likes-visitors-prod.json";
const OUT = process.argv[4] || "/tmp/prod-data.sql";

interface LikesRow {
  slug: string;
  count: number;
  updated_at: string;
}

interface VisitorsRow {
  slug: string;
  visitor_id: string;
  created_at: string;
}

const likes: LikesRow[] = JSON.parse(readFileSync(LIKES_JSON, "utf-8"))[0].results;
const visitors: VisitorsRow[] = JSON.parse(readFileSync(VISITORS_JSON, "utf-8"))[0].results;

const lines: string[] = [];

lines.push("-- Data export from production D1\n");

for (const row of likes) {
  const esc = (s: string) => s.replace(/'/g, "''");
  lines.push(
    `INSERT INTO likes (slug, count, updated_at) VALUES ('${esc(row.slug)}', ${row.count}, '${esc(row.updated_at)}');`,
  );
}

for (const row of visitors) {
  const esc = (s: string) => s.replace(/'/g, "''");
  lines.push(
    `INSERT INTO likes_visitors (slug, visitor_id, created_at) VALUES ('${esc(row.slug)}', '${esc(row.visitor_id)}', '${esc(row.created_at)}');`,
  );
}

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${likes.length} likes + ${visitors.length} visitors → ${OUT}`);
