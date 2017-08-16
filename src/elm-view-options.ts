import * as path from "path";

export default class Options {
  /**
   * ElmViewEngine options to be passed when constructing
   * @param viewsDirPath Path to the views directory (default: views)
   * @param projectRoot Path to the project's root directory (default: current working directory)
   * @param expressApp Express app to configure with ElmViewEngine as a template engine
   * @param compilePath Path where the compiled views should be outputted (default: viewsDirPath)
   * @param forceCompilation If true, forces views to be recompiled even if there is already an outputted js module
   */
  constructor(
    public viewsDirPath: string = path.join(process.cwd(), "views"),
    public projectRoot: string = process.cwd(),
    public expressApp?: any,
    public forceCompilation: boolean = false,
    public compilePath: string = viewsDirPath,
  ) {}
}
