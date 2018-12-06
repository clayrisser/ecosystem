import _ from 'lodash';
import deasync from 'deasync';
import mergeConfiguration from 'merge-configuration';
import rcConfig from 'rc-config';
import Socket from './socket';

let socket = null;
export const configLoaders = {};

export default class ConfigLoader {
  _config = null;
  _modulesConfig = null;
  _optionsConfig = null;
  _userConfig = null;
  cache = true;
  defaultConfig = {};
  initialOptionsConfig = {};
  level = 1;
  loaders = [];
  name = '';
  socket = false;

  constructor(
    name,
    {
      cache = true,
      defaultConfig = {},
      level = 1,
      loaders = [],
      optionsConfig = {},
      socket = false
    }
  ) {
    this.cache = cache;
    this.defaultConfig = defaultConfig;
    this.initialOptionsConfig = optionsConfig;
    this.level = level;
    this.loaders = loaders;
    this.name = name;
    this.socket = socket;
    this.handleSocket();
  }

  handleSocket() {
    if (this.socket) {
      configLoaders[this.name] = this;
      if (!socket) {
        socket = new Socket(_.isPlainObject(this.socket) ? this.socket : {});
        socket.start();
      }
      this.socket = socket;
    }
  }

  getConfigSync(...args) {
    let error = null;
    const getConfigSync = deasync(async (...args) => {
      const done = args.pop();
      const config = await this.getConfig(...args).catch(err => {
        error = err;
        done();
      });
      return done(null, config);
    });
    const result = getConfigSync(...args);
    if (error) throw error;
    return result;
  }

  get config() {
    return this.getConfigSync();
  }

  async getModuleConfig() {
    if (this.cache && this._modulesConfig) return this._modulesConfig;
    const modulesConfig = _.reduce(
      this.loaders,
      (config, loader) => {
        _.each(loader.modules, module => {
          config = mergeConfiguration(config, module.config, {
            level: this.level
          });
        });
        return config;
      },
      {}
    );
    if (this.cache) this._modulesConfig = modulesConfig;
    return modulesConfig;
  }

  async getOptionsConfig() {
    if (this.cache && this._optionsConfig) return this._optionsConfig;
    const optionsConfig =
      typeof this.initialOptionsConfig === 'string'
        ? JSON.parse(this.initialOptionsConfig)
        : this.initialOptionsConfig;
    if (this.cache) this._optionsConfig = optionsConfig;
    return optionsConfig;
  }

  async getUserConfig() {
    if (this.cache && this._userConfig) return this._userConfig;
    const userConfig = rcConfig({ name: this.name });
    if (this.cache) this._userConfig = userConfig;
    return userConfig;
  }

  async getConfig() {
    if (this.cache && this._config) return this._config;
    let config = { ...this.defaultConfig };
    config = mergeConfiguration(config, await this.getModuleConfig(), {
      level: this.level
    });
    config = mergeConfiguration(config, await this.getUserConfig(), {
      level: this.level
    });
    config = mergeConfiguration(config, await this.getOptionsConfig(), {
      level: this.level
    });
    if (this.cache) this._config = config;
    return config;
  }
}
