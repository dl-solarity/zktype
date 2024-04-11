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

export function getPackageVersion(): string {
  const packageJsonPath = path.join(findProjectRoot(__dirname), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  return packageJson.version;
}
