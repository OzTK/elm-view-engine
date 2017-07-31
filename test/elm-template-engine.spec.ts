import "mocha";
import "should";

import * as fs from "fs";
import * as path from "path";

import MockProjectHelper from "./mock-project-helper";

import ElmViewEngine from "../src/elm-view-engine";
import Options from "../src/elm-view-options";

const HBS_TEMPLATE_PATH = path.join(__dirname, "..", "src", "Main.elm.hbs");
const HBS_NONEXISTENT_TEMPLATE_PATH = path.join(
  path.dirname(HBS_TEMPLATE_PATH),
  "Main_notexists.elm.hbs",
);
const FIXTURES_PATH = path.join(__dirname, "fixtures");
const COMPILE_TIMEOUT = 1800000;

describe("ElmViewEngine", () => {
  let engine: ElmViewEngine;
  let mockHelper: MockProjectHelper;

  before(async () => {
    mockHelper = await MockProjectHelper.createProject(FIXTURES_PATH);
    engine = new ElmViewEngine(
      new Options(mockHelper.viewsPath, mockHelper.projectPath),
    );
  });

  after(() => {
    return mockHelper.deleteProject();
  });

  describe("#compile()", () => {
    afterEach(function(this: Mocha.IHookCallbackContext) {
      // this.timeout(30000);
      return mockHelper.restoreFiles();
    });

    it("throws if no valid hbs template", () => {
      // Prepare
      // Temporarily renaming hbs file
      fs.renameSync(HBS_TEMPLATE_PATH, HBS_NONEXISTENT_TEMPLATE_PATH);

      // Test
      const compiler = engine.compile();

      // Cleanup
      const cleanup = () =>
        fs.renameSync(HBS_NONEXISTENT_TEMPLATE_PATH, HBS_TEMPLATE_PATH);
      compiler.then(cleanup).catch(cleanup);

      // Assert
      return compiler.should.be.rejectedWith(
        /ENOENT: no such file or directory, open '(.*)(\.elm\.hbs)'/,
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
            /ENOENT: no such file or directory, scandir '(.*)'/,
          ),
      );
    });

    it("throws if there is no project's elm-package.json", () => {
      // Prepare
      mockHelper.deletePackageConfigSync();

      // Test/Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(elm-package\.json)'/,
        );
    });

    it("throws if outputed elm doesn't compile", () => {
      // Prepare
      mockHelper.deleteExternalViewSync();

      // Test/Assert
      return engine
        .compile()
        .should.be.rejectedWith(
          "One or more views don't compile. You should check your elm code!",
        );
    }).timeout(COMPILE_TIMEOUT); // If dependencies have to be downloaded it might take some time

    it("compiles to valid elm code and start a worker", async () => {
      // Test
      const worker = await engine.compile();

      // Assert
      worker.should.be.an.Object().and.have.property("ports");
      worker.ports.should.be.an
        .Object()
        .and.have.properties("getView", "receiveHtml");
    }).timeout(COMPILE_TIMEOUT);
  });

  describe("#getView()", () => {
    before(function(this: Mocha.IHookCallbackContext) {
      this.timeout(COMPILE_TIMEOUT);
      return engine.compile();
    });

    it("throws if templates were not compiled", () => {
      // Prepare
      const uncompiled = new ElmViewEngine();

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
        path.join(FIXTURES_PATH, "UsersView.html"),
        "UTF-8",
      );
      const otherExpectedView = fs.readFileSync(
        path.join(FIXTURES_PATH, "OtherView.html"),
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
        path.join(FIXTURES_PATH, "HasContextView.html"),
        "UTF-8",
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
            .which.containEql(c.simpleName),
        ),
      );
    });

    const removeFormat = (html: string) =>
      html.replace(/[\n\r\t]*/g, "").replace(/>[ ]+</g, "><");
  });
});
