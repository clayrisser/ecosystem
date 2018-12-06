import Config from '@ecosystem/config';
import ModuleLoader from '@ecosystem/module-loader';
import defaultConfig from './defaultConfig';

const { argv } = process;

const plugins = new ModuleLoader('someEcosystemPlugin');

const someEcosystem = new Config('someEcosystem', {
  defaultConfig,
  loaders: [plugins],
  optionsConfig: argv[2] || {}
});

export default someEcosystem.config;
