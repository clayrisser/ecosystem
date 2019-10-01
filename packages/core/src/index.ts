import Err from 'err';
import ora from 'ora';
import { Command as OclifCommand, flags } from '@oclif/command';
import { LoadOptions } from '@oclif/config';
import { oc } from 'ts-optchain.macro';
import { safeLoad } from 'js-yaml';
import {
  createConfig,
  createConfigSync,
  finish,
  getConfig,
  getConfigSync,
  updateConfig,
  updateConfigSync
} from '@ecosystem/config';
import {
  Actions as EcosystemActions,
  Config as EcosystemConfig,
  Logger
} from './types';

export abstract class Command extends OclifCommand {
  static EcosystemCommand: typeof Command;

  static Ecosystem: typeof Ecosystem;

  static ecosystem: Ecosystem;
}

export default class Ecosystem<
  Config = EcosystemConfig,
  Actions = EcosystemActions
> {
  logger: Logger;

  private _createdConfig = false;

  constructor(
    public name: string,
    public defaultConfig: Partial<Config>,
    public actions: Actions,
    public command = Command,
    public socket = true,
    public preProcess: <T = Config>(config: T) => T | Promise<T> = f => f,
    public postProcess: <T = Config>(config: T) => T | Promise<T> = f => f,
    logger: Partial<Logger> = {},
    public additionalArgs: any[] = []
  ) {
    this.logger = {
      debug: oc(logger).warn(console.debug),
      error: oc(logger).warn(console.error),
      info: oc(logger).warn(console.info),
      silly: oc(logger).warn(console.log),
      spinner: oc(logger).spinner(ora()),
      warn: oc(logger).warn(console.warn)
    };
  }

  updateConfigSync<T = Config>(config: Partial<T>): T {
    if (this.socket) throw new Err('sync is disabled when using socket');
    if (!this._createdConfig) this.createConfigSync();
    return updateConfigSync<T>(config, this.preProcess, this.postProcess);
  }

  async updateConfig<T = Config>(config: Partial<T>): Promise<T> {
    if (!this._createdConfig) await this.createConfig();
    return updateConfig<T>(config, this.preProcess, this.postProcess);
  }

  getConfigSync<T = Config>(): T {
    if (this.socket) throw new Err('sync is disabled when using socket');
    if (!this._createdConfig) this.createConfigSync();
    return getConfigSync<T>(this.postProcess);
  }

  async getConfig<T = Config>(): Promise<T> {
    if (!this._createdConfig) await this.createConfig();
    return getConfig<T>(this.postProcess);
  }

  createConfigSync<T = Config>(runtimeConfig: Partial<T> = {}): T {
    if (this.socket) throw new Err('sync is disabled when using socket');
    const config = createConfigSync<T>(
      this.name,
      this.defaultConfig as T,
      runtimeConfig,
      this.preProcess,
      this.postProcess
    );
    this._createdConfig = true;
    return config;
  }

  async createConfig<T = Config>(runtimeConfig: Partial<T> = {}): Promise<T> {
    const config = await createConfig<T>(
      this.name,
      this.defaultConfig as T,
      runtimeConfig,
      this.preProcess,
      this.postProcess
    );
    this._createdConfig = true;
    return config;
  }

  async run(runtimeConfig: Partial<Config> = {}) {
    const parent = (this as unknown) as Ecosystem;
    const LoadedCommand: typeof Command = this.command;
    class EcosystemCommand extends LoadedCommand {
      static flags = {
        config: flags.string({ char: 'c' }),
        help: flags.help({ char: 'h' }),
        verbose: flags.boolean(),
        version: flags.version({ char: 'v' }),
        ...LoadedCommand.flags
      };

      static args = [
        { name: 'ACTION', required: false },
        ...(typeof LoadedCommand.args !== 'undefined' ? LoadedCommand.args : [])
      ];

      async run(argv?: string[], options?: LoadOptions) {
        runtimeConfig = {
          ...runtimeConfig,
          ...oc(await LoadedCommand.run(argv, options)).runtimeConfig({})
        };
        const { args, flags } = this.parse(EcosystemCommand);
        const actionKeys = Object.keys(parent.actions);
        const action =
          args.ACTION || (actionKeys.length ? actionKeys[0] : null);
        const config = await parent.createConfig({
          ...runtimeConfig,
          ...(flags.config ? safeLoad(flags.config) : {}),
          action,
          oclif: this.config
        });
        if (!parent.actions[action]) {
          throw new Err(`action '${action}' not found`, 400);
        }
        await parent.actions[action](
          config,
          parent.logger,
          ...parent.additionalArgs
        );
      }
    }
    LoadedCommand.Ecosystem = Ecosystem;
    LoadedCommand.EcosystemCommand = EcosystemCommand;
    LoadedCommand.ecosystem = parent;
    await EcosystemCommand.run();
    await finish();
  }
}

export * from './types';
