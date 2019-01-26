import someCore, { stop } from '@ecosystem/some-core';

console.log('server', someCore);

setTimeout(() => {
  stop();
}, 10000);
