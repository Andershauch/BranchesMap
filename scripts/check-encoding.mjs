import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const includeExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".prisma",
  ".yml",
  ".yaml",
  ".toml",
  ".sql",
  ".txt",
  ".html",
]);
const includeBasenames = new Set([".editorconfig", ".gitattributes", ".gitignore"]);
const ignoreDirectories = new Set([".git", ".next", ".vercel", "node_modules"]);
const suspiciousPattern = new RegExp(
  [
    "\\u00C3.",
    "\\u00C2.",
    "\\uFFFD",
    "\\u00D8\\u00A7\\u00D9",
    "\\u00D9\\u2026",
    "\\u00D9\\u201E",
    "\\u00C3\\u00A6",
    "\\u00C3\\u00B8",
    "\\u00C3\\u00A5",
    "\\u00C3\\u2020",
    "\\u00C3\\u02DC",
    "\\u00C3\\u2026",
  ].join("|"),
);
const failures = [];

function walk(currentPath) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoreDirectories.has(entry.name) || entry.name.startsWith("_tmp")) {
        continue;
      }

      walk(path.join(currentPath, entry.name));
      continue;
    }

    const extension = path.extname(entry.name);
    const isEnvFile = entry.name === ".env" || entry.name.startsWith(".env.");
    if (!includeExtensions.has(extension) && !includeBasenames.has(entry.name) && !isEnvFile) {
      continue;
    }

    const filePath = path.join(currentPath, entry.name);
    const buffer = readFileSync(filePath);

    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      failures.push({ filePath, reason: "UTF-8 BOM detected" });
      continue;
    }

    const content = buffer.toString("utf8");
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      if (suspiciousPattern.test(lines[index])) {
        failures.push({
          filePath,
          reason: `Suspicious encoding sequence on line ${index + 1}`,
          sample: lines[index].trim(),
        });
      }
    }
  }
}

walk(root);

if (failures.length > 0) {
  console.error("Encoding check failed. Fix the files below before continuing:\n");
  for (const failure of failures) {
    const relativePath = path.relative(root, failure.filePath);
    console.error(`- ${relativePath}: ${failure.reason}`);
    if (failure.sample) {
      console.error(`  ${failure.sample}`);
    }
  }
  process.exit(1);
}

console.log("Encoding check passed.");
