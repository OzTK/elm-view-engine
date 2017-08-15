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

  after(() => {
    return mockProject.deleteProject();
  });

  describe("#configure", () => {
    afterEach(() => mockProject.restoreFiles());

    it("throws to configure if options are not valid", () => {
      return configure().should.be.rejected();
    });

    it("returns a view engine", () => {
      return configure(engineStub).should.eventually.have.properties(
        "compile",
        "getView",
      );
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
      mockProject.importCompiledViews();

      // Test
      const start = process.hrtime();
      const eng = await configure(new Options(mockProject.viewsPath, mockProject.projectPath, undefined, true));
      const time = process.hrtime(start);

      // Assert
      eng.should.be.an.Object();
      time[0].should.be.greaterThanOrEqual(1);
    }).timeout(COMPILE_TIMEOUT);
  });

  describe("#__express", () => {
    beforeEach(() => {
      reset();
    });

    it("throws if the engine instance was not configured prior to the call", () => {
      return __express(
        path.join(mockProject.viewsPath, "UsersView"),
        {},
        () => true,
      ).should.be.rejectedWith(
        "configure() must be called before trying to call __express()",
      );
    });

    context("when a required elm module was deleted", () => {
      before(async function(this: Mocha.IHookCallbackContext) {
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
          path.join(mockProject.viewsPath, "OtherView"),
          {},
          () => true,
        ).should.be.rejectedWith(
          "Views need to be compiled before rendering them",
        );
      });
    });

    it("returns the engine result", async () => {
      // Prepare
      await configure(engineStub);

      // Test/Assert
      return __express(
        path.join(mockProject.viewsPath, "HasContextView"),
        "paul",
        () => true,
      ).should.eventually.be.a
        .String()
        .and.containEql("paul");
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
      return __express("anything.elm", {}, () => true).should.be.rejectedWith(
        "configure() must be called before trying to call __express()",
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

function stubEngine(engine: ElmViewEngine) {
  stub(engine, "compile").returns(new Promise(resolve => resolve()));
  stub(engine, "getView").callsFake((viewName: string, context?: any) => {
    viewName.toString();
    return new Promise(resolve => resolve(context));
  });
  return engine;
}
