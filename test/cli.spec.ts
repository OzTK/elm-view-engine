import "mocha";
import * as should from "should";

import * as program from "commander";
import * as fs from "fs";
import * as path from "path";
import MockProjectHelper from "./mock-project-helper";

import { compile, createOptions } from "../src/cli";
import Options from "../src/elm-view-options";

const COMPILE_TIMEOUT = 1800000;

describe("elm-view-engine (CLI)", () => {
  describe("#createOptions", () => {
    it("always returns an option object", () => {
      createOptions().should.be.an.instanceOf(Options);
      createOptions(program).should.be.an.instanceOf(Options);
    });

    it("sets the views dir to the views param of the program", () => {
      program.views = "myviews";
      // stub(program, "views").returns("myviews");
      createOptions(program).viewsDirPath.should.be.equal("myviews");
      createOptions(program).compilePath.should.be.equal("myviews");
    });
  });

  describe("#compile", () => {
    let helper: MockProjectHelper;

    before(async () => {
      helper = await MockProjectHelper.createProject(path.join(__dirname, "fixtures"));
    });

    after(() => {
      return helper.deleteProject();
    });

    it("compiles to a valid js module", async () => {
      // Prepare
      program.views = helper.viewsPath;
      program.project = helper.projectPath;

      // Test
      const options = createOptions(program);
      await compile(options);

      // Assert
      should.exist(fs.statSync(path.join(helper.viewsPath, "views.compiled.js")));
    }).timeout(COMPILE_TIMEOUT);
    
    it("compiles to the passed location", async () => {
      // Prepare
      program.views = helper.viewsPath;
      program.project = helper.projectPath;
      program.out = helper.projectPath;

      // Test
      const options = createOptions(program);
      await compile(options);

      // Assert
      should.exist(fs.statSync(path.join(helper.projectPath, "views.compiled.js")));
    }).timeout(COMPILE_TIMEOUT);
  });
});