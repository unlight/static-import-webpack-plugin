const { StaticImportWebpackPlugin } = require('../src');

module.exports = {
    entry: `${__dirname}/entry.js`,
    mode: 'development',
    devtool: false,
    output: {
        filename: 'output.js',
        path: `${__dirname}`,
        libraryTarget: 'var',
        library: '$lib',
    },
    plugins: [
        new StaticImportWebpackPlugin(),
    ],
}
