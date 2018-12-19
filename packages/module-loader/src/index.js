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

  get modules() {
    if (this._modules) return this._modules;
    const modules = _.reduce(
      this.moduleNames,
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
      this.moduleNames,
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
    const orderedModules = _.reduce(
      _.reverse(_.map(trailDuck.ordered, 'name')),
      (orderedModules, moduleName) => {
        orderedModules[moduleName] = modules[moduleName];
        return orderedModules;
      },
      {}
    );
    this._modules = orderedModules;
    return this._modules;
  }
}
