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
  _appendedConfig = {};
  cache = false;
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
      cache = false,
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

  appendConfig(config) {
    this._appendedConfig = config;
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
    let done = false;
    let result = null;
    let error = null;
    this.getConfig(...args)
      .then(promiseResult => {
        result = promiseResult;
        done = true;
      })
      .catch(err => (error = err));
    if (!done) deasync.sleep(100);
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
            level: this.level,
            mergeModifierFunction: false
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
      typeof this.initialOptionsConfig === 'string' &&
      this.initialOptionsConfig.length
        ? JSON.parse(this.initialOptionsConfig)
        : this.initialOptionsConfig;
    optionsConfig = mergeConfiguration(config, optionsConfig, {
      level: this.level,
      mergeModifierFunction: false
    });
    if (passes >= this.passes && this.cache) {
      this._optionsConfig = optionsConfig;
    }
    return optionsConfig;
  }

  async mergeUserConfig(passes = 0, config = {}) {
    if (this.cache && this._userConfig) return this._userConfig;
    let userConfig = rcConfig({ name: this.name });
    userConfig = mergeConfiguration(config, userConfig, {
      level: this.level,
      mergeModifierFunction: false
    });
    if (passes >= this.passes && this.cache) this._userConfig = userConfig;
    return userConfig;
  }

  async getConfig(configs = null, passes = 0, config) {
    if (this.cache && this._config) return this._config;
    if (!config) config = { ...this.defaultConfig };
    if (!configs || (configs?.length && _.includes(configs, 'module'))) {
      config = await this.mergeModuleConfig(passes, config);
    }
    if (!configs || (configs?.length && _.includes(configs, 'user'))) {
      config = await this.mergeUserConfig(passes, config);
    }
    if (!configs || (configs?.length && _.includes(configs, 'options'))) {
      config = await this.mergeOptionsConfig(passes, config);
    }
    if (passes < this.passes) {
      config = await this.getConfig(configs, ++passes, config);
    } else if (this.cache) {
      this._config = config;
    }
    return { ...config, ...this._appendedConfig };
  }
}
