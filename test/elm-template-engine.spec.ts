import "mocha";
import "should";

import * as copy from "copyfiles";
import * as fs from "fs";
import { ncp } from "ncp";
import * as path from "path";
import * as rimraf from "rimraf";

import ElmViewEngine from "../src/elm-view-engine";
import Options from "../src/elm-view-options";

const hbsTemplateFilePath = path.join(__dirname, "..", "src", "Main.elm.hbs");
const hbsInexistentTemplateFilePath = path.join(
  path.dirname(hbsTemplateFilePath),
  "Main_notexists.elm.hbs",
);
const fixturesPath = path.join(__dirname, "fixtures");

describe("ElmViewEngine", () => {
  let engine: ElmViewEngine;
  let viewsDirPath: string;
  let projectPath: string;

  before(() => {
    return new Promise((resolve, reject) => {
      projectPath = path.join(process.cwd(), fs.mkdtempSync("fake_project_"));
      viewsDirPath = path.join(projectPath, "views");

      engine = new ElmViewEngine(new Options(viewsDirPath, projectPath));

      const rdDir = path.join(projectPath, "invalid");
      fs.mkdirSync(rdDir);

      fs.mkdirSync(viewsDirPath);

      // Copying elm-stuff if it exists so that it won't
      // trigger a dl of dependencies during tests (breaks CI build)
      ncp(
        path.join(fixturesPath, "elm-stuff"),
        path.join(projectPath, "elm-stuff"),
        () => {
          const files = fs.readdirSync(fixturesPath);
          copy(
            files
              .filter(
                f => f.endsWith("View.elm") && !f.endsWith("InvalidView.elm"),
              )
              .map(f => path.join(fixturesPath, f))
              .concat([viewsDirPath]),
            true,
            handleCopyError(resolve, reject),
          );
        },
      );
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
    beforeEach(() => {
      engine = new ElmViewEngine(new Options(viewsDirPath, projectPath));

      // moving sample elm-package.json
      return new Promise((resolve, reject) => {
        copy(
          [path.join(fixturesPath, "elm-package.json"), projectPath],
          true,
          handleCopyError(resolve, reject),
        );

        copy(
          [
            path.join(fixturesPath, "InvalidView.elm"),
            path.join(projectPath, "invalid"),
          ],
          true,
          handleCopyError(resolve, reject),
        );
      });
    });

    it("throws if no valid hbs template", () => {
      // Prepare
      // Temporarily renaming hbs file
      fs.renameSync(hbsTemplateFilePath, hbsInexistentTemplateFilePath);

      // Test
      const compiler = engine.compile();

      // Cleanup
      const cleanup = () =>
        fs.renameSync(hbsInexistentTemplateFilePath, hbsTemplateFilePath);
      compiler.then(cleanup).catch(cleanup);

      // Assert
      return compiler.should.be.rejectedWith(
        /ENOENT: no such file or directory, open '(.*)(\.elm\.hbs)'/,
      );
    });

    it("throws if the views dir doesn't exist", () => {
      // Prepare
      // The default views folder does not exists
      engine = new ElmViewEngine();

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
    }).timeout(300000); // If dependencies have to be downloaded it might take some time

    it("compiles to valid elm code and start a worker", async () => {
      // Test
      const worker = await engine.compile();

      // Assert
      worker.should.be.an.Object().and.have.property("ports");
      worker.ports.should.be.an
        .Object()
        .and.have.properties("getView", "receiveHtml");
    }).timeout(3000000);
  });

  describe("#getView()", () => {
    before(function(this: Mocha.IHookCallbackContext) {
      this.timeout(3000000);
      return engine.compile();
    });

    it("throws if templates were not compiled", () => {
      // Prepare
      const uncompiled = new ElmViewEngine(
        new Options(viewsDirPath, projectPath),
      );

      return uncompiled
        .getView("MyView")
        .should.be.rejectedWith(
          "Views need to be compiled before rendering them",
        );
    });

    it("throws if no view name was provided", () => {
      // Test/Assert
      return engine
        .getView("")
        .should.be.rejectedWith("If you pass no name, you get no view!");

      // Question of the day: How do I test something doable in js but not in ts ??
      // engine.getView(null).should.be.rejectedWith(errMsg);
      // engine.getView(undefined).should.be.rejectedWith(errMsg);
    });

    it("throws if the view doesn't exist", () => {
      return engine
        .getView("ViewDoesntExist")
        .should.be.rejectedWith("View was not found");
    });

    it("returns the matching view that doesn't have a context", async () => {
      // Prepare
      const usersExpectedView = fs.readFileSync(
        path.join(fixturesPath, "UsersView.html"),
        "UTF-8",
      );
      const otherExpectedView = fs.readFileSync(
        path.join(fixturesPath, "OtherView.html"),
        "UTF-8",
      );

      // Test
      const usersActualView = await engine.getView("UsersView");
      const otherActualView = await engine.getView("OtherView");

      // Assert
      removeFormat(usersActualView).should.be.equal(
        removeFormat(usersExpectedView),
      );
      removeFormat(otherActualView).should.be.equal(
        removeFormat(otherExpectedView),
      );
    });

    it("throws if an invalid context is provided", () => {
      // Prepare
      const fakeContext = { fakeProperty: "fakeValue" };

      // Test/Assert
      return engine
        .getView("HasContextView", fakeContext)
        .should.be.rejectedWith("Invalid context for this view");
    });

    it("returns the matching view rendering its context", () => {
      // Prepare
      const context = { simpleName: "test passed" };
      const contextExpectedView = fs.readFileSync(
        path.join(fixturesPath, "HasContextView.html"),
        "UTF-8",
      );

      // Test/Assert
      return engine
        .getView("HasContextView", context)
        .should.eventually.be.equal(removeFormat(contextExpectedView));
    });

    const removeFormat = (html: string) =>
      html.replace(/[\n\r\t]*/g, "").replace(/>[ ]+</g, "><");
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
