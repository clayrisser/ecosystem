import cosmiconfig from 'cosmiconfig';
import pkgDir from 'pkg-dir';
import { oc } from 'ts-optchain.macro';
import mergeConfiguration from 'merge-configuration';
import { BaseConfig } from './types';

const rootPath = pkgDir.sync(process.cwd()) || process.cwd();

export function createConfig<Config = BaseConfig>(
  name: string,
  defaultConfig: Partial<Config> = {},
  runtimeConfig: Partial<Config> = {}
): Config {
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

export * from './types';
