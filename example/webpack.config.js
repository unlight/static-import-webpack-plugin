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
    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.json'],
    },
    plugins: [
        new StaticImportWebpackPlugin(),
    ],
}
