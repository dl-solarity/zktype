import { expect } from "chai";

import { findProjectRoot, getPackageVersion } from "../src/utils";

describe("Utils", function () {
  describe("findProjectRoot", function () {
    it("should revert if project root not found", async () => {
      expect(() => findProjectRoot("/")).to.throw("Reached the filesystem root while searching for project root.");
    });
  });

  describe("getPackageVersion", function () {
    it("should return the package version", async () => {
      const packageVersion = getPackageVersion();

      expect(packageVersion).to.be.eq(require("../package.json").version);
    });
  });
});
