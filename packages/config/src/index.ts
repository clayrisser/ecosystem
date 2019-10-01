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

export function createConfigSync<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {},
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcFilesystem();
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
  const mc = getMc();
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
  const mc = getMcFilesystem();
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfigSync();
}

export async function getConfig<Config = BaseConfig>(
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Promise<Config> {
  const mc = getMc();
  if (postProcess) mc.postProcess = postProcess;
  return mc.getConfig();
}

export function updateConfigSync<Config = BaseConfig>(
  config: Partial<Config>,
  preProcess?: <T = Config>(config: T) => T | Promise<T>,
  postProcess?: <T = Config>(config: T) => T | Promise<T>
): Config {
  const mc = getMcFilesystem();
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
  const mc = getMc();
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
