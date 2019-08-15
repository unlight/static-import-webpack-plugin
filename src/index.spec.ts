/* eslint-disable @typescript-eslint/tslint/config */
import * as lib from './index';
import * as webpack from 'webpack';
import MemoryFS = require('memory-fs');
import SingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');

const fs = new MemoryFS();
fs.mkdirpSync('/src');

const compiler = webpack({
    context: '/src',
    entry: './entry.js',
    mode: 'development',
    devtool: false,
    output: {
        filename: 'output.js',
        path: '/dist',
        libraryTarget: 'var',
        library: '$lib',
    },
});

compiler.inputFileSystem = fs;
compiler.outputFileSystem = fs;
(compiler as any).resolvers.normal.fileSystem = fs;
(compiler as any).resolvers.context.fileSystem = fs;

function compile() {
    return new Promise<webpack.Stats>((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err) {
                return reject(err);
            }
            resolve(stats);
        });
    });
}

it('smoke test', async () => {
    fs.writeFileSync('/src/entry.js', 'console.log(`Hi there`)');
    // fs.writeFileSync('/src/entry.js', 'require("./dependency.js")');
    // fs.writeFileSync('/src/dependency.js', 'module.exports = "this is dependency"');
    const stats = await compile();
    const appSource = stats.compilation.assets['output.js'].source();
    expect(appSource).toContain('console.log(`Hi there`)');
});
