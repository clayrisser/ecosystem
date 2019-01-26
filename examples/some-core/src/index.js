import ConfigLoader from '@ecosystem/config';
import ModuleLoader from '@ecosystem/module-loader';
import defaultConfig from './defaultConfig';

const { argv } = process;

const plugins = new ModuleLoader('someEcosystemPlugin', {
  configPath: 'config'
});

const someEcosystem = new ConfigLoader('someEcosystem', {
  defaultConfig,
  loaders: [plugins],
  optionsConfig: argv[2] || {},
  socket: true
});

export function stop() {
  return someEcosystem.stop();
}

export default someEcosystem.config;
