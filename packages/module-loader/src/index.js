import TrailDuck from 'trailduck';
import _ from 'lodash';
import path from 'path';
import pkgDir from 'pkg-dir';
import Module from './module';

export default class ModuleLoader {
  _modules = null;

  _moduleNames = null;

  name = '';

  constructor(name, options = {}) {
    const { configPath = '', dependsOnPath = '' } = options;
    this.configPath = configPath;
    this.dependsOnPath = dependsOnPath;
    this.name = name;
  }

  getUnorderedModuleNames() {
    const projectPath = path.resolve(pkgDir.sync(process.cwd()));
    const pkg = require(path.resolve(projectPath, 'package.json'));
    const moduleNames = _.keys(pkg.dependencies);
    return _.filter(moduleNames, moduleName => {
      return !!require(path.resolve(
        projectPath,
        'node_modules',
        moduleName,
        'package.json'
      ))[this.name];
    });
  }

  getModulesGraph(modules) {
    return _.reduce(
      modules,
      (graph, module, moduleName) => {
        const children = this.dependsOnPath?.length
          ? module.properties[this.dependsOnPath] || []
          : [];
        graph[moduleName] = { children };
        _.each(children, child => {
          if (!graph[child]) graph[child] = { children: [] };
        });
        return graph;
      },
      {}
    );
  }

  getModules() {
    const unorderedModuleNames = this.getUnorderedModuleNames();
    const modules = _.reduce(
      unorderedModuleNames,
      (modules, moduleName) => {
        modules[moduleName] = new Module(moduleName, this.name, {
          configPath: this.configPath
        });
        return modules;
      },
      {}
    );
    const graph = this.getModulesGraph(modules);
    const trailDuck = new TrailDuck(graph);
    const missingDependancies = _.xor(
      unorderedModuleNames,
      _.map(trailDuck.ordered, 'name')
    );
    if (missingDependancies.length) {
      throw new Error(
        `plugin dependencies missing '${missingDependancies.join("', '")}'`
      );
    }
    if (trailDuck.cycles.length) {
      const cyclicalDependancies = _.uniq(_.flatten(trailDuck.cycles));
      throw new Error(
        `cyclical plugin dependencies detected '${cyclicalDependancies.join(
          "', '"
        )}'`
      );
    }
    if (!this._moduleNames) {
      this._moduleNames = _.map(trailDuck.ordered, 'name');
    }
    return _.reduce(
      this._moduleNames,
      (mappedModules, moduleName) => {
        mappedModules[moduleName] = modules[moduleName];
        return mappedModules;
      },
      {}
    );
  }

  get moduleNames() {
    if (this._moduleNames) return this._moduleNames;
    this._modules = this.getModules();
    return this._moduleNames;
  }

  get modules() {
    if (this._modules) return this._modules;
    this._modules = this.getModules();
    return this._modules;
  }
}
