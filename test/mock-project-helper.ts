import * as copy from "copyfiles";
import * as fs from "fs";
import { ncp } from "ncp";
import * as path from "path";
import * as rimraf from "rimraf";

export default class MockProjectHelper {
  public static createProject = async (
    fixturesPath: string,
  ): Promise<MockProjectHelper> => {
    const projectPath = path.join(
      process.cwd(),
      fs.mkdtempSync("fake_project_"),
    );
    const viewsDirPath = path.join(projectPath, "views");
    const projHelper = new MockProjectHelper(
      projectPath,
      viewsDirPath,
      fixturesPath,
    );

    return Promise.all([
      projHelper.importDependencies(),
      projHelper.importPackageConfig(),
      projHelper.importViews(),
      projHelper.importExternalView(),
    ]).then(() => projHelper);
  };

  private static readonly EXTERNAL_VIEWS_DIRNAME = "external_views";

  private constructor(
    private _projectPath: string,
    private _viewsPath: string,
    private fixturesPath: string,
  ) {}

  public get projectPath(): string {
    return this._projectPath;
  }

  public get viewsPath(): string {
    return this._viewsPath;
  }

  public restoreFiles = () => {
    // return new Promise(async resolve => {
    //   await this.importPackageConfig();
    //   await this.importViews()
    //   resolve();
    // });
    return Promise.all([
      this.importPackageConfig(),
      this.importViews(),
      this.importExternalView(),
    ]);
  };

  public deleteViewsDir = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      rimraf(this._viewsPath, this.handleCopyError(resolve, reject));
    });
  };

  public deletePackageConfigSync = () => {
    fs.unlinkSync(path.join(this._projectPath, "elm-package.json"));
  };

  public deleteExternalViewSync = () => {
    fs.unlinkSync(
      path.join(
        this.projectPath,
        MockProjectHelper.EXTERNAL_VIEWS_DIRNAME,
        "InvalidView.elm",
      ),
    );
  };

  public deleteProject = () => {
    return new Promise((resolve, reject) => {
      rimraf.sync(this._projectPath);
      rimraf(this._projectPath, this.handleCopyError(resolve, reject));
    });
  };

  private handleCopyError(
    resolve: (value?: any | PromiseLike<any>) => void,
    reject: (reason?: any) => void,
  ) {
    return (error: any) => {
      if (error) {
        return reject(error);
      }
      return resolve();
    };
  }

  private importViews(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        fs.mkdirSync(this._viewsPath);
        const files = fs.readdirSync(this.fixturesPath);
        copy(
          files
            .filter(
              f => f.endsWith("View.elm") && !f.endsWith("InvalidView.elm"),
            )
            .map(f => path.join(this.fixturesPath, f))
            .concat([this._viewsPath]),
          true,
          this.handleCopyError(resolve, reject),
        );
      } catch (err) {
        if (err.code === "EEXIST") {
          return resolve();
        }

        return reject();
      }
    });
  }

  private importExternalView(): Promise<any> {
    return new Promise((resolve, reject) => {
      const otherViewsPath = path.join(
        this._projectPath,
        MockProjectHelper.EXTERNAL_VIEWS_DIRNAME,
      );
      try {
        fs.mkdirSync(otherViewsPath);
      } catch (err) {
        if (err.code !== "EEXIST") {
          return reject();
        }
      } finally {
        copy(
          [path.join(this.fixturesPath, "InvalidView.elm"), otherViewsPath],
          true,
          this.handleCopyError(resolve, reject),
        );
      }
    });
  }

  private importPackageConfig(): Promise<any> {
    return new Promise((resolve, reject) => {
      copy(
        [path.join(this.fixturesPath, "elm-package.json"), this._projectPath],
        true,
        this.handleCopyError(resolve, reject),
      );
    });
  }

  private importDependencies(): Promise<any> {
    return new Promise(resolve => {
      ncp(
        path.join(this.fixturesPath, "elm-stuff"),
        path.join(this._projectPath, "elm-stuff"),
        () => {
          resolve();
        } /* No reject if no dependencies: they'll get dl) */,
      );
    });
  }
}
