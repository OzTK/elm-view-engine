import * as path from "path";

import ElmViewEngine from "./elm-view-engine";
import Options from "./elm-view-options";

let engine: ElmViewEngine | null;
let isCompiling = false;

export function configure(options?: Options | ElmViewEngine): Promise<ElmViewEngine> {
  engine =
    options instanceof ElmViewEngine ? options : new ElmViewEngine(options);

  isCompiling = true;
  return engine.compile().then(() => {
    isCompiling = false;
    if (!engine) {
      throw new Error("View engine should not be null after compilation");
    }

    if (
      engine &&
      engine.options.expressApp &&
      typeof engine.options.expressApp.set === "function" &&
      typeof engine.options.expressApp.engine === "function"
    ) {
      const app = engine.options.expressApp;
      app
        .set("views", engine.options.viewsDirPath)
        .set("view engine", "elm")
        .engine("elm", __express);
    }
      
    return engine;
  });
}

export async function __express(
  filePath: string,
  options: any,
  callback: (err?: Error | string | null, content?: string) => void,
): Promise<string> {
  if (!engine) {
    throw new Error(
      "configure() must be called before trying to call __express()",
    );
  }

  const viewName = path.parse(filePath).name;

  try {
    const html = await engine.getView(viewName, options);
    return html;
  } catch(err) {
    callback(err);
    throw err;
  }
}

export function reset(): boolean {
  if (isCompiling) {
    return false;
  }

  engine = null;
  return true;
}

export { ElmViewEngine, Options };
