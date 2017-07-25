export default class Options {
  constructor(public viewsDirPath: string = "views",
              public projectRoot: string = process.cwd()) { }
}
