import "mocha";
import "should";

import * as copy from "copyfiles";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

import ElmTemplateEngine from "../src/elm-template-engine";
import Options from "../src/elm-template-options";

const hbsTemplateFilePath = path.join(__dirname, "..", "src", "Main.elm.hbs");
const hbsErrorTemplateFilePath = path.join(
  __dirname,
  "..",
  "src",
  "Main_notexists.elm.hbs",
);
const fixturesPath = path.join(__dirname, "fixtures");

describe("ElmTemplateEngine", () => {
  let engine: ElmTemplateEngine;
  let viewsDirPath: string;

  before(() => {
    return new Promise((resolve, reject) => {
      viewsDirPath = path.join(process.cwd(), fs.mkdtempSync("views"));
      const files = fs.readdirSync(fixturesPath);
      copy(
        files
          .filter(f => f.endsWith("View.elm") && !f.endsWith("InvalidView.elm"))
          .map(f => path.join(fixturesPath, f))
          .concat([viewsDirPath]),
        true,
        error => {
          if (error) {
            return reject(error);
          }

          return resolve();
        },
      );
    });
  });

  beforeEach(() => {
    engine = new ElmTemplateEngine(new Options(viewsDirPath));
  });

  afterEach(() => {
    return new Promise((resolve) => {
      try {
        fs.renameSync(hbsErrorTemplateFilePath, hbsTemplateFilePath);
      } catch (err) {
        // Ignore the error
      } finally {
        rimraf.sync(ElmTemplateEngine.GENERATION_DIR_PATH);
        rimraf(ElmTemplateEngine.GENERATION_DIR_PATH, () => {
          resolve();
        });
      }
    });
  });

  after(() => {
    return new Promise((resolve, reject) => {
      rimraf.sync(viewsDirPath);
      rimraf(viewsDirPath, err => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  });

  describe("#compile()", () => {
    it("throws if no valid hbs template", () => {
      // Temporarily renaming hbs file
      fs.renameSync(hbsTemplateFilePath, hbsErrorTemplateFilePath);
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(\.elm\.hbs)'/,
        );
    });

    it("throws if the views dir doesn't exist", () => {
      engine = new ElmTemplateEngine(); // The default views folder does not exists
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, scandir '(.*)'/,
        );
    });

    it("throws if there is no project's elm-package.json", () => {
      return engine
        .compile()
        .should.be.rejectedWith(
          /ENOENT: no such file or directory, open '(.*)(elm-package\.json)'/,
        );
    });

    it("generates a Main.elm file", async () => {
      // Preparing
      const expected = fs.readFileSync(path.join(fixturesPath, "Main.elm"), "UTF-8");

      // Testing
      const outFile = await engine.compile();
      const fileContent = fs.readFileSync(outFile, "UTF-8");

      // Asserting
      outFile.should.be.equal(ElmTemplateEngine.ELM_MODULE_PATH);
      fs.existsSync(outFile).should.be.true();
      fileContent.should.match(expected);
    });

    it("throws if outputed elm doesn't compile", () => true);

    it("compiles to valid elm code and start a worker", () => true);
  });

  describe("#getView()", () => {
    it("should throw if templates were not compiled", () => true);
    it("should throw if an empty name was provided", () => true);
    it("should throw if the view doesn't exist", () => true);
    it("should return the matching html, including the provided context", () =>
      true);
  });
});
