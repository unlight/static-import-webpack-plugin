import * as webpack from 'webpack';
import * as CommentCompilationWarning from 'webpack/lib/CommentCompilationWarning';
import * as ConstDependency from 'webpack/lib/dependencies/ConstDependency';
import { ConcatSource } from 'webpack-sources';
import { generate } from 'astring';

/**
 * Moves static import in webpack bundle to top level by using special comment webpackIgnore: true
 */
export class StaticImportWebpackPlugin {
    apply = staticImportWebpackPlugin;
}

export function staticImportWebpackPlugin(compiler: webpack.Compiler) {

    const importSources = new WeakMap();

    compiler.hooks.thisCompilation.tap('StaticImport', (compilation, { normalModuleFactory }) => {

        normalModuleFactory.hooks.parser
            .for('javascript/auto')
            .tap('StaticImport', (parser, parserOptions) => {
                parser.hooks.import.tap('StaticImport', importHandler.bind(undefined, importSources, parser));
            });

        compilation.hooks.succeedModule.tap('StaticImport', (module: any) => {
            if (importSources.has(module)) {
                module.dependencies = module.dependencies.filter(filterDependency);
            }
        });

        compilation.hooks.optimizeChunkAssets.tap('StaticImport', (chunks) => {
            chunks.forEach(chunk => {
                if (importSources.has(chunk.entryModule)) {
                    chunk.files.forEach(fileName => {
                        compilation.assets[fileName] = new ConcatSource(
                            importsForModule(importSources, chunk.entryModule),
                            '\n\n',
                            compilation.assets[fileName],
                        );
                    });
                }
            });
        });
    });

}

function importHandler(importSources, parser, statement, source) {
    const { options, errors } = parser.parseCommentOptions(statement.range);

    if (errors) {
        const warnings = errors.map(error => {
            return new CommentCompilationWarning(
                `Compilation error while processing comment(-s): /*${error.comment.value}*/: ${error.message}`,
                parser.state.module,
                error.comment.loc,
            );
        });
        parser.state.module.warnings.push(warnings);
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

function filterDependency(dependency: { constructor: { name: string } }) {
    return ![
        'HarmonyExportDependencyTemplate',
        'HarmonyCompatibilityDependency',
        'HarmonyInitDependency',
        'HarmonyInitDependencyTemplate',
        'HarmonyImportSpecifierDependency',
        'HarmonyImportSpecifierDependencyTemplate',
        'HarmonyImportSideEffectDependency',
        'HarmonyImportSideEffectDependencyTemplate',
        // 'HarmonyAcceptImportDependency',
        // 'HarmonyAcceptImportDependencyTemplate',
    ].includes(dependency.constructor.name);
}

function importsForModule(importSources: WeakMap<object, any>, module: any) {
    return importSources.get(module)
        .map(generate)
        .join('\n');
}
