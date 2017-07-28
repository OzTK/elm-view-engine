declare interface ElmCompiler {
  compile(): any;
  compileSync(): any;
  compileWorker(projectDir: string, modulePath: string, moduleName?: string, flags?: any): Promise<ElmComponent<any>>;
  compileToString(sources: string, options: any): Promise<string>;
  findAllDependencies(modulePath: string, knownDependencies?: string[], sourceDirectories?: string[], knownFiles?: string[]): Promise<string[]>;
}

declare const compiler: ElmCompiler;

export = compiler;