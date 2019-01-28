import MultithreadConfig from 'multithread-config';
import _ from 'lodash';
import mergeConfiguration from 'merge-configuration';
import path from 'path';
import pkgDir from 'pkg-dir';
import rcConfig from 'rc-config';

export default class ConfigLoader {
  _appendedConfig = {};

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
    this.name =
      name ||
      require(path.resolve(pkgDir.sync(process.cwd()), 'package.json')).name ||
      'some-config-loader';
    this.passes = passes;
    this.mc = new MultithreadConfig({
      name: this.name,
      socket: socket
        ? {
            id: name,
            ...(socket === true ? {} : socket)
          }
        : false
    });
  }

  get config() {
    return this.getConfig();
  }

  set config(config = {}) {
    this._appendedConfig = config;
    return this.config;
  }

  mergeModuleConfig(passes = 0, config = {}) {
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

  mergeOptionsConfig(passes = 0, config = {}) {
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

  mergeUserConfig(passes = 0, config = {}) {
    if (this.cache && this._userConfig) return this._userConfig;
    let userConfig = rcConfig({ name: this.name });
    userConfig = mergeConfiguration(config, userConfig, {
      level: this.level,
      mergeModifierFunction: false
    });
    if (passes >= this.passes && this.cache) this._userConfig = userConfig;
    return userConfig;
  }

  getConfig(dynamicConfig, configs = null, passes = 0, config) {
    if (this.cache && this._config) return this._config;
    if (this.mc.owner) {
      if (!config) config = { ...this.defaultConfig };
      if (!configs || (configs?.length && _.includes(configs, 'module'))) {
        config = this.mergeModuleConfig(passes, config);
      }
      if (!configs || (configs?.length && _.includes(configs, 'user'))) {
        config = this.mergeUserConfig(passes, config);
      }
      if (!configs || (configs?.length && _.includes(configs, 'options'))) {
        config = this.mergeOptionsConfig(passes, config);
      }
    }
    if (dynamicConfig) {
      config = mergeConfiguration(config, dynamicConfig, {
        level: this.level,
        mergeModifierFunction: false
      });
    }
    if (passes < this.passes) {
      config = this.getConfig(config, configs, ++passes);
    }
    if (this.mc.owner) {
      config = { ...config, ...this._appendedConfig };
      this.mc.config = config;
    }
    this._config = this.mc.config;
    return this._config;
  }

  clearCache() {
    return (this._config = null);
  }

  stop() {
    return this.mc.stop();
  }

  alive() {
    return this.mc.alive();
  }

  owner() {
    return this.mc.owner();
  }
}
