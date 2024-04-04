import { expect, test, describe } from "bun:test";

import { findProjectRoot } from "../src/utils";

describe("Utils", function () {
  describe("findProjectRoot", function () {
    test("it should revert if project root not found", async () => {
      expect(() => findProjectRoot("/")).toThrow("Reached the filesystem root while searching for project root.");
    });
  });
});
