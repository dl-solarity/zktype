import fs from "fs";
import path from "path";

export function findProjectRoot(currentDir: string): string {
  if (fs.existsSync(path.join(currentDir, "package.json"))) {
    return currentDir;
  }

  const parentDir = path.resolve(currentDir, "..");

  if (parentDir === currentDir) {
    throw new Error("Reached the filesystem root while searching for project root.");
  }

  return findProjectRoot(parentDir);
}
