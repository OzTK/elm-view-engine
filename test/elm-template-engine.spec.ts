import "mocha";
import "should";

import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

import ElmTemplateEngine from "../src/elm-template-engine";

const hbsTemplateFilePath = path.join(__dirname, "..", "src", "Main.elm.hbs");
const hbsErrorTemplateFilePath = path.join(__dirname, "..", "src", "Main_notexists.elm.hbs");
// const fixturesPath = path.join(__dirname, "fixtures");

describe("ElmTemplateEngine", () => {
  let engine: ElmTemplateEngine;
  let viewsDirPath: string;

  before(() => {
    engine = new ElmTemplateEngine();
    viewsDirPath = fs.mkdtempSync("views");
  });

  afterEach(() => {
    if (fs.existsSync(hbsErrorTemplateFilePath)) {
      fs.renameSync(hbsErrorTemplateFilePath, hbsTemplateFilePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(hbsErrorTemplateFilePath)) {
      fs.renameSync(hbsErrorTemplateFilePath, hbsTemplateFilePath);
    }
  });

  after(() => {
    rimraf(viewsDirPath, (err) => { err.toString(); /* It's fine */ });
  });

  describe("#compile()", () => {
    it("throws if no valid hbs template", () => {
      // Temporarily renaming hbs file
      fs.renameSync(hbsTemplateFilePath, hbsErrorTemplateFilePath);
      return engine.compile().should.be.rejectedWith(Error);
    });

    it("throws if the views dir doesn't exist", () => {
      return engine.compile().should.be.rejectedWith(Error);
    });

    it("throws if there is no project's elm-package.json", () => true);
    it("throws if outputed elm doesn't compile", () => true);
    it("compiles to valid elm code and start a worker", () => true);
  });

  describe("#getView()", () => {
    it("should throw if templates were not compiled", () => true);
    it("should throw if an empty name was provided", () => true);
    it("should throw if the view doesn't exist", () => true);
    it("should return the matching html, including the provided context", () => true);
  });
});
