/* tslint:disable:no-implicit-dependencies no-any no-duplicate-string */
import * as webpack from 'webpack';
import { staticImportWebpackPlugin } from '.';
import MemoryFS = require('memory-fs');

const fs = new MemoryFS();

async function compile(customOptions = {}) {
    const options = Object.assign({
        context: '/',
        entry: '/entry',
        mode: 'development',
        devtool: false,
        resolve: {
            extensions: ['.js', '.ts', '.tsx', '.json'],
        },
        module: {
            rules: [
                {
                    parser: {
                        amd: false,
                        system: false,
                        harmony: true,
                    }
                },
                {
                    test: /\.js$/,
                    type: 'javascript/esm',
                },
            ],
        },
        output: {
            filename: 'output.js',
            path: '/dist',
            libraryTarget: 'var',
            library: '$lib',
        },
        plugins: [
        ],
    }, customOptions);
    const compiler = webpack(<any>options);

    compiler.inputFileSystem = fs;
    compiler.outputFileSystem = fs;
    (<any>compiler).resolvers.normal.fileSystem = fs;
    (<any>compiler).resolvers.context.fileSystem = fs;

    staticImportWebpackPlugin(compiler);
    return new Promise<webpack.Stats>((resolve, reject) => {
        compiler.run((error, stats) => {
            if (error) {
                return reject(error);
            }
            let { errors, warnings } = stats.toJson({ all: true });
            errors = [...errors, ...warnings];
            if (errors.length > 0) {
                return reject(errors);
            }
            resolve(stats);
        });
    });
}

function getOutput(source: string, { lines = 0 } = {}) {
    const marks = ['/******/', '/************************************************************************/'];
    const startIndex = source.indexOf(marks[0]);
    const endIndex = source.lastIndexOf(marks[1]);
    let result = source.slice(0, startIndex) + source.slice(endIndex + marks[1].length);
    if (lines > 0) {
        result = result.split('\n').slice(0, lines).join('\n');
    }
    return result.trim();
}

it('smoke', async () => {
    fs.writeFileSync('/foo.js', `export const foo = () => console.log('foo')`);
    fs.writeFileSync('/entry.js', `
        import { foo } from './foo'
        console.log('Hi there')
    `);
    const stats = await compile();
    const output = stats.compilation.assets['output.js'].source();
    expect(output).toContain(`console.log('Hi there')`);
});

it('static import with options', async () => {
    fs.writeFileSync('/entry.js', `import /* webpackIgnore: true */ './foo'`);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import './foo'`);
    expect(output).not.toContain(`import /* webpackIgnore: true */ './foo'`);
});

it('static import all', async () => {
    fs.writeFileSync('/entry.js', `import * as all /* webpackIgnore: true */ from './all'`);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import * as all from './all'`);
    expect(output).not.toContain(`import * as all /* webpackIgnore: true */ from './all'`);
});

it('multiple static import', async () => {
    fs.writeFileSync('/entry.js', `
        import pokemon /* webpackIgnore: true */ from './pokemon';
        import /* webpackIgnore: true */ * as bundledUnicorn from './unicorn';
        `);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import pokemon from './pokemon'`);
    expect(output).toContain(`import * as bundledUnicorn from './unicorn'`);
    expect(output).not.toContain(`import pokemon /* webpackIgnore: true */ from './pokemon'`);
    expect(output).not.toContain(`import /* webpackIgnore: true */ * as bundledUnicorn from './unicorn'`);
});

it('referencing ignored static import in bundle', async () => {
    fs.writeFileSync('/entry.js', `
        import pokemon /* webpackIgnore: true */ from 'http://example.com/pokemon';
        pokemon('hi');
        console.log(typeof pokemon);
        export { pokemon };
        `);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source());
    expect(output).toContain(`import pokemon from 'http://example.com/pokemon'`);
    expect(output).not.toContain(`MODULE_NOT_FOUND`);
});

it('multiple import duplicates', async () => {
    fs.writeFileSync('/entry.js', `
        import A /* webpackIgnore: true */ from 'a';
        import /* webpackIgnore: true */ 'b';
        `);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source(), { lines: 3 });
    expect(output).not.toContain(`import A from 'a';\nimport A from 'a';`);
});

it('import side effects', async () => {
    fs.writeFileSync('/entry.js', `
        import /* webpackIgnore: true */ 'a';
        import /* webpackIgnore: true */ 'b';
        `);
    const stats = await compile();
    const output = getOutput(stats.compilation.assets['output.js'].source(), { lines: 3 });
    expect(output).toContain(`import 'a'`);
    expect(output).toContain(`import 'b'`);
    expect(output).not.toContain(`import /* webpackIgnore: true */ 'a'`);
    expect(output).not.toContain(`import /* webpackIgnore: true */ 'b'`);
});
