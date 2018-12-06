import ConfigLoader, { socketGetConfig } from '@ecosystem/config';
import ModuleLoader from '@ecosystem/module-loader';
import defaultConfig from './defaultConfig';

const { argv } = process;

const plugins = new ModuleLoader('someEcosystemPlugin');

const someEcosystem = new ConfigLoader('someEcosystem', {
  defaultConfig,
  loaders: [plugins],
  optionsConfig: argv[2] || {},
  socket: true
});

export default someEcosystem.config;

function main() {
  console.log(socketGetConfig('someEcosystem'));
  someEcosystem.socket.stop();
}

main();
