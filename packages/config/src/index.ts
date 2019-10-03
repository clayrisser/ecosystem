import Err from 'err';
import MultithreadConfig from 'multithread-config';
import cosmiconfig from 'cosmiconfig';
import isPromise from 'is-promise';
import mergeConfiguration from 'merge-configuration';
import mergeWith from 'lodash.mergewith';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import { BaseConfig } from './types';

let mcSocket: MultithreadConfig;
let mcFilesystem: MultithreadConfig;
const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export function smartRebuild(defaultConfig: any, loadedConfig: any): any {
  if (
    typeof loadedConfig === 'undefined' ||
    (typeof defaultConfig !== typeof loadedConfig &&
      typeof loadedConfig === 'string')
  ) {
    return defaultConfig;
  }
  if (
    Array.isArray(loadedConfig) ||
    Object.prototype.toString.call(loadedConfig) === '[object RegExp]' ||
    typeof defaultConfig === 'undefined' ||
    typeof loadedConfig === 'function' ||
    loadedConfig === null
  ) {
    return loadedConfig;
  }
  return mergeWith(
    defaultConfig,
    loadedConfig,
    (defaultConfig: any, loadedConfig: any) => {
      return smartRebuild(defaultConfig, loadedConfig);
    }
  );
}

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
  mcFilesystem = new MultithreadConfig<BaseConfig>({
    socket: false,
    watch: false
  });
  return mcFilesystem;
}

export function getMcSocket(): MultithreadConfig {
  if (mcSocket) return mcSocket;
  if (mcFilesystem) {
    throw new Err(
      'multithread socket is incompatible with multithread filesystem'
    );
  }
  mcSocket = new MultithreadConfig<BaseConfig>({ forceKill: true });
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
  creating = false,
  postProcess?: <T = Config>(config: T) => T
): Config {
  const mc = getMcFilesystem();
  let loadedConfig: BaseConfig | void;
  if (!runtimeConfig || !creating) {
    loadedConfig = mc.getConfigSync() as BaseConfig;
    if (!creating && isMaster()) return (loadedConfig as unknown) as Config;
    if (!runtimeConfig) {
      runtimeConfig = (loadedConfig._runtimeConfig as unknown) as Partial<
        Config
      >;
    }
  }
  let userConfig: Partial<Config> = {};
  try {
    userConfig = oc(cosmiconfig(name).searchSync(rootPath)).config(
      {}
    ) as Partial<Config>;
  } catch (err) {
    if (err.name !== 'YAMLException') throw err;
    userConfig = require(err.mark.name);
  }
  let config = {
    ...(!loadedConfig ? defaultConfig : {}),
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  let builtConfig = mergeConfiguration<Config>(config, runtimeConfig);
  if (loadedConfig) {
    builtConfig = smartRebuild(builtConfig, loadedConfig._defaultConfig);
  }
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
  creating = false,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMcFilesystem();
  let loadedConfig: BaseConfig | void;
  if (!runtimeConfig || !creating) {
    loadedConfig = (await mc.getConfig()) as BaseConfig;
    if (!creating && isMaster()) return (loadedConfig as unknown) as Config;
    if (!runtimeConfig) {
      runtimeConfig = (loadedConfig._runtimeConfig as unknown) as Partial<
        Config
      >;
    }
  }
  let userConfig: Partial<Config>;
  try {
    userConfig = oc(cosmiconfig(name).searchSync(rootPath)).config(
      {}
    ) as Partial<Config>;
  } catch (err) {
    if (err.name !== 'YAMLException') throw err;
    userConfig = await import(err.mark.name);
  }
  let config = {
    ...(!loadedConfig ? defaultConfig : {}),
    rootPath
  } as Partial<Config>;
  config = mergeConfiguration<Partial<Config>>(config, userConfig);
  let builtConfig = mergeConfiguration<Config>(config, runtimeConfig);
  if (loadedConfig) {
    builtConfig = smartRebuild(buildConfig, loadedConfig._defaultConfig);
  }
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
  const config = buildConfigSync<BaseConfig>(
    name,
    defaultConfig,
    runtimeConfig,
    true,
    postProcess
  );
  config._defaultConfig = defaultConfig;
  config._runtimeConfig = runtimeConfig;
  return (mc.setConfigSync(config) as unknown) as Config;
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
  const config = await buildConfig<BaseConfig>(
    name,
    defaultConfig,
    runtimeConfig,
    true,
    postProcess
  );
  config._defaultConfig = defaultConfig;
  config._runtimeConfig = runtimeConfig;
  return (mc.setConfig(config) as unknown) as Config;
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
