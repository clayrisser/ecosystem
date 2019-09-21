import { Config } from '../types';

export default async function world(config: Config) {
  console.log('Hello, world!');
  console.log(config);
}
