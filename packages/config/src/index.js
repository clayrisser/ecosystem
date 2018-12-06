import mergeConfiguration from 'merge-configuration';
import _ from 'lodash';

export default class Conf {
  config = {};

  loaders = [];

  constructor({ defaultConfig = {}, loaders = [] }) {
    this.loaders = loaders;
    this.config = defaultConfig;
  }

  get moduleConfig() {
    return _.reduce(
      this.loaders,
      (config, loader) => {
        _.each(loader.modules, module => {
          config = mergeConfiguration(config, module.config);
        });
        return config;
      },
      {}
    );
  }

  load() {
    let config = { ...this.config };
    config = mergeConfiguration(config, this.moduleConfig);
    return config;
  }
}
