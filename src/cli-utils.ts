import * as clc from "cli-color";
import * as program from "commander";
import * as util from "util";

import ElmViewEngine from "./elm-view-engine";
import Options from "./elm-view-options";


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

export function compile(options: Options): Promise<any> {
  // tslint:disable-next-line:no-console
  console.log(clc.yellow("Starting views compilation..."));
  const eng = new ElmViewEngine(options);
  return eng
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
      throw err;
    });
}