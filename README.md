# static-import-webpack-plugin
Moves static import in webpack bundle to top level by using special comment.
With combination [esm-webpack-plugin](https://github.com/purtuga/esm-webpack-plugin) allow to generate EcmasScript module.

## Install
```sh
npm install --save-dev static-import-webpack-plugin
```

## Usage

### Webpack Config
```js
const staticImportWebpackPlugin = require('static-import-webpack-plugin');
// Add to plugins array
staticImportWebpackPlugin()
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
import unicorn /* webpackIgnore: true */ from './unicorn';
import * as bundledUnicorn from './unicorn';
```

### Output
```
import pokemon from './pokemon';
var $lib = ... // webpackBootstrap + bundled unicorn
```

## Related Projects
- https://github.com/purtuga/esm-webpack-plugin
