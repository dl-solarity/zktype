import { expect, test, describe } from "bun:test";

import { findProjectRoot, getPackageVersion } from "../src/utils";

describe("Utils", function () {
  describe("findProjectRoot", function () {
    test("it should revert if project root not found", async () => {
      expect(() => findProjectRoot("/")).toThrow("Reached the filesystem root while searching for project root.");
    });
  });

  describe("getPackageVersion", function () {
    test("it should return the package version", async () => {
      const packageVersion = getPackageVersion();

      expect(packageVersion).toBe(require("../package.json").version);
    });
  });
});
