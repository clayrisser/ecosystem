import { BaseConfig } from '@ecosystem/config';
import { IConfig } from '@oclif/config';

export interface Config extends BaseConfig {
  oclif?: IConfig;
  action: string;
}

export type Action<TConfig = Config> = (
  config: TConfig,
  logger?: Logger,
  ...additionalArgs: any[]
) => any;

export interface Actions<TConfig = Config> {
  [key: string]: Action<TConfig>;
}

export interface Logger {
  debug(message?: any, ...optionalParams: any[]): any;
  silly(message?: any, ...optionalParams: any[]): any;
  error(message?: any, ...optionalParams: any[]): any;
  info(message?: any, ...optionalParams: any[]): any;
  spinner: Spinner;
  warn(message?: any, ...optionalParams: any[]): any;
}

export interface Spinner {
  fail(message?: string): Spinner;
  info(message?: string): Spinner;
  start(message?: string): Spinner;
  stop(): any;
  succeed(message?: string): Spinner;
  warn(message?: string): Spinner;
}
