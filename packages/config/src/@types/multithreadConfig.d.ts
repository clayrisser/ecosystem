declare class MultithreadConfig {
  isOwner: boolean;

  setConfig<TConfig = Config>(config: TConfig): Promise<TConfig>;

  getConfig<TConfig = Config>(): Promise<TConfig>;

  start(): Promise<void>;

  stop(): void;
}

declare interface Config {
  [key: string]: any;
}

declare module 'multithread-config' {
  export = MultithreadConfig;
}
