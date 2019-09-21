import Err from 'err';
import ora from 'ora';
import { Command, flags } from '@oclif/command';
import { createConfig } from '@ecosystem/config';
import { oc } from 'ts-optchain.macro';
import { safeLoad } from 'js-yaml';
import {
  Actions as EcosystemActions,
  Config as EcosystemConfig,
  Logger
} from './types';

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

  createConfig(runtimeConfig: Partial<Config>): Config {
    this.config = {
      ...this.config,
      ...createConfig<Config>(this.name, this.defaultConfig, runtimeConfig)
    };
    return this.config;
  }

  async run(runtimeConfig: Partial<Config> = {}) {
    const parent = (this as unknown) as Ecosystem;
    const LoadedCommand = this.command;
    class EcosystemCommand extends this.command {
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

      async run() {
        await LoadedCommand.run();
        const { args, flags } = this.parse(EcosystemCommand);
        parent.createConfig({
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
    await EcosystemCommand.run();
  }
}

export * from './types';
