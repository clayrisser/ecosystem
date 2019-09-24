import Err from 'err';
import ora from 'ora';
import { Command as OclifCommand, flags } from '@oclif/command';
import { LoadOptions } from '@oclif/config';
import { createConfig, finish } from '@ecosystem/config';
import { oc } from 'ts-optchain.macro';
import { safeLoad } from 'js-yaml';
import {
  Actions as EcosystemActions,
  Config as EcosystemConfig,
  Logger
} from './types';

export abstract class Command extends OclifCommand {
  static EcosystemCommand: typeof Command;
}

export default class Ecosystem<
  Config = EcosystemConfig,
  Actions = EcosystemActions
> {
  config: Config;

  logger: Logger;

  constructor(
    public name: string,
    public defaultConfig: Partial<Config>,
    public actions: Actions,
    public command = Command,
    logger: Partial<Logger> = {}
  ) {
    this.config = {
      ...defaultConfig
    } as Config;
    this.logger = {
      error: oc(logger).warn(console.error),
      info: oc(logger).warn(console.info),
      warn: oc(logger).warn(console.warn),
      spinner: oc(logger).spinner(ora())
    };
  }

  async createConfig(runtimeConfig: Partial<Config>): Promise<Config> {
    this.config = {
      ...this.config,
      ...(await createConfig<Config>(
        this.name,
        this.defaultConfig,
        runtimeConfig
      ))
    };
    return this.config;
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
        await parent.createConfig({
          ...runtimeConfig,
          ...(flags.config ? safeLoad(flags.config) : {})
        });
        const actionKeys = Object.keys(parent.actions);
        const action =
          args.ACTION || (actionKeys.length ? actionKeys[0] : null);
        parent.config.action = action;
        parent.config.oclif = this.config;
        if (!parent.actions[action]) {
          throw new Err(`action '${action}' not found`, 400);
        }
        await parent.actions[action](parent.config, parent.logger);
      }
    }
    LoadedCommand.EcosystemCommand = EcosystemCommand;
    await EcosystemCommand.run();
    await finish();
  }
}

export * from './types';
