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
  passes = 1;
  socket = false;

  constructor(
    name,
    {
      cache = true,
      defaultConfig = {},
      level = 1,
      loaders = [],
      optionsConfig = {},
      passes = 1,
      socket = false
    }
  ) {
    this.cache = cache;
    this.defaultConfig = defaultConfig;
    this.initialOptionsConfig = optionsConfig;
    this.level = level;
    this.loaders = loaders;
    this.name = name;
    this.passes = passes;
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

  async mergeModuleConfig(passes = 0, config = {}) {
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
      config
    );
    if (passes >= this.passes && this.cache) {
      this._modulesConfig = modulesConfig;
    }
    return modulesConfig;
  }

  async mergeOptionsConfig(passes = 0, config = {}) {
    if (this.cache && this._optionsConfig) return this._optionsConfig;
    let optionsConfig =
      typeof this.initialOptionsConfig === 'string'
        ? JSON.parse(this.initialOptionsConfig)
        : this.initialOptionsConfig;
    optionsConfig = mergeConfiguration(config, optionsConfig, {
      level: this.level
    });
    if (passes >= this.passes && this.cache) {
      this._optionsConfig = optionsConfig;
    }
    return optionsConfig;
  }

  async mergeUserConfig(passes = 0, config = {}) {
    if (this.cache && this._userConfig) return this._userConfig;
    let userConfig = rcConfig({ name: this.name });
    userConfig = mergeConfiguration(config, userConfig, { level: this.level });
    if (passes >= this.passes && this.cache) this._userConfig = userConfig;
    return userConfig;
  }

  async getConfig(passes = 0, config) {
    if (this.cache && this._config) return this._config;
    if (!config) config = { ...this.defaultConfig };
    config = await this.mergeModuleConfig(passes, config);
    config = await this.mergeUserConfig(passes, config);
    config = await this.mergeOptionsConfig(passes, config);
    if (passes < this.passes) {
      config = await this.getConfig(++passes, config);
    } else if (this.cache) {
      this._config = config;
    }
    return config;
  }
}
