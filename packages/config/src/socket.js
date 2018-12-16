import CircularJSON from 'circular-json';
import ipc from 'node-ipc';
import deasync from 'deasync';
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

  handleServe() {
    ipc.server.on('config.req', this.handleConfigRequest);
  }

  async startAysnc() {
    return new Promise(resolve => {
      ipc.serve(() => {
        this.handleServe();
        resolve();
      });
      ipc.server.start();
    });
  }

  start() {
    let error = null;
    const startSync = deasync(async (...args) => {
      const done = args.pop();
      const config = await this.startAysnc(...args).catch(err => {
        error = err;
        done();
      });
      return done(null, config);
    });
    const result = startSync();
    if (error) throw error;
    return result;
  }

  stop() {
    return ipc.server.stop();
  }
}

async function socketGetConfigAsync(configLoaderName, socketConfig) {
  ipc.config = {
    ...ipc.config,
    id: 'client',
    retry: 1000,
    silent: true,
    ...socketConfig
  };
  return new Promise(resolve => {
    try {
      return ipc.connectTo('server', () => {
        ipc.of.server.on('config.res', res => {
          return resolve(res.config);
        });
        ipc.of.server.emit('config.req', { configLoaderName });
      });
    } catch (err) {
      return resolve(null);
    }
  });
}

export function socketGetConfig(...args) {
  let error = null;
  const socketGetConfigSync = deasync(async (...args) => {
    const done = args.pop();
    const config = await socketGetConfigAsync(...args).catch(err => {
      error = err;
      done();
    });
    return done(null, config);
  });
  const result = socketGetConfigSync(...args);
  if (error) throw error;
  return result;
}
