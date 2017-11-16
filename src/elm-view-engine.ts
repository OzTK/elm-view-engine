import * as createDebug from "debug";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { ncp } from "ncp";
import * as path from "path";
import * as readline from "readline";
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
    "generated"
  );

  private static readonly TEMPLATE_PATH = path.join(__dirname, "Main.elm.hbs");
  private static readonly OUTPUT_JS_FILENAME = "views.compiled.js";

  private worker: ElmComponent<any>;
  private getViewRequests: Array<((view: ViewResult) => void) | undefined> = [];
  private requestsRecyclingPool: number[] = [];
  private lastCompileError?: Error;
  private isUpdated: boolean;
  private watcher: fs.FSWatcher;

  private debug: createDebug.IDebugger;

  public get options(): Options {
    return this._options;
  }

  constructor(private _options: Options = new Options()) {
    this.debug = createDebug("elm-view-engine");
    this.debug.log = console.debug.bind(console);
  }

  /**
   * Compiles the views in the views folder and generates a javascript module
   * Outputted in the Options.compilePath folder (defaults to views folder).
   */
  public compile(): Promise<string> {
    this.debug("Starting compilation...");
    this.lastCompileError = undefined;
    return Promise.all<string[], string, string>([
      this.readViewsDir(),
      this.readTemplate(),
      this.ensureTempDirStructure(),
    ])
      .then(async result => {
        const depsCopy = this.copyDependenciesFromProject(result[2]);
        const elmCode = await this.compileAndOutputTemplate(
          result[0],
          result[1]
        );
        const modulePath = await this.saveMainElmFile(result[2], elmCode);

        // Waiting for dependencies to be copied before compiling
        await depsCopy;
        const jsModulePath = await this.compileElmModule(
          this._options,
          modulePath
        );

        this.debug("Compilation succeeded. Cleaning...");

        // Awaiting to avoid interruption by the end of the process
        await this.cleanGenerated();

        this.isUpdated = true;

        if (!this.watcher) {
          this.watchCompiledViews();
        }

        this.debug("Cleaning done");

        return jsModulePath;
      })
      .catch(async err => {
        this.debug("Compilation failed: %s", err);
        this.lastCompileError = err;
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
        }
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
      if (this.lastCompileError) {
        return reject(new ImportCompiledViewsError(this.lastCompileError));
      }

      const needsCompilation = await this.needsCompilation();
      if (needsCompilation) {
        return reject(
          new Error("Views need to be compiled before rendering them")
        );
      }

      if (!name || name === "") {
        return reject(new Error("If you pass no name, you get no view!"));
      }

      // Lazy-instantianting the worker
      if (!this.worker || this.isUpdated) {
        const jsModulePath = path.join(
          this._options.compilePath,
          ElmViewEngine.OUTPUT_JS_FILENAME
        );
        try {
          delete require.cache[require.resolve(jsModulePath)];
          this.worker = require(jsModulePath).Main.worker();
        } catch (error) {
          this.lastCompileError = error;
          return reject(new ImportCompiledViewsError(error));
        } finally {
          this.isUpdated = false;
          this.watchCompiledViews();
        }
      }

      const id = this.createRequestHandler(
        resolve,
        reject,
        this.worker.ports.receiveHtml
      );
      this.worker.ports.receiveHtml.subscribe(this.getViewRequests[id]);
      this.worker.ports.getView.send(new ViewParams(id, name, context));
    });
  }

  // Compilation

  private watchCompiledViews() {
    this.watcher = fs.watch(
      path.join(this._options.compilePath, ElmViewEngine.OUTPUT_JS_FILENAME),
      { persistent: false },
      () => {
        this.isUpdated = true;
        this.lastCompileError = undefined;
      }
    );
  }

  private cleanGenerated(): Promise<void> {
    return new Promise((resolve, reject) => {
      rimraf(ElmViewEngine.GENERATION_DIR_BASE_PATH + "*", err2 => {
        if (err2) {
          return reject(
            new Error(
              "Failed to clean generated files. Please do it manually: " + err2
            )
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
        }
      );
    });
  }

  private async compileAndOutputTemplate(
    files: string[],
    templateContent: string
  ): Promise<string> {
    const modules = await Promise.all(
      files
        .filter(f => f.endsWith(".elm"))
        .map(f => path.join(this._options.viewsDirPath, f))
        .map(this.getModuleName)
    );

    hbs.registerHelper("lastPart", (str: string, sep: string) => {
      const parts = str.split(sep);
      return parts[parts.length - 1];
    });

    const template = hbs.compile(templateContent);
    return template({ modules });
  }

  private getModuleName(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = readline.createInterface(fs.createReadStream(file));
      reader.on("line", (line: string) => {
        reader.close();
        const parts = line.split(" ");
        if (parts.length < 4) {
          return reject(
            new Error(`Impossible to extract module name from ${file}`)
          );
        }

        return resolve(parts[1]);
      });
    });
  }

  private ensureTempDirStructure(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      mkdirp(path.dirname(ElmViewEngine.GENERATION_DIR_BASE_PATH), err => {
        if (err) {
          return reject(err);
        }

        if (this.lastCompileError) {
          return reject(
            new Error("Engine is in a faulty state. Aborting dir creation")
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
        }
      );
    });
  }

  private saveMainElmFile(
    generatedProjectPath: string,
    elmCode: string
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
    modulePath: string
  ): Promise<string> {
    const projectPath = path.dirname(modulePath);

    // Loading engine + project elm configs
    const configs = await Promise.all([
      this.loadElmPackageConfig(options.projectRoot),
      this.loadElmPackageConfig(__dirname),
    ]);
    const projConfig = configs[0];
    const engineConfig = configs[1];

    // Merging dependencies in engine elm config
    engineConfig.dependencies = {
      ...projConfig.dependencies,
      ...engineConfig.dependencies,
    };

    // Merging sources in engine elm config after normalizing all the paths
    engineConfig["source-directories"].push(
      ...projConfig["source-directories"].map((dep: string) => {
        // paths are relative to project root, so we make them absolute
        let sourcePath = dep.replace(
          "..",
          path.join(options.projectRoot, "..")
        );

        // If some paths use ./ we replace that with project root
        if (sourcePath.startsWith("./")) {
          sourcePath = sourcePath.replace(".", options.projectRoot);
        }

        return path.relative(projectPath, sourcePath);
      })
    );

    await this.outputElmPackageConfig(projectPath, engineConfig);

    try {
      const jsCode = await compiler.compileToString(modulePath, {
        cwd: projectPath,
        pathToMake: options.elmMake,
        verbose: process.env.NODE_ENV === "development",
        yes: true,
      });

      return this.outputElmJsModule(jsCode);
    } catch (err) {
      this.debug(err);
      throw err;
    }
  }

  private outputElmJsModule(elmCode: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const outPath = path.join(
        this._options.compilePath,
        ElmViewEngine.OUTPUT_JS_FILENAME
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
    config: any
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
        }
      );
    });
  }

  private loadElmPackageConfig(elmRoot: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(
        path.join(elmRoot, "elm-package.json"),
        "UTF-8",
        (err, content) => {
          if (err) {
            return reject(err);
          }
          return resolve(JSON.parse(content));
        }
      );
    });
  }

  // View rendering

  private createRequestHandler(
    resolve: (res?: string) => void,
    reject: (reason?: any) => void,
    port: any
  ): number {
    // Reusing ids from past requests
    const recycledId = this.requestsRecyclingPool.shift();
    const reqId =
      recycledId !== undefined ? recycledId : this.getViewRequests.length;

    // Callback to be called when the view result is ready
    const cb = (view: ViewResult) => {
      if (view.id !== reqId) {
        return;
      }

      // Putting the req id aside for reuse and voiding it in the requests array
      this.requestsRecyclingPool.push(reqId);
      this.getViewRequests[reqId] = undefined;

      port.unsubscribe(cb);

      // Returning the result to the caller through promise callbacks
      if (view.error) {
        return reject(new Error(view.error));
      }
      return resolve(view.html);
    };

    this.getViewRequests[reqId] = cb;

    return reqId;
  }
}
