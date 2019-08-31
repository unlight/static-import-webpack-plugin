# static-import-webpack-plugin
Moves static import in webpack bundle to top level by using special comment `/* webpackIgnore: true */`.
With combination [esm-webpack-plugin](https://github.com/purtuga/esm-webpack-plugin) allow to generate EcmaScript module.

## Install
```sh
npm install --save-dev static-import-webpack-plugin
```

## Usage

### Webpack Config
```js
const StaticImportWebpackPlugin = require('static-import-webpack-plugin');
// Add to plugins array
plugins: [
    new StaticImportWebpackPlugin(),
],
// Other config settings
entry: './src/entry.js',
output: {
    libraryTarget: 'var',
    library: '$lib',
}
```

### Code
```js
// /src/unicorn.js
export default 'unicorn'
```
```js
// /src/entry.js
import pokemon /* webpackIgnore: true */ from './pokemon';
import unicorn from './unicorn';
```

### Output
```
import pokemon from './pokemon';
var $lib = ... // webpackBootstrap + bundled unicorn
```

## Related Projects
- https://github.com/purtuga/esm-webpack-plugin

## Development

### Example
```sh
npx ts-node node_modules/webpack/bin/webpack.js --config example/webpack.config.js
```
```
node --inspect-brk c:/nodejs/node_modules/ts-node/dist/bin.js node_modules/webpack/bin/webpack.js --config example/webpack.config.js
```
