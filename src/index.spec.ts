/* tslint:disable:no-implicit-dependencies no-any */
import * as webpack from 'webpack';
import { staticImportWebpackPlugin } from '.';
import MemoryFS = require('memory-fs');

const fs = new MemoryFS();

const compiler = webpack({
    context: '/src',
    entry: './entry.js',
    mode: 'development',
    devtool: false,
    module: {
        rules: [
            {
                parser: {
                    amd: false,
                    system: false,
                    harmony: true,
                }
            },
        ],
    },
    output: {
        filename: 'output.js',
        path: '/dist',
        libraryTarget: 'var',
        library: '$lib',
    },
});

compiler.inputFileSystem = fs;
compiler.outputFileSystem = fs;
(<any>compiler).resolvers.normal.fileSystem = fs;
(<any>compiler).resolvers.context.fileSystem = fs;

async function compile() {
    staticImportWebpackPlugin(compiler);
    return new Promise<webpack.Stats>((resolve, reject) => {
        compiler.run((error, stats) => {
            if (error) {
                return reject(error);
            }
            resolve(stats);
        });
    });
}

function removeWebpackProlog(source: string) {
    const marks = ['/******/', '/************************************************************************/'];
    const startIndex = source.indexOf(marks[0]);
    const endIndex = source.lastIndexOf(marks[1]);
    const result = source.slice(0, startIndex) + source.slice(endIndex + marks[1].length);
    return result.trim();
}

beforeEach(() => {
    fs.mkdirpSync('/src');
});

afterEach(() => {
    fs.rmdirSync('/src');
});

it('smoke', async () => {
    fs.writeFileSync('/src/entry.js', `console.log('Hi there')`);
    const stats = await compile();
    const output = stats.compilation.assets['output.js'].source();
    expect(output).toContain(`console.log('Hi there')`);
});

it('import smoke', async () => {
    fs.writeFileSync('/src/foo.js', `export const foo = () => console.log('foo')`);
    fs.writeFileSync('/src/entry.js', `import { foo } from './foo'`);
    const stats = await compile();
    const output = removeWebpackProlog(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`/* harmony import */ var _foo__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./foo */ "./foo.js")`);
});

it('static import with options', async () => {
    fs.writeFileSync('/src/entry.js', `import /* webpackIgnore: true */ './foo'`);
    const stats = await compile();
    const output = removeWebpackProlog(stats.compilation.assets['output.js'].source())
        .split('\n')
        .find((value, index) => index === 0);
    expect(output).toContain(`import './foo'`);
});

it('static import all', async () => {
    fs.writeFileSync('/src/entry.js', `import * as all /* webpackIgnore: true */ from './all'`);
    const stats = await compile();
    const output = removeWebpackProlog(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import * as all from './all'`);
});

it('multiple static import', async () => {
    fs.writeFileSync('/src/entry.js', `
        import pokemon /* webpackIgnore: true */ from './pokemon';
        import /* webpackIgnore: true */ * as bundledUnicorn from './unicorn';
        `);
    const stats = await compile();
    const output = removeWebpackProlog(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import pokemon from './pokemon'`);
    expect(output).toContain(`import * as bundledUnicorn from './unicorn'`);
});
