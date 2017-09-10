import "mocha";
import "should";

import * as express from "express";
import * as path from "path";
import { stub } from "sinon";

import { __express, configure, ElmViewEngine, Options, reset } from "../src";
import MockProjectHelper from "./mock-project-helper";

const COMPILE_TIMEOUT = 1800000;

describe("module entry point", () => {
  let mockProject: MockProjectHelper;
  let engineStub: ElmViewEngine;

  before(async () => {
    mockProject = await MockProjectHelper.createProject(
      path.join(__dirname, "fixtures"),
    );

    engineStub = new ElmViewEngine(
      new Options(mockProject.viewsPath, mockProject.projectPath),
    );
    stubEngine(engineStub);
  });

  beforeEach(() => mockProject.restoreFiles());
  after(() => mockProject.deleteProject());

  describe("#__express", () => {
    beforeEach(() => {
      reset();
    });

    it("throws if the engine instance was not configured prior to the call", () => {
      return __express(
        path.join(mockProject.viewsPath, "UsersView"),
        {},
      ).should.be.rejectedWith(
        "#configure must be called before calling #__express",
      );
    });

    context("when a required elm module was deleted", () => {
      beforeEach(async function(this: Mocha.IHookCallbackContext) {
        this.timeout(COMPILE_TIMEOUT);
        mockProject.deleteExternalViewSync();

        try {
          await configure(
            new Options(mockProject.viewsPath, mockProject.projectPath),
          );
          throw new Error("configure should fail");
        } catch (err) {
          if (err.message === "configure should fail") {
            throw err;
          }
        }
      });

      it("throws if the engine instance failed to configure prior to the call", async () => {
        await __express(
          path.join(mockProject.viewsPath, "OtherView.elm"),
          {},
        ).should.be.rejectedWith(
          "The compiled views module is not valid. You should try recompiling.",
        );
      });
    });

    it("returns the engine result", async () => {
      // Prepare
      await configure(engineStub);

      // Test/Assert
      return __express(
        path.join(mockProject.viewsPath, "HasContextView.elm"),
        "paul",
      ).should.eventually.be.a
        .String()
        .and.containEql("paul");
    });

    it("throws if the view rendering failed", async () => {
      // Prepare
      const customEngine = stubEngine(new ElmViewEngine(), true);
      await configure(customEngine);

      // Test/Assert
      return __express("Anything.elm", {}).should.be.rejectedWith(
        "VIEW FAILED",
      );
    });
  });

  describe("#configure", () => {
    afterEach(() => mockProject.restoreFiles());

    it("throws to configure if options are not valid", () => {
      return configure().should.be.rejected();
    });

    it("throws if configure is called while compiling", async () => {
      // Prepare
      const pendingCompilation = configure(engineStub).catch(() => {
        return;
      });

      // Test/Assert
      const results = configure(engineStub).should.be.rejectedWith(
        "There is already a compilation in progress",
      );

      // Clean
      await pendingCompilation;

      return results;
    });

    it("returns a view engine", () => {
      return configure(engineStub).should.eventually.have.properties(
        "compile",
        "getView",
      );
    });

    it("succeeds if #configure, #reset or #__express is called during compilation", () => {
      const compiler = configure(engineStub);
      configure(engineStub).catch(() => true);
      reset();
      __express("Anything", {}, () => {
        return;
      });

      return compiler.should.be.fulfilled();
    });

    it("doesn't fail if a wrong express app is passed", () => {
      // Prepare
      const customEngine = stubEngine(
        new ElmViewEngine(
          new Options(mockProject.viewsPath, mockProject.projectPath, {
            anything: "pointless",
          }),
        ),
      );

      // Test/Assert
      return configure(customEngine).should.eventually.have.properties(
        "compile",
        "getView",
      );
    });

    it("configures express app if passed", async () => {
      // Prepare
      const app = express();
      let isEngineSet: boolean = false;
      stub(app, "engine").callsFake(() => {
        isEngineSet = true;
      });
      const customEngine = stubEngine(
        new ElmViewEngine(
          new Options(mockProject.viewsPath, mockProject.projectPath, app),
        ),
      );

      // Test
      const eng = await configure(customEngine);

      // Assert
      eng.should.have.properties("compile", "getView");
      app.get("views").should.be.equal(mockProject.viewsPath);
      app.get("view engine").should.be.equal("elm");
      isEngineSet.should.be.true();
    });

    it("compiles sources when forceCompilation is true (even if module is here)", async () => {
      // Prepare
      await mockProject.importCompiledViews();

      // Test
      const start = process.hrtime();
      const eng = await configure(
        new Options(
          mockProject.viewsPath,
          mockProject.projectPath,
          undefined,
          true,
        ),
      );
      const time = process.hrtime(start);

      // Assert
      eng.should.be.an.Object();
      time[0].should.be.greaterThanOrEqual(1);
    }).timeout(COMPILE_TIMEOUT);

    it("does not does compiles sources when forceCompilation is not set/false and there is already a js module", async () => {
      // Prepare
      await mockProject.importCompiledViews();

      // Test
      const start = process.hrtime();
      const eng = await configure(
        new Options(mockProject.viewsPath, mockProject.projectPath),
      );
      const time = process.hrtime(start);

      // Assert
      eng.should.be.an.Object();
      time[0].should.be.equal(0);
      time[1].should.be.lessThanOrEqual(500 * 10000);
    });
  });

  describe("#reset", () => {
    it("forces the engine to be reconfigured", async () => {
      // Prepare
      await configure(engineStub);

      // Test
      const success = reset();

      // Assert
      success.should.be.true();
      return __express("anything.elm", {}).should.be.rejectedWith(
        "Views need to be compiled before rendering them",
      );
    });

    it("fails to reset if the engine is compiling", async () => {
      // Prepare
      configure(engineStub);

      // Test/Assert
      reset().should.be.false();
    });
  });
});

function stubEngine(
  engineToStub: ElmViewEngine,
  getViewFails: boolean = false,
) {
  stub(engineToStub, "compile").returns(Promise.resolve());
  stub(engineToStub, "getView").callsFake((viewName: string, context?: any) => {
    return getViewFails
      ? Promise.reject(new Error("VIEW FAILED"))
      : Promise.resolve(viewName + ": " + context);
  });
  stub(engineToStub, "needsCompilation").returns(Promise.resolve(false));
  return engineToStub;
}
