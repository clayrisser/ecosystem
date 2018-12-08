import _ from 'lodash';
import path from 'path';
import pkgDir from 'pkg-dir';

export default class Module {
  _config = null;

  _module = null;

  _path = null;

  _pkg = null;

  _properties = null;

  loaderName = '';

  name = '';

  constructor(name, loaderName, { configPath = '' }) {
    this.configPath = configPath;
    this.loaderName = loaderName;
    this.name = name;
  }

  get path() {
    if (this._path) return this._path;
    this._path = pkgDir.sync(
      require.resolve(this.name, {
        paths: [path.resolve(pkgDir.sync(process.cwd()), 'node_modules')]
      })
    );
    return this._path;
  }

  get pkg() {
    if (this._pkg) return this._pkg;
    this._pkg = require(path.resolve(this.path, 'package.json'));
    return this._pkg;
  }

  get properties() {
    if (this._properties) return this._properties;
    let properties = require(path.resolve(
      this.path,
      this.pkg[this.loaderName]
    ));
    properties = properties.__esModule ? properties.default : properties;
    this._properties = properties || {};
    return this._properties;
  }

  get config() {
    if (this._config) return this._config;
    let config = {};
    if (this.configPath.length) {
      config = _.get(this.properties, this.configPath, {});
    }
    this._config = config;
    return this._config;
  }

  import() {
    if (this._module) return this._module;
    const module = require(this.path);
    this._module = module.__esModule ? module.default : module;
    return this._module;
  }
}
