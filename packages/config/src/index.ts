import cosmiconfig from 'cosmiconfig';
import Err from 'err';
import MultithreadConfig from 'multithread-config';
import mergeConfiguration from 'merge-configuration';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import { BaseConfig } from './types';

let mcAsync: MultithreadConfig;
let mcSync: MultithreadConfig;
const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export function getMc(): MultithreadConfig {
  return mcAsync || mcSync;
}

export function getMcSync(): MultithreadConfig {
  if (mcAsync) {
    throw new Err('multithread sync is incompatible with multithread async');
  }
  if (mcSync) return mcSync;
  mcSync = new MultithreadConfig<BaseConfig>({
    sync: true,
    socket: false
  });
  return mcSync;
}

export function getMcAsync(): MultithreadConfig {
  if (mcSync) {
    throw new Err('multithread async is incompatible with multithread sync');
  }
  if (mcAsync) return mcAsync;
  mcAsync = new MultithreadConfig<BaseConfig>();
  return mcAsync;
}

export function createConfigSync<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcSync();
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
  return mc.setConfigSync(mergeConfiguration<Config>(config, runtimeConfig));
}

export async function createConfig<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMcAsync();
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

export function isMaster(): boolean {
  const mc = getMc();
  return mc.isMaster();
}

export function getConfigSync<Config = BaseConfig>(
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcSync();
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfigSync();
}

export async function getConfig<Config = BaseConfig>(
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMcAsync();
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfig();
}

export function updateConfigSync<Config = BaseConfig>(
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcSync();
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  return mc.setConfigSync(
    mergeConfiguration<Config>(getConfigSync<Config>(), config)
  );
}

export async function updateConfig<Config = BaseConfig>(
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMcAsync();
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  return mc.setConfig(
    mergeConfiguration<Config>(await getConfig<Config>(), config)
  );
}

export function startSync() {
  const mc = getMcSync();
  return mc.startSync();
}

export async function start() {
  const mc = getMcAsync();
  return mc.start();
}

export async function finish() {
  const mc = getMcAsync();
  return mc.finish();
}

export function finishSync() {
  const mc = getMcSync();
  return mc.finishSync();
}

export * from './types';
