import * as fs from "fs";
import * as hbs from "handlebars";
import * as path from "path";

import Options from "./elm-template-options";

export default class ElmTemplateEngine {
  private static readonly TEMPLATE_PATH = path.join(__dirname, "Main.elm.hbs");
  // private static readonly modulePath = path.join(__dirname, "generated", "main");

  constructor(private options: Options = new Options()) { }

  public compile(): Promise<string> {
    const options = this.options;
    return new Promise((resolve, reject) => {
      fs.readFile(ElmTemplateEngine.TEMPLATE_PATH, "UTF-8", (errReadTpl, content) => {
        if (errReadTpl) {
          return reject(errReadTpl);
        }

        const template = hbs.compile(content);

        fs.readdir(options.viewsDirPath, (errReadViews, files) => {
          if (errReadViews) {
            return reject(errReadViews);
          }

          const moduleNames = files
            .filter((f) => f.endsWith(".elm"))
            .map((f) => f.replace(".elm", ""));
          const elmCode = template({ modules: moduleNames });

          resolve(elmCode);
        });
      });
    });
  }

  public getView(name: string, context: any): Promise<string> {
    name.toString();
    context.toString();
    return new Promise((resolve, reject) => {
      resolve.toString();
      reject("");
    });
  }
}
