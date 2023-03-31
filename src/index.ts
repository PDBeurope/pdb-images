// Build: npm run build
// Run:   node build/index.js --help
//        node build/index.js 1tqn

// import { StereoCamera } from 'molstar/lib/commonjs/mol-canvas3d/camera/stereo'
// import { foo } from './mod';
import gl from 'gl';
// import { ArgumentParser } from 'argparse';
// import { PNG } from 'pngjs';

// console.log(foo);
// console.log(PNG);
// console.log(gl);
// console.log(ArgumentParser);
// console.log(StereoCamera);
// console.log('hello');


import { main, parseArguments } from './main';

console.log('gl:', gl);
main(parseArguments());
