#!/usr/bin/env node

import pleaseUpgradeNode from "please-upgrade-node";

import packageJson from "../package.json";

pleaseUpgradeNode(packageJson);

async function runCli(cli: { runCLI: () => void }): Promise<void> {
  return cli.runCLI();
}

async function dynamicImport(module: string): Promise<any> {
  return import(module);
}

async function main(): Promise<void> {
  try {
    const cliModule = await dynamicImport("../src/cli.js");
    await runCli(cliModule);
  } catch (error) {
    console.error("Failed to load the CLI module:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
