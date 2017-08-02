import "mocha";
import "should";

import ViewResult from "../src/view-result";

describe("ViewResult", () => {
  it("has 3 fields: html, error, id", () => {
    const vr = new ViewResult();

    Object.getOwnPropertyNames(vr)
      .should.containEql("html")
      .and.containEql("error")
      .and.containEql("id");
  });
});
