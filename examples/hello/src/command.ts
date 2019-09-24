import { Command as EcosystemCommand } from '@ecosystem/core';
import { flags } from '@oclif/command';

export default class Command extends EcosystemCommand {
  static description = 'print hello world';

  static flags = {
    server: flags.string({ char: 's', required: false }),
    token: flags.string({ char: 't' })
  };

  async run() {
    return null;
  }
}
