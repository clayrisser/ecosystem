import cosmiconfig from 'cosmiconfig';
import MultithreadConfig from 'multithread-config';
import mergeConfiguration from 'merge-configuration';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import { BaseConfig } from './types';

const mc = new MultithreadConfig();
const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export async function createConfig<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {}
): Promise<Config> {
  const userConfig: Partial<Config> = oc(
    cosmiconfig(name).searchSync(rootPath)
  ).config({}) as Partial<Config>;
  let config = {
    ...defaultConfig,
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  return mc.setConfig<Config>(
    mergeConfiguration<Config>(config, runtimeConfig)
  );
}

export async function getConfig<Config = BaseConfig>(): Promise<Config> {
  return mc.getConfig<Config>();
}

export async function updateConfig<Config = BaseConfig>(
  config: Partial<Config>
): Promise<Config> {
  return mc.setConfig<Config>(
    mergeConfiguration<Config>(await getConfig<Config>(), config)
  );
}

export async function start() {
  return mc.start();
}

export async function finish() {
  return mc.finish();
}

export * from './types';
