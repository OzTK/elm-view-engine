export default class ImportCompiledViewsError extends Error {
  constructor(public readonly internalError: Error) {
    super("Views are not compiled properly");
    this.message = "The compiled views module is not valid. You should try recompiling.";
  }
}