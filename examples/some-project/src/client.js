setTimeout(() => {
  const config = require('@ecosystem/some-core').default;
  require('@ecosystem/some-core').stop();
  console.log('client', config);
}, 5000);
