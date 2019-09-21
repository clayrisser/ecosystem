import Err from 'err';
import { Command, flags } from '@oclif/command';
import { createConfig } from '@ecosystem/config';
import {
  Actions as EcosystemActions,
  Config as EcosystemConfig
} from './types';

export default class Ecosystem<
  Config = EcosystemConfig,
  Actions = EcosystemActions
> {
  config: Config;

  constructor(
    public name: string,
    public defaultConfig: Partial<Config>,
    public actions: Actions,
    public command = Command
  ) {
    this.config = {
      ...defaultConfig
    } as Config;
  }

  createConfig(runtimeConfig: Partial<Config>): Config {
    this.config = {
      ...this.config,
      ...createConfig<Config>(this.name, this.defaultConfig, runtimeConfig)
    };
    return this.config;
  }

  async run(runtimeConfig: Partial<Config> = {}) {
    this.createConfig(runtimeConfig);
    const parent = (this as unknown) as Ecosystem;
    const LoadedCommand = this.command;
    class EcosystemCommand extends this.command {
      static flags = {
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
        const { args } = this.parse(EcosystemCommand);
        const actionKeys = Object.keys(parent.actions);
        const action =
          args.ACTION || (actionKeys.length ? actionKeys[0] : null);
        parent.config.oclif = this.config;
        if (!parent.actions[action]) {
          throw new Err(`action '${action}' not found`, 400);
        }
        await parent.actions[action](parent.config);
      }
    }
    await EcosystemCommand.run();
  }
}

export * from './types';
