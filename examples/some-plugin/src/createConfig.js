export default config => {
  return { hello: config.howdy || 'world' };
};
