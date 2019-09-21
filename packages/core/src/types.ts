import { BaseConfig } from '@ecosystem/config';
import { IConfig } from '@oclif/config';

export interface Config extends BaseConfig {
  oclif?: IConfig;
}

export type Action<TConfig = Config> = (config: TConfig) => any;

export interface Actions<TConfig = Config> {
  [key: string]: Action<TConfig>;
}
