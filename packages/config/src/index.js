import _ from 'lodash';
import mergeConfiguration from 'merge-configuration';
import rcConfig from 'rc-config';

export default class Config {
  _optionsConfig = {};
  defaultConfig = {};
  level = 1;
  loaders = [];
  name = '';

  constructor(
    name,
    { defaultConfig = {}, loaders = [], optionsConfig = {}, level = 1 }
  ) {
    this._optionsConfig = optionsConfig;
    this.defaultConfig = defaultConfig;
    this.level = level;
    this.loaders = loaders;
    this.name = name;
  }

  get moduleConfig() {
    return _.reduce(
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
  }

  get optionsConfig() {
    return typeof this._optionsConfig === 'string'
      ? JSON.parse(this._optionsConfig)
      : this._optionsConfig;
  }

  get userConfig() {
    return rcConfig({ name: this.name });
  }

  get config() {
    let config = { ...this.defaultConfig };
    config = mergeConfiguration(config, this.moduleConfig, {
      level: this.level
    });
    config = mergeConfiguration(config, this.userConfig, { level: this.level });
    config = mergeConfiguration(config, this.optionsConfig, {
      level: this.level
    });
    return config;
  }
}
