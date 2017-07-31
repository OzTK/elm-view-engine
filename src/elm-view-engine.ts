import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { ncp } from "ncp";
import * as path from "path";
import * as rimraf from "rimraf";

import * as hbs from "handlebars";
import * as compiler from "node-elm-compiler";

import Options from "./elm-view-options";
import ViewParams from "./view-params";
import ViewResult from "./view-result";

export default class ElmViewEngine {
  public static readonly GENERATION_DIR_BASE_PATH = path.join(
    __dirname,
    "generated",
  );

  private static readonly TEMPLATE_PATH = path.join(__dirname, "Main.elm.hbs");

  private worker: ElmComponent<any>;
  private getViewRequests: Array<((view: ViewResult) => void) | undefined> = [];
  private requestsRecyclingPool: number[] = [];

  constructor(private options: Options = new Options()) {}

  public compile(): Promise<ElmComponent<any>> {
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
        this.worker = await this.compileElmModule(this.options, modulePath);

        await this.cleanGenerated();

        return this.worker;
      })
      .catch(async (err) => {
        await this.cleanGenerated();
        throw err;
      });
  }

  public getView(name: string, context?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(
          new Error("Views need to be compiled before rendering them"),
        );
      }

      if (!name || name === "") {
        return reject(new Error("If you pass no name, you get no view!"));
      }
      
      const id = this.createRequestHandler(resolve, reject, this.worker.ports.receiveHtml);
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
    const options = this.options;
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
        path.join(this.options.projectRoot, "elm-stuff"),
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
  ): Promise<ElmComponent<any>> {
    const projectPath = path.dirname(modulePath);
    const projConfig = await this.loadElmPackageConfig(options.projectRoot);
    const myConfig = await this.loadElmPackageConfig(__dirname);

    myConfig.dependencies = {
      ...projConfig.dependencies,
      ...myConfig.dependencies,
    };

    myConfig["source-directories"].push(
      ...projConfig["source-directories"].map((dep: string) =>
        path.relative(projectPath, dep.replace(".", options.projectRoot)),
      ),
    );

    await this.outputElmPackageConfig(projectPath, myConfig);

    try {
      // ** Keeping this for debugging as compiler.compileWorker
      // ** doesn't return elm compiler's message
      // const code = await compiler
      //   .compileToString(modulePath, {
      //     cwd: projectPath,
      //     verbose: true,
      //     yes: true,
      //   });
      const module = await compiler.compileWorker(
        path.dirname(modulePath),
        modulePath,
        path.parse(modulePath).name,
      );
      return module;
    } catch (err) {
      // Throwing a human readable message as the compiler
      // will only return a vague process error message
      throw new Error(
        "One or more views don't compile. You should check your elm code!",
      );
    }
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
    resolve: (res: string) => void,
    reject: (reason?: any) => void,
    port: any,
  ): number {
    const recycledId = this.requestsRecyclingPool.shift();
    const reqId = recycledId !== undefined ? recycledId : this.getViewRequests.length;

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
