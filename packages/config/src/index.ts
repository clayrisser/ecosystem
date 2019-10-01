import cosmiconfig from 'cosmiconfig';
import Err from 'err';
import MultithreadConfig from 'multithread-config';
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
  force = false
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
  return mergeConfiguration<Config>(config, runtimeConfig);
}

export async function buildConfig<Config = BaseConfig>(
  name: string,
  defaultConfig?: Partial<Config>,
  runtimeConfig?: Partial<Config>,
  force = false
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
  return mergeConfiguration<Config>(config, runtimeConfig);
}

export function createConfigSync<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T,
  postProcess?: <T = Config>(config: T) => T
): Config {
  const mc = getMcFilesystem();
  if (!isMaster()) throw new Err('only master process can create config');
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  const config = buildConfigSync<Config>(
    name,
    defaultConfig,
    runtimeConfig,
    true
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
  if (!isMaster()) throw new Err('only master process can create config');
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  const config = await buildConfig<Config>(
    name,
    defaultConfig,
    runtimeConfig,
    true
  );
  return mc.setConfig(config);
}

export function isMaster(): boolean {
  const mc = getMc();
  return mc.isMaster();
}

export function getConfigSync<Config = BaseConfig>(
  name: string,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcFilesystem();
  if (postProcess) mc.postProcess = postProcess;
  return buildConfigSync(name);
}

export async function getConfig<Config = BaseConfig>(
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMc();
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfig();
}

export function updateConfigSync<Config = BaseConfig>(
  name: string,
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcFilesystem();
  if (!isMaster()) throw new Err('only master process can update config');
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  return mc.setConfigSync(
    mergeConfiguration<Config>(getConfigSync<Config>(name), config)
  );
}

export async function updateConfig<Config = BaseConfig>(
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMc();
  if (!isMaster()) throw new Err('only master process can update config');
  if (preProcess) mc.preProcess = preProcess;
  if (postProcess) mc.postProcess = postProcess;
  return mc.setConfig(
    mergeConfiguration<Config>(await getConfig<Config>(), config)
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
