import CircularJSON from 'circular-json';
import deasync from 'deasync';
import ipc from 'node-ipc';
import { configLoaders } from './config-loader';

export default class Socket {
  constructor(socketConfig) {
    ipc.config = {
      ...ipc.config,
      id: 'server',
      retry: 1000,
      silent: true,
      ...socketConfig
    };
  }

  handleConfigRequest(res, socket) {
    const configLoader = configLoaders[res.configLoaderName];
    ipc.server.emit(socket, 'config.res', {
      config: JSON.parse(CircularJSON.stringify(configLoader.config))
    });
  }

  start() {
    let done = false;
    ipc.serve(() => {
      ipc.server.on('config.req', this.handleConfigRequest);
      done = true;
    });
    ipc.server.start();
    while (!done) deasync.sleep(100);
    return null;
  }

  stop() {
    return ipc.server.stop();
  }
}

export function socketGetConfig(configLoaderName, socketConfig) {
  let done = false;
  let error = null;
  let result = null;
  ipc.config = {
    ...ipc.config,
    id: 'client',
    retry: 1000,
    silent: true,
    ...socketConfig
  };
  try {
    ipc.connectTo('server', () => {
      ipc.of.server.on('config.res', res => {
        result = res.config;
        done = true;
      });
      ipc.of.server.emit('config.req', { configLoaderName });
    });
  } catch (err) {
    error = err;
    done = true;
  }
  while (!done) deasync.sleep(100);
  if (error) throw error;
  return result;
}
