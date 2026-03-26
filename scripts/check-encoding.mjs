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
  ".prisma",
  ".yml",
  ".yaml",
  ".txt",
  ".html",
]);
const ignoreDirectories = new Set([".git", ".next", "node_modules"]);
const suspiciousPattern = /(\u00C3.|\u00C2.|\uFFFD)/;
const failures = [];

function walk(currentPath) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoreDirectories.has(entry.name)) {
        continue;
      }

      walk(path.join(currentPath, entry.name));
      continue;
    }

    const extension = path.extname(entry.name);
    if (!includeExtensions.has(extension)) {
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