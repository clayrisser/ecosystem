import Err from 'err';
import MultithreadConfig from 'multithread-config';
import cosmiconfig from 'cosmiconfig';
import isPromise from 'is-promise';
import mergeConfiguration from 'merge-configuration';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import { BaseConfig } from './types';

let mcSocket: MultithreadConfig;
let mcFilesystem: MultithreadConfig;
const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export function getMc(): MultithreadConfig {
  return mcSocket || mcFilesystem;
}

export function isMaster(): boolean {
  const mc = getMc();
  return mc.isMaster();
}

export function isStarted(): boolean {
  const mc = getMc();
  return mc.isStarted;
}

export function getMcFilesystem(): MultithreadConfig {
  if (mcFilesystem) return mcFilesystem;
  if (mcSocket) {
    throw new Err(
      'multithread socket is incompatible with multithread filesystem'
    );
  }
  mcFilesystem = new MultithreadConfig<BaseConfig>({ socket: false });
  return mcFilesystem;
}

export function getMcSocket(): MultithreadConfig {
  if (mcSocket) return mcSocket;
  if (mcFilesystem) {
    throw new Err(
      'multithread socket is incompatible with multithread filesystem'
    );
  }
  mcSocket = new MultithreadConfig<BaseConfig>();
  return mcSocket;
}

export function activate(socket = false) {
  if (socket) return getMcSocket();
  return getMcFilesystem();
}

export function buildConfigSync<Config = BaseConfig>(
  name: string,
  defaultConfig?: Partial<Config>,
  runtimeConfig?: Partial<Config>,
  force = false,
  postProcess?: <T = Config>(config: T) => T
): Config {
  const mc = getMcFilesystem();
  if (!defaultConfig || !runtimeConfig || !force) {
    const loadedConfig = mc.getConfigSync();
    if (!force && isMaster()) return loadedConfig as Config;
    if (!defaultConfig) {
      defaultConfig = loadedConfig._defaultConfig as Partial<Config>;
    }
    if (!runtimeConfig) {
      runtimeConfig = loadedConfig._runtimeConfig as Partial<Config>;
    }
  }
  const userConfig: Partial<Config> = oc(
    cosmiconfig(name).searchSync(rootPath)
  ).config({}) as Partial<Config>;
  let config = {
    ...defaultConfig,
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  const builtConfig = mergeConfiguration<Config>(config, runtimeConfig);
  if (postProcess) {
    if (isPromise(postProcess)) {
      throw new Err('synchronous operations not enabled');
    }
    return postProcess(builtConfig);
  }
  return builtConfig;
}

export async function buildConfig<Config = BaseConfig>(
  name: string,
  defaultConfig?: Partial<Config>,
  runtimeConfig?: Partial<Config>,
  force = false,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMcFilesystem();
  if (!defaultConfig || !runtimeConfig || !force) {
    const loadedConfig = await mc.getConfig();
    if (!force && isMaster()) return loadedConfig as Config;
    if (!defaultConfig) {
      defaultConfig = loadedConfig._defaultConfig as Partial<Config>;
    }
    if (!runtimeConfig) {
      runtimeConfig = loadedConfig._runtimeConfig as Partial<Config>;
    }
  }
  const userConfig: Partial<Config> = oc(
    cosmiconfig(name).searchSync(rootPath)
  ).config({}) as Partial<Config>;
  let config = {
    ...defaultConfig,
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  const builtConfig = mergeConfiguration<Config>(config, runtimeConfig);
  if (postProcess) return postProcess(builtConfig);
  return builtConfig;
}

export function createConfigSync<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T,
  postProcess?: <T = Config>(config: T) => T
): Config {
  const mc = getMcFilesystem();
  if (isStarted() && !isMaster()) {
    throw new Err('only master process can create config');
  }
  if (preProcess) mc.preProcess = preProcess;
  const config = buildConfigSync<Config>(
    name,
    defaultConfig,
    runtimeConfig,
    true,
    postProcess
  );
  return mc.setConfigSync(config);
}

export async function createConfig<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMc();
  if (isStarted() && !isMaster()) {
    throw new Err('only master process can create config');
  }
  if (preProcess) mc.preProcess = preProcess;
  const config = await buildConfig<Config>(
    name,
    defaultConfig,
    runtimeConfig,
    true,
    postProcess
  );
  return mc.setConfig(config);
}

export function getConfigSync<Config = BaseConfig>(
  name: string,
  postProcess?: <T = Config>(config: T) => T
): Config {
  return buildConfigSync(name, undefined, undefined, false, postProcess);
}

export async function getConfig<Config = BaseConfig>(
  name: string,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  return buildConfig(name, undefined, undefined, false, postProcess);
}

export function updateConfigSync<Config = BaseConfig>(
  name: string,
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T
): Config {
  const mc = getMcFilesystem();
  if (!isMaster()) throw new Err('only master process can update config');
  if (preProcess) mc.preProcess = preProcess;
  return mc.setConfigSync(
    mergeConfiguration<Config>(getConfigSync<Config>(name, postProcess), config)
  );
}

export async function updateConfig<Config = BaseConfig>(
  name: string,
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMc();
  if (!isMaster()) throw new Err('only master process can update config');
  if (preProcess) mc.preProcess = preProcess;
  return mc.setConfig(
    mergeConfiguration<Config>(
      await getConfig<Config>(name, postProcess),
      config
    )
  );
}

export function startSync() {
  const mc = getMcFilesystem();
  return mc.startSync();
}

export async function start() {
  const mc = getMc();
  return mc.start();
}

export async function finish() {
  const mc = getMc();
  return mc.finish();
}

export function finishSync() {
  const mc = getMcFilesystem();
  return mc.finishSync();
}

export * from './types';
