import "mocha";
import "should";

import * as copy from "copyfiles";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

import ElmTemplateEngine from "../src/elm-template-engine";
import Options from "../src/elm-template-options";

const hbsTemplateFilePath = path.join(__dirname, "..", "src", "Main.elm.hbs");
const hbsInexistentTemplateFilePath = path.join(
  path.dirname(hbsTemplateFilePath),
  "Main_notexists.elm.hbs",
);
const fixturesPath = path.join(__dirname, "fixtures");

describe("ElmTemplateEngine", () => {
  let engine: ElmTemplateEngine;
  let viewsDirPath: string;
  let projectPath: string;

  before(() => {
    return new Promise((resolve, reject) => {
      projectPath = path.join(process.cwd(), fs.mkdtempSync("fake_project_"));
      viewsDirPath = path.join(projectPath, "views");

      const rdDir = path.join(projectPath, "invalid");
      fs.mkdirSync(rdDir);

      fs.mkdirSync(viewsDirPath);

      const files = fs.readdirSync(fixturesPath);
      copy(
        files
          .filter(f => f.endsWith("View.elm") && !f.endsWith("InvalidView.elm"))
          .map(f => path.join(fixturesPath, f))
          .concat([viewsDirPath]),
        true,
        handleCopyError(resolve, reject),
      );
    });
  });

  beforeEach(() => {
    engine = new ElmTemplateEngine(new Options(viewsDirPath, projectPath));

    // moving sample elm-package.json
    return new Promise((resolve, reject) => {
      copy(
        [path.join(fixturesPath, "elm-package.json"), projectPath],
        true,
        handleCopyError(resolve, reject),
      );

      copy(
        [path.join(fixturesPath, "InvalidView.elm"), path.join(projectPath, "invalid")],
        true,
        handleCopyError(resolve, reject),
      );
    });
  });

  afterEach(() => {
    return new Promise(resolve => {
      try {
        fs.renameSync(hbsInexistentTemplateFilePath, hbsTemplateFilePath);
      } catch (err) {
        // Ignore the error
      } finally {
        rimraf.sync(ElmTemplateEngine.GENERATION_DIR_BASE_PATH);
        rimraf(ElmTemplateEngine.GENERATION_DIR_BASE_PATH, () => {
          resolve();
        });
      }
    });
  });

  after(() => {
    return new Promise((resolve, reject) => {
      rimraf.sync(projectPath);
      rimraf(projectPath, err => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  });

  describe("#compile()", () => {
    it("throws if no valid hbs template", () => {
      // Prepare
      // Temporarily renaming hbs file
      fs.renameSync(hbsTemplateFilePath, hbsInexistentTemplateFilePath);

      // Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(\.elm\.hbs)'/,
        );
    });

    it("throws if the views dir doesn't exist", () => {
      // Prepare
      // The default views folder does not exists
      engine = new ElmTemplateEngine();

      // Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, scandir '(.*)'/,
        );
    });

    it("throws if there is no project's elm-package.json", () => {
      // Prepare
      fs.unlinkSync(path.join(projectPath, "elm-package.json"));

      // Test/Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(elm-package\.json)'/,
        );
    });

    it("throws if outputed elm doesn't compile", () => {
      // Prepare
      fs.unlinkSync(path.join(projectPath, "invalid", "InvalidView.elm"));

      // Test/Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          "One or more views don't compile. You should check your elm code!",
        );
    }).timeout(30000); // If dependencies have to be downloaded it might take some time

    it("compiles to valid elm code and start a worker", async () => {
      // Test
      const worker = await engine.compile();

      // Assert
      worker.should.be.an.Object().and.have.property("ports");
      worker.ports.should.be.an.Object().and.have.properties("getView", "receiveHtml");
    }).timeout(30000);
  });

  describe("#getView()", () => {
    it("should throw if templates were not compiled", () => true);
    it("should throw if an empty name was provided", () => true);
    it("should throw if the view doesn't exist", () => true);
    it("should return the matching html, including the provided context", () =>
      true);
  });
});

function handleCopyError(
  resolve: (value?: {} | PromiseLike<{}>) => void,
  reject: (reason?: any) => void,
) {
  return (error: any) => {
    if (error) {
      return reject(error);
    }
    return resolve();
  };
}
