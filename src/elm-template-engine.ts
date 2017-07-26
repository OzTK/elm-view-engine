import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as path from "path";

import * as hbs from "handlebars";

import Options from "./elm-template-options";

export default class ElmTemplateEngine {
  public static readonly GENERATION_DIR_PATH = path.join(__dirname, "generated");
  public static readonly ELM_MODULE_PATH = path.join(ElmTemplateEngine.GENERATION_DIR_PATH, "Main.elm");
  private static readonly TEMPLATE_PATH = path.join(__dirname, "Main.elm.hbs");

  constructor(private options: Options = new Options()) {}

  public compile(): Promise<string> {
    return Promise.all<string[], string, string>([
      this.readViewsDir(),
      this.readTemplate(),
      this.ensureDirStructure(ElmTemplateEngine.ELM_MODULE_PATH),
    ])
      .then(result => this.compileAndOutputTemplate(result[0], result[1]))
      .then(this.saveMainElmFile);
  }

  public getView(name: string, context: any): Promise<string> {
    name.toString();
    context.toString();
    return new Promise((resolve, reject) => {
      resolve.toString();
      reject("");
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
        ElmTemplateEngine.TEMPLATE_PATH,
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
    const modules = files.filter(f => f.endsWith(".elm")).map(f => f.replace(".elm", ""));
    const template = hbs.compile(templateContent);
    return template({ modules });
  }

  private ensureDirStructure(filePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      mkdirp(path.dirname(filePath), (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(filePath);
      });
    });
  }

  private saveMainElmFile(elmCode: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      fs.writeFile(ElmTemplateEngine.ELM_MODULE_PATH, elmCode, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(ElmTemplateEngine.ELM_MODULE_PATH);
      });
    });
  }

  // private compileElmAndStartWorker(elmCode: string)
}
