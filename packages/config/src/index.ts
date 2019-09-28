import cosmiconfig from 'cosmiconfig';
import MultithreadConfig from 'multithread-config';
import mergeConfiguration from 'merge-configuration';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import { BaseConfig } from './types';

const mc = new MultithreadConfig<Config>();
const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export async function createConfig<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  const userConfig: Partial<Config> = oc(
    cosmiconfig(name).searchSync(rootPath)
  ).config({}) as Partial<Config>;
  let config = {
    ...defaultConfig,
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  return mc.setConfig(mergeConfiguration<Config>(config, runtimeConfig));
}

export async function getConfig<Config = BaseConfig>(
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfig();
}

export async function updateConfig<Config = BaseConfig>(
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  return mc.setConfig(
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
