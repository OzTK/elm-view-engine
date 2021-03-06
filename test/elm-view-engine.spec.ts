import "mocha";
import "should";

import * as fs from "fs";
import * as path from "path";

import MockProjectHelper from "./mock-project-helper";

import ElmViewEngine from "../src/elm-view-engine";
import Options from "../src/elm-view-options";
import ImportCompiledViewsError from "../src/import-compiled-views-error";

const HBS_TEMPLATE_PATH = path.join(__dirname, "..", "src", "Main.elm.hbs");
const HBS_NONEXISTENT_TEMPLATE_PATH = path.join(
  path.dirname(HBS_TEMPLATE_PATH),
  "Main_notexists.elm.hbs"
);
const FIXTURES_PATH = path.join(__dirname, "fixtures");
const COMPILE_TIMEOUT = 1800000;

describe("ElmViewEngine", () => {
  let engine: ElmViewEngine;
  let engineOptions: Options;
  let mockHelper: MockProjectHelper;

  before(async () => {
    mockHelper = await MockProjectHelper.createProject(FIXTURES_PATH);
    engineOptions = new Options(mockHelper.viewsPath, mockHelper.projectPath);
    engine = new ElmViewEngine(engineOptions);
  });

  after(() => {
    return mockHelper.deleteProject();
  });

  describe("#compile()", () => {
    afterEach(() => mockHelper.restoreFiles());

    it("throws if no valid hbs template", async () => {
      // Prepare
      // Temporarily renaming hbs file
      fs.renameSync(HBS_TEMPLATE_PATH, HBS_NONEXISTENT_TEMPLATE_PATH);

      // Test
      const compiler = engine.compile();

      // Cleanup
      const cleanup = () =>
        fs.renameSync(HBS_NONEXISTENT_TEMPLATE_PATH, HBS_TEMPLATE_PATH);
      await compiler.then(cleanup).catch(cleanup);

      // Assert
      return compiler.should.be.rejectedWith(
        /ENOENT: no such file or directory, open '(.*)(\.elm\.hbs)'/
      );
    });

    it("throws if the views dir doesn't exist", () => {
      // Prepare
      // The default views folder does not exists
      return mockHelper.deleteViewsDir().then(() =>
        // Test/Assert
        engine
          .compile()
          .should.be.rejectedWith(
            /ENOENT: no such file or directory, scandir '(.*)'/
          )
      );
    });

    it("throws if there is no project's elm-package.json", () => {
      // Prepare
      mockHelper.deletePackageConfigSync();

      // Test/Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(elm-package\.json)'/
        );
    });

    it("throws if outputed elm doesn't compile", () => {
      // Prepare
      mockHelper.deleteExternalViewSync();

      // Test/Assert
      return engine.compile().should.be.rejected();
    }).timeout(COMPILE_TIMEOUT); // If dependencies have to be downloaded it might take some time

    context("when using multipart module names", () => {
      let multipartEngine: ElmViewEngine;

      before(async () => {
        await mockHelper.importMultipartModule();
        multipartEngine = new ElmViewEngine(
          new Options(
            path.join(mockHelper.viewsPath, "UI"),
            mockHelper.projectPath
          )
        );
      });

      it("successfully compiles the views", async () => {
        // Test
        const modulePath = await multipartEngine.compile();

        // Assert
        modulePath.should.be.a
          .String()
          .and.be.equal(
            path.join(multipartEngine.options.viewsDirPath, "views.compiled.js")
          );

        const moduleExists = fs.existsSync(modulePath);
        moduleExists.should.be.true();
      }).timeout(COMPILE_TIMEOUT);
    });

    it("compiles to valid elm code and outputs the module's js file", async () => {
      // Test
      const modulePath = await engine.compile();

      // Assert
      modulePath.should.be.a
        .String()
        .and.be.equal(
          path.join(engineOptions.viewsDirPath, "views.compiled.js")
        );

      const moduleExists = fs.existsSync(modulePath);
      moduleExists.should.be.true();
    }).timeout(COMPILE_TIMEOUT);
    
    it("compiles twice in a row giving the same result", async () => {
      // Test
      const module1Path = await engine.compile();
      const compilation1 = fs.readFileSync(module1Path, "UTF-8");
      const module2Path = await engine.compile();
      const compilation2 = fs.readFileSync(module2Path, "UTF-8");

      // Assert
      module1Path.should.be.equal(module2Path);
      compilation1.should.be.equal(compilation2);
    }).timeout(COMPILE_TIMEOUT);
  });

  describe("#needsCompilation()", () => {
    before(() => {
      engine = new ElmViewEngine(engineOptions);
    });

    afterEach(() => {
      return mockHelper.restoreFiles();
    });

    it("returns true if the engine was not compiled before", () => {
      return engine.needsCompilation().should.eventually.be.true();
    });

    it("returns false if compiled views exist", async () => {
      // Prepare
      await mockHelper.importCompiledViews();

      // Test/Assert
      return engine.needsCompilation().should.eventually.be.false();
    });

    it("returns false after a successful compilation", async () => {
      // Prepare
      await engine.compile();

      // Test/Assert
      return engine.needsCompilation().should.eventually.be.false();
    }).timeout(COMPILE_TIMEOUT);
  });

  describe("#getView()", () => {
    before(async function(this: Mocha.IHookCallbackContext) {
      this.timeout(COMPILE_TIMEOUT);
      return engine.compile();
    });

    after(() => mockHelper.restoreFiles());

    it("throws if templates were not compiled", () => {
      // Prepare
      const uncompiled = new ElmViewEngine();

      return uncompiled
        .getView("MyView")
        .should.be.rejectedWith(
          "Views need to be compiled before rendering them"
        );
    });

    it("throws if no view name was provided", () => {
      // Prepare
      const errMsg = "If you pass no name, you get no view!";

      // Test/Assert
      return Promise.all([
        engine.getView("").should.be.rejectedWith(errMsg),
        engine.getView(null).should.be.rejectedWith(errMsg),
        engine.getView().should.be.rejectedWith(errMsg),
      ]);
    });

    it("throws if the view doesn't exist", () => {
      return engine
        .getView("ViewDoesntExist")
        .should.be.rejectedWith("View was not found: ViewDoesntExist");
    });

    it("returns the matching view that doesn't have a context", async () => {
      // Prepare
      const usersExpectedView = fs.readFileSync(
        path.join(FIXTURES_PATH, "UsersView.html"),
        "UTF-8"
      );
      const otherExpectedView = fs.readFileSync(
        path.join(FIXTURES_PATH, "OtherView.html"),
        "UTF-8"
      );

      // Test
      const usersActualView = await engine.getView("UsersView");
      const otherActualView = await engine.getView("OtherView");

      // Assert
      removeFormat(usersActualView).should.be.equal(
        removeFormat(usersExpectedView)
      );
      removeFormat(otherActualView).should.be.equal(
        removeFormat(otherExpectedView)
      );
    });

    it("throws if an invalid context is provided", () => {
      // Prepare
      const fakeContext = { fakeProperty: "fakeValue" };

      // Test/Assert
      return engine
        .getView("HasContextView", fakeContext)
        .should.be.rejectedWith("Invalid context for this view: Expecting an object with a field named `simpleName` but instead got: {\"fakeProperty\":\"fakeValue\"}");
    });

    it("returns the matching view rendering its context", () => {
      // Prepare
      const context = { simpleName: "test passed" };
      const contextExpectedView = fs.readFileSync(
        path.join(FIXTURES_PATH, "HasContextView.html"),
        "UTF-8"
      );

      // Test/Assert
      return engine
        .getView("HasContextView", context)
        .should.eventually.be.equal(removeFormat(contextExpectedView));
    });

    it("returns the right view for the right context", async () => {
      // Prepare
      const contexts: Array<{ simpleName: string }> = [
        "paul",
        "mary",
        "matthew",
        "john",
        "fred",
        "julien",
        "aurelia",
        "harry",
        "anne",
        "end",
      ].map(name => ({
        simpleName: name,
      }));

      // Test/Assert
      return Promise.all(
        contexts.map(c =>
          engine
            .getView("HasContextView", c)
            .should.eventually.be.a.String()
            .which.containEql(c.simpleName)
        )
      );
    });

    context("when compiled views js module exists", () => {
      let moduleExistEngine: ElmViewEngine;
      before(() => mockHelper.importCompiledViews());

      beforeEach(() => {
        moduleExistEngine = new ElmViewEngine(engineOptions);
      });

      afterEach(() => mockHelper.restoreFiles());

      it("fails if the compiled views are not a valid expected module", async () => {
        // Prepare
        await mockHelper.importCompiledViews(true);

        // Test/Assert
        return moduleExistEngine
          .getView("UsersView")
          .should.be.rejectedWith(ImportCompiledViewsError);
      });

      it("returns views properly without needing to compile beforehand", async () => {
        // Prepare
        await mockHelper.importCompiledViews();
        const usersExpectedView = fs.readFileSync(
          path.join(FIXTURES_PATH, "UsersView.html"),
          "UTF-8"
        );

        // Test
        const usersActualView = await moduleExistEngine.getView("UsersView");

        // Assert
        removeFormat(usersActualView).should.be.equal(
          removeFormat(usersExpectedView)
        );
      });
    });

    context("when watching compiled views", () => {
      let watchEngine: ElmViewEngine;

      before(() => {
        return mockHelper
          .restoreFiles()
          .then(() => mockHelper.importCompiledViews());
      });

      beforeEach(() => (watchEngine = new ElmViewEngine(engineOptions)));

      it("updates worker everytime js module is modified", async () => {
        const shouldRender = watchEngine
          .getView("UsersView")
          .should.be.fulfilled();

        await mockHelper.importCompiledViews(true);

        const shouldFail = new Promise(resolve => {
          setTimeout(
            () =>
              resolve(watchEngine.getView("UsersView").should.be.rejected()),
            10000
          );
        });
        return Promise.all([shouldRender, shouldFail]);
      }).timeout(COMPILE_TIMEOUT);
    });

    context("when views have multipart module names", () => {
      let multipartEngine: ElmViewEngine;

      before(async function(this: Mocha.IHookCallbackContext) {
        this.timeout(COMPILE_TIMEOUT);
        await mockHelper.restoreFiles();
        await mockHelper.importMultipartModule();
        multipartEngine = new ElmViewEngine(
          new Options(
            path.join(mockHelper.viewsPath, "UI"),
            mockHelper.projectPath
          )
        );

        return multipartEngine.compile();
      });

      it("successfully gets the view when passing the full module name", () => {
        return multipartEngine
          .getView("UI.MultipartModule")
          .should.be.fulfilled();
      });

      it("successfully gets the view when passing only the last part of the module name", () => {
        return multipartEngine.getView("MultipartModule").should.be.fulfilled();
      });

      it("returns the same view whether using fully or not fully qualified module name", async () => {
        const v1 = await multipartEngine
          .getView("UI.MultipartModule")
          .should.be.fulfilled();
        const v2 = await multipartEngine
          .getView("MultipartModule")
          .should.be.fulfilled();

        return removeFormat(v1).should.be.equal(removeFormat(v2));
      });
    });

    const removeFormat = (html: string) =>
      html.replace(/[\n\r\t]*/g, "").replace(/>[ ]+</g, "><");
  });
});
