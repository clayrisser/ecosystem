import Module from 'module';
import _ from 'lodash';
import path from 'path';
import pkgDir from 'pkg-dir';

export default class ModuleLoader {
  _modules = null;

  _moduleNames = null;

  name = '';

  constructor(name) {
    this.name = name;
  }

  get moduleNames() {
    if (this._moduleNames) return this._moduleNames;
    const projectPath = path.resolve(pkgDir.sync(process.cwd()));
    const pkg = require(path.resolve(projectPath, 'package.json'));
    const moduleNames = _.keys(pkg.dependencies);
    this._moduleNames = _.filter(moduleNames, moduleName => {
      return !!require(path.resolve(
        projectPath,
        'node_modules',
        moduleName,
        'package.json'
      ))[this.name];
    });
    return this._moduleNames;
  }

  get modules() {
    if (this._modules) return this._modules;
    this._modules = _.reduce(
      this.moduleNames,
      (modules, moduleName) => {
        modules[moduleName] = new Module(moduleName, this.name);
        return modules;
      },
      {}
    );
    return this._modules;
  }
}
