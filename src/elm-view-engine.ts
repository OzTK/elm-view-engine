import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { ncp } from "ncp";
import * as path from "path";
import * as rimraf from "rimraf";

import * as hbs from "handlebars";
import * as compiler from "node-elm-compiler";

import Options from "./elm-view-options";
import ImportCompiledViewsError from "./import-compiled-views-error";
import ViewParams from "./view-params";
import ViewResult from "./view-result";

export default class ElmViewEngine {
  public static readonly GENERATION_DIR_BASE_PATH = path.join(
    __dirname,
    "generated",
  );

  private static readonly TEMPLATE_PATH = path.join(__dirname, "Main.elm.hbs");
  private static readonly OUTPUT_JS_FILENAME = "views.compiled.js";

  private worker: ElmComponent<any>;
  private getViewRequests: Array<((view: ViewResult) => void) | undefined> = [];
  private requestsRecyclingPool: number[] = [];
  private isFaulty = false;

  public get options(): Options {
    return this._options;
  }

  constructor(private _options: Options = new Options()) {}

  /**
   * Compiles the views in the views folder and generates a javascript module
   * Outputted in the Options.compilePath folder (defaults to views folder).
   */
  public compile(): Promise<string> {
    this.isFaulty = false;
    return Promise.all<string[], string, string>([
      this.readViewsDir(),
      this.readTemplate(),
      this.ensureTempDirStructure(),
    ])
      .then(async result => {
        const depsCopy = this.copyDependenciesFromProject(result[2]);
        const elmCode = this.compileAndOutputTemplate(result[0], result[1]);
        const modulePath = await this.saveMainElmFile(result[2], elmCode);

        // Waiting for dependencies to be copied before compiling
        await depsCopy;
        const jsModulePath = await this.compileElmModule(
          this._options,
          modulePath,
        );

        // Awaiting to avoid interruption by the end of the process
        await this.cleanGenerated();

        return jsModulePath;
      })
      .catch(async err => {
        this.isFaulty = true;
        await this.cleanGenerated();
        throw err;
      });
  }

  /**
   * Returns true if compilation is needed before calling #getView().
   */
  public needsCompilation(): Promise<boolean> {
    return new Promise(resolve => {
      fs.stat(
        path.join(this._options.compilePath, ElmViewEngine.OUTPUT_JS_FILENAME),
        err => {
          if (err) {
            return resolve(true);
          }

          return resolve(false);
        },
      );
    });
  }

  /**
   * Produce the view requested if it is in the views folder.
   * @param name name of the requested view. MUST be defined!
   * @param context context object of the view. Must have properties matching the elm deserializer in the elm view.
   */
  public getView(name?: string | null, context?: any): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const compileError = new Error(
        "Views need to be compiled before rendering them",
      );

      const needsCompilation = await this.needsCompilation();
      if (this.isFaulty || needsCompilation) {
        return reject(compileError);
      }

      if (!name || name === "") {
        return reject(new Error("If you pass no name, you get no view!"));
      }

      // Lazy-instantianting the worker
      if (!this.worker) {
        const jsModulePath = path.join(
          this._options.compilePath,
          ElmViewEngine.OUTPUT_JS_FILENAME,
        );
        try {
          delete require.cache[require.resolve(jsModulePath)];
          this.worker = require(jsModulePath).Main.worker();
        } catch (error) {
          return reject(new ImportCompiledViewsError(error));
        }
      }

      const id = this.createRequestHandler(
        resolve,
        reject,
        this.worker.ports.receiveHtml,
      );
      this.worker.ports.receiveHtml.subscribe(this.getViewRequests[id]);
      this.worker.ports.getView.send(new ViewParams(id, name, context));
    });
  }

  // Compilation

  private cleanGenerated(): Promise<void> {
    return new Promise((resolve, reject) => {
      rimraf(ElmViewEngine.GENERATION_DIR_BASE_PATH + "*", err2 => {
        if (err2) {
          return reject(
            new Error(
              "Failed to clean generated files. Please do it manually: " + err2,
            ),
          );
        }
        return resolve();
      });
    });
  }

  private readViewsDir(): Promise<string[]> {
    const options = this._options;
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(options.viewsDirPath, (errReadViews, files) => {
        if (errReadViews) {
          return reject(errReadViews);
        }
        return resolve(files);
      });
    });
  }

  private readTemplate(): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(
        ElmViewEngine.TEMPLATE_PATH,
        "UTF-8",
        (errReadTpl, content) => {
          if (errReadTpl) {
            return reject(errReadTpl);
          }
          return resolve(content);
        },
      );
    });
  }

  private compileAndOutputTemplate(files: string[], templateContent: string) {
    const modules = files
      .filter(f => f.endsWith(".elm"))
      .map(f => f.replace(".elm", ""));
    const template = hbs.compile(templateContent);
    return template({ modules });
  }

  private ensureTempDirStructure(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      mkdirp(path.dirname(ElmViewEngine.GENERATION_DIR_BASE_PATH), err => {
        if (err) {
          return reject(err);
        }

        if (this.isFaulty) {
          return reject(
            new Error("Engine is in a faulty state. Aborting dir creation"),
          );
        }

        fs.mkdtemp(ElmViewEngine.GENERATION_DIR_BASE_PATH, (err2, dir) => {
          if (err2) {
            return reject(err);
          }

          return resolve(dir);
        });
      });
    });
  }

  private copyDependenciesFromProject(generatedPath: string): Promise<void> {
    return new Promise(resolve => {
      ncp(
        path.join(this._options.projectRoot, "elm-stuff"),
        path.join(generatedPath, "elm-stuff"),
        () => {
          // Not handling the error as it just means
          // dependencies will be downloaded
          resolve();
        },
      );
    });
  }

  private saveMainElmFile(
    generatedProjectPath: string,
    elmCode: string,
  ): Promise<string> {
    const modulePath = path.join(generatedProjectPath, "Main.elm");
    return new Promise<string>((resolve, reject) => {
      fs.writeFile(modulePath, elmCode, err => {
        if (err) {
          return reject(err);
        }
        return resolve(modulePath);
      });
    });
  }

  private async compileElmModule(
    options: Options,
    modulePath: string,
  ): Promise<string> {
    const projectPath = path.dirname(modulePath);
    const projConfig = await this.loadElmPackageConfig(options.projectRoot);
    const myConfig = await this.loadElmPackageConfig(__dirname);

    myConfig.dependencies = {
      ...projConfig.dependencies,
      ...myConfig.dependencies,
    };

    myConfig["source-directories"].push(
      ...projConfig["source-directories"].map((dep: string) => {
        let sourcePath = dep.replace(
          "..",
          path.join(options.projectRoot, ".."),
        );
        if (sourcePath.startsWith("./")) {
          sourcePath = sourcePath.replace(".", options.projectRoot);
        }

        return path.relative(projectPath, sourcePath);
      }),
    );

    await this.outputElmPackageConfig(projectPath, myConfig);

    try {
      // ** Keeping this for debugging as compiler.compileWorker
      // ** doesn't return elm compiler's message
      const jsCode = await compiler.compileToString(modulePath, {
        cwd: projectPath,
        verbose: process.env.NODE_ENV === "development",
        yes: true,
      });

      return this.outputElmJsModule(jsCode);
    } catch (err) {
      // Throwing a human readable message as the compiler
      // will only return a vague process error message
      throw new Error(
        "One or more views don't compile. You should check your elm code!",
      );
    }
  }

  private outputElmJsModule(elmCode: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const outPath = path.join(
        this._options.compilePath,
        ElmViewEngine.OUTPUT_JS_FILENAME,
      );
      fs.writeFile(outPath, elmCode, error => {
        if (error) {
          return reject(error);
        }

        return resolve(outPath);
      });
    });
  }

  private outputElmPackageConfig(
    outputDir: string,
    config: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        path.join(outputDir, "elm-package.json"),
        JSON.stringify(config),
        err => {
          if (err) {
            return reject(err);
          }
          return resolve();
        },
      );
    });
  }

  private loadElmPackageConfig(modulePathOrDir: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Let's begin with the callback hell!
      fs.readFile(
        path.join(modulePathOrDir, "elm-package.json"),
        "UTF-8",
        (err, content) => {
          if (err) {
            return fs.readFile(
              path.join(path.dirname(modulePathOrDir), "elm-package.json"),
              "UTF-8",
              (err2, content2) => {
                if (err2) {
                  return reject(err);
                }
                return resolve(JSON.parse(content2));
              },
            );
          }
          return resolve(JSON.parse(content));
        },
      );
    });
  }

  // View rendering

  private createRequestHandler(
    resolve: (res?: string) => void,
    reject: (reason?: any) => void,
    port: any,
  ): number {
    const recycledId = this.requestsRecyclingPool.shift();
    const reqId =
      recycledId !== undefined ? recycledId : this.getViewRequests.length;

    const cb = (view: ViewResult) => {
      if (view.id !== reqId) {
        return;
      }

      this.requestsRecyclingPool.push(reqId);
      this.getViewRequests[reqId] = undefined;

      port.unsubscribe(cb);
      if (view.error) {
        return reject(new Error(view.error));
      }
      return resolve(view.html);
    };

    this.getViewRequests[reqId] = cb;

    return reqId;
  }
}
