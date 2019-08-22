import * as webpack from 'webpack';
import * as ConstDependency from 'webpack/lib/dependencies/ConstDependency';
import * as CommentCompilationWarning from 'webpack/lib/CommentCompilationWarning';
import { ConcatSource } from 'webpack-sources';
import { generate } from 'astring';

export function esmImportPlugin(compiler: webpack.Compiler) {

    const importSources = new WeakMap();

    compiler.hooks.thisCompilation.tap('EsmImportPlugin.thisCompilation', (compilation, params) => {
        const { normalModuleFactory } = params as (typeof params & { contextModuleFactory: any, compilationDependencies: Set<any> });

        function importHandler(parser, statement, source) {
            const { options, errors } = parser.parseCommentOptions(statement.range);

            if (errors) {
                for (const error of errors) {
                    const warning = new CommentCompilationWarning(
                        `Compilation error while processing magic comment(-s): /*${error.comment.value}*/: ${error.message}`,
                        parser.state.module,
                        error.comment.loc
                    );
                    parser.state.module.warnings.push(warning);
                }
            }

            if (options && options.webpackIgnore) {
                const module = parser.state.module;
                if (!importSources.has(module)) {
                    importSources.set(module, []);
                }
                importSources.get(module).push(statement);
                const clearDependency = new ConstDependency('', statement.range);
                clearDependency.loc = statement.loc;
                module.addDependency(clearDependency);
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

    function importsForModule(module) {
        return importSources.get(module)
            .map(generate)
            .join('\n');
    }
}
