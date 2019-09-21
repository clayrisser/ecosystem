import { Command as OclifCommand, flags } from '@oclif/command';

export default class Command extends OclifCommand {
  static description = 'print hello world';

  static flags = {
    server: flags.string({ char: 's', required: false }),
    token: flags.string({ char: 't' })
  };

  async run() {
    return null;
  }
}
