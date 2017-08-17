#!/usr/bin/env node

import * as program from "commander";
import * as path from "path";
import { compile, createOptions } from "./cli-utils";

const version = () =>
  require(path.resolve(__dirname, "./package.json")).version;

program
  .version(version())
  .option("-v, --views <path>", "directory containing all the views")
  .option("-p, --project <path>", "path to the project root")
  .option(
    "-o, --out <path>",
    "path to the directory where the compiled js file should be outputted",
  )
  .parse(process.argv);

compile(createOptions(program))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
