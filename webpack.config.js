const path = require('path');
const webpack = require('webpack');

module.exports = [
    {
        target: 'node',
        node: {
            __dirname: false,
            __filename: false,
        },
        externals: {
            // argparse: 'require("argparse")',
            // fs: 'require("fs")',
            // path: 'require("path")',
            gl: 'require("gl")',
            // pngjs: 'require("pngjs")',
            // 'jpeg-js': 'require("jpeg-js")'
        },
        plugins: [
            new webpack.DefinePlugin({
                __PLUGIN_VERSION_TIMESTAMP__: webpack.DefinePlugin.runtimeValue(() => `${new Date().valueOf()}`, true),
                'process.env.DEBUG': JSON.stringify(process.env.DEBUG)
            }),
            new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true, entryOnly: true }),
        ],
        resolve: {
            modules: [
                'node_modules',
                path.resolve(__dirname, 'lib/')
            ],
        },
        entry: path.resolve(__dirname, `lib/index.js`),
        output: { filename: `pdbe-images.js`, path: path.resolve(__dirname, `build`) },
    }
];