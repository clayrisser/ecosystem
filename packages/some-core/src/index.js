import Conf from '@ecosystem/conf';
import ModuleLoader from '@ecosystem/module-loader';
import defaultConfig from './defaultConfig';

const plugins = new ModuleLoader('someEcosystemPlugin');

const conf = new Conf({
  defaultConfig,
  loaders: [plugins]
});

export default conf.load();
