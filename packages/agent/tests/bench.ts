// import { Bench } from 'tinybench';

// const bench = new Bench({ time: 100 });

// bench
//   .add('faster task', () => {
//     console.log('I am faster');
//   })
//   .add('slower task', async () => {
//     await new Promise(r => setTimeout(r, 1)); // we wait 1ms :)
//     console.log('I am slower');
//   })
//   .todo('unimplemented bench');

// await bench.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
// await bench.run();

// console.table(bench.table());