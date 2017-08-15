export default class ImportCompiledViewsError extends Error {
  constructor(public readonly internalError: Error) {
    super("There is a problem with compiled views");
    this.message = "There is a problem with compiled views. You should try recompiling.";
  }
}