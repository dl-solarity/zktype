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

/**
 * Converts valid file names to valid javascript symbols and does best effort to make them readable. Example: ds-token.test becomes DsTokenTest
 */
export function normalizeName(rawName: string): string {
  const transformations: ((s: string) => string)[] = [
    (s) => s.replace(/\s+/g, "-"), // spaces to - so later we can automatically convert them
    (s) => s.replace(/\./g, "-"), // replace "."
    (s) => s.replace(/-[a-z]/g, (match) => match.substring(-1).toUpperCase()), // delete '-' and capitalize the letter after them
    (s) => s.replace(/-/g, ""), // delete any '-' left
    (s) => s.replace(/^\d+/, ""), // removes leading digits
    (s) => s.charAt(0).toUpperCase() + s.slice(1), // uppercase the first letter
  ];

  const finalName = transformations.reduce((s, t) => t(s), rawName);

  if (finalName === "") {
    throw new Error(`Can't guess class name, please rename file: ${rawName}`);
  }

  return finalName;
}
