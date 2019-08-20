import * as webpack from 'webpack';
import * as ConstDependency from 'webpack/lib/dependencies/ConstDependency';
import { ConcatSource } from 'webpack-sources';

export function esmImportPlugin(compiler: webpack.Compiler) {

    const importSources = new WeakMap();

    compiler.hooks.thisCompilation.tap('EsmImportPlugin.thisCompilation', (compilation, params) => {
        const { normalModuleFactory } = params as (typeof params & { contextModuleFactory: any, compilationDependencies: Set<any> });

        function importHandler(parser, statement, source) {
            const { options, errors } = parser.parseCommentOptions(statement.range);
            // todo: handle errors
            if (options != undefined && options.webpackIgnore) {
                if (!importSources.has(parser.state.module)) {
                    importSources.set(parser.state.module, []);
                }
                importSources.get(parser.state.module).push(source);
                const clearDependency = new ConstDependency('', statement.range);
                clearDependency.loc = statement.loc;
                parser.state.module.addDependency(clearDependency);
                return false;
            }
        }

        normalModuleFactory.hooks.parser
            .for('javascript/auto')
            .tap('EsmImportPlugin.normalModuleFactory.parser', (parser, parserOptions) => {
                parser.hooks.import.tap('EsmImportPlugin.parser.import', importHandler.bind(null, parser));
            });

        compilation.hooks.optimizeChunkAssets.tap('esmImportPlugin.compilation.optimizeChunkAssets', (chunks) => {
            chunks.forEach(chunk => {
                if (importSources.has(chunk.entryModule)) {
                    chunk.files.forEach(fileName => {
                        compilation.assets[fileName] = new ConcatSource(
                            importsForModule(chunk.entryModule),
                            '\n\n',
                            compilation.assets[fileName],
                        );
                    });
                }
            });
        });
    });

    function importsForModule(entryModule) {
        return importSources.get(entryModule)
            .map(s => `import '${s}';`)
            .join('\n');
    }

    // console.log("compiler", compiler);

    // TARGET: hook into
    // parser.hooks.import.tap

    // compiler.hooks.beforeCompile

    // compiler.hooks.compile.tap(PLUGIN_NAME, (params) => {
    //     debugger;
    // });

    // compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation, moduleFactoryOptions) => {
    //     const { contextModuleFactory, normalModuleFactory } = moduleFactoryOptions as (typeof moduleFactoryOptions & { contextModuleFactory: any });
    //     // console.log("normalModuleFactory", normalModuleFactory);
    //     // console.log("contextModuleFactory", contextModuleFactory);

    //     // compilation.mainTemplate.hooks.
    //     // compilation.hooks.compil

    //     const handler = (parser, parserOptions) => {
    //         debugger;

    //         // console.log("parser", parser);
    //         // console.log("parser.state.module", parser.state);

    //         // if (parserOptions.import !== undefined && !parserOptions.import)
    //         //     return;

    //         // console.log("parser.hooks", parser.hooks);

    //         // new ImportParserPlugin(options).apply(parser);
    //         parser.hooks.importCall.tap(PLUGIN_NAME, expr => {
    //             console.log("expr", expr);
    //         });

    //         parser.hooks.importSpecifier.tap(PLUGIN_NAME, (a) => {
    //             console.log("a", a);
    //         });

    //         parser.hooks.import.tap(PLUGIN_NAME, (statement, source) => {
    //             debugger;
    //             console.log("source", source);
    //             console.log("statement", statement);
    //         });


    //         parser.hooks.program.tap(PLUGIN_NAME, (ast, comments) => {
    //             const module = parser.state.module;
    //             debugger;
    //         });
    //     };

    //     normalModuleFactory.hooks.parser
    //         .for('javascript/auto')
    //         .tap(PLUGIN_NAME, handler);
    //     normalModuleFactory.hooks.parser
    //         .for('javascript/dynamic')
    //         .tap(PLUGIN_NAME, handler);
    //     normalModuleFactory.hooks.parser
    //         .for('javascript/esm')
    //         .tap(PLUGIN_NAME, handler);
    // });

    // compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
    //     // Explore each chunk (build output):
    //     // compilation.chunks.forEach(chunk => {
    //     //     // Explore each module within the chunk (built inputs):
    //     //     // chunk.getModules().forEach(module => {
    //     //     //     // Explore each source file path that was included into the module:
    //     //     //     module.fileDependencies.forEach(filepath => {
    //     //     //         // we've learned a lot about the source structure now...
    //     //     //     });
    //     //     // });

    //     //     // Explore each asset filename generated by the chunk:
    //     //     // chunk.files.forEach(filename => {
    //     //     //     // Get the asset source for each file generated by the chunk:
    //     //     //     const source = compilation.assets[filename].source();
    //     //     //     console.log("source", source);
    //     //     // });
    //     // });

    //     callback();
    // });
}
