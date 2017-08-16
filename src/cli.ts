#!/usr/bin/env node

import * as clc from "cli-color";
import * as program from "commander";
import * as util from "util";
import ElmViewEngine from "./elm-view-engine";
import Options from "./elm-view-options";

program
  .version(version())
  .option("-v, --views <path>", "directory containing all the views")
  .option("-p, --project <path>", "path to the project root")
  .option(
    "-o, --out <path>",
    "path to the directory where the compiled js file should be outputted",
  )
  .parse(process.argv);

compile(createOptions(program));

export function createOptions(pgrm?: program.CommanderStatic): Options {
  const options = new Options();

  if (pgrm) {
    if (pgrm.views) {
      options.viewsDirPath = pgrm.views;
      options.compilePath = pgrm.views;
    }

    if (pgrm.project) {
      options.projectRoot = pgrm.project;
    }

    if (pgrm.out) {
      options.compilePath = pgrm.out;
    }
  }

  return options;
}

export function compile(options: Options) {
  // tslint:disable-next-line:no-console
  console.log(clc.yellow("Starting views compilation..."));
  const engine = new ElmViewEngine(options);
  return engine
    .compile()
    .then(path => {
      // tslint:disable-next-line:no-console
      console.log(
        clc.green(util.format("Successfully compiled views to %s", path)),
      );
    })
    .catch(err => {
      // tslint:disable-next-line:no-console
      console.log(clc.red(util.format("Error compiling: %s", err)));
    });
}

export function version() {
  let conf;
  try {
    conf = require("./package.json");
  } catch (error) {
    conf = require("../package.json");
  }
  return conf.version;
}
