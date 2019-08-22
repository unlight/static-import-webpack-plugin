# esm-import-webpack-plugin
Allow to keep static import in webpack bundle by using special comment

## Install
```sh
npm install --save-dev esm-import-webpack-plugin
```

## Usage

### Webpack Config
```js
const esmImportWebpackPlugin = require('esm-import-webpack-plugin');
// Add to plugins array
esmImportWebpackPlugin()
```

### Code
```js
import /* webpackIgnore: true */ './foo';
```
### Output
```
import './foo';
```

## Related Projects
- https://github.com/purtuga/esm-webpack-plugin
