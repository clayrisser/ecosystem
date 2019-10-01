export interface BaseConfig {
  rootPath: string;
  _defaultConfig: Partial<BaseConfig>;
  _runtimeConfig: Partial<BaseConfig>;
}
