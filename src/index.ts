import * as path from "path";

import ElmViewEngine from "./elm-view-engine";
import Options from "./elm-view-options";

let currentOptions: Options | undefined | null;
let engine: ElmViewEngine;
let isCompiling = false;

export async function configure(
  options?: Options | ElmViewEngine,
): Promise<ElmViewEngine> {
  if (isCompiling) {
    return Promise.reject(
      new Error("There is already a compilation in progress"),
    );
  }

  isCompiling = true;

  const configureExpressApp = () => {
    if (
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
  };

  if (options instanceof ElmViewEngine) {
    engine = options;
    currentOptions = engine.options;
  } else if (options instanceof Options) {
    currentOptions = options;
    engine = new ElmViewEngine(currentOptions);
  } else {
    engine = new ElmViewEngine();
    currentOptions = engine.options;
  }

  const needsCompilation = await engine.needsCompilation();
  if (!needsCompilation && !engine.options.forceCompilation) {
    isCompiling = false;
    configureExpressApp()
    return engine;
  }

  configureExpressApp();

  try {
    await engine.compile();
  } catch (error) {
    throw error;
  } finally {
    isCompiling = false;
  }

  return engine;
}

export async function __express(
  filePath: string,
  options: any,
  callback: (err?: Error | string | null, content?: string) => void,
): Promise<string> {
  if (!currentOptions || !engine || await engine.needsCompilation()) {
    throw new Error(
      "configure() must be called before trying to call __express()",
    );
  }

  const viewName = path.parse(filePath).name;

  try {
    const html = await engine.getView(viewName, options);
    callback(null, html);
    return html;
  } catch (err) {
    callback(err);
    throw err;
  }
}

export function reset(): boolean {
  if (isCompiling || !currentOptions) {
    return false;
  }

  engine = new ElmViewEngine(currentOptions);
  return true;
}

export { ElmViewEngine, Options };
