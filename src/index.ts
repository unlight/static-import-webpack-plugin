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
    compiler.hooks.thisCompilation.tap('StaticImport', thisCompilationTap.bind(undefined, importSources));
}

function thisCompilationTap(importSources, compilation, { normalModuleFactory }) {
    const boundParserImportTap = parserImportTap.bind(undefined, importSources);
    normalModuleFactory.hooks.parser.for('javascript/auto').tap('StaticImport', boundParserImportTap);
    normalModuleFactory.hooks.parser.for('javascript/dynamic').tap('StaticImport', boundParserImportTap);
    normalModuleFactory.hooks.parser.for('javascript/esm').tap('StaticImport', boundParserImportTap);
    compilation.hooks.optimizeChunkAssets.tap('StaticImport', compilationOptimizeChunkAssetsTap.bind(undefined, compilation, importSources));
}

function parserImportTap(importSources, parser, parserOptions) {
    const boundImportTap = importTap.bind(undefined, importSources, parser);
    parser.hooks.import.tap('StaticImport', boundImportTap);
    parser.hooks.importSpecifier.tap('StaticImport', boundImportTap);
}

function importTap(importSources, parser, statement, source, specifier, name) {
    const module = parser.state.module;
    if (importSources.has(module) && importSources.get(module).includes(statement)) {
        return false;
    }
    const { options, errors } = parser.parseCommentOptions(statement.range);
    if (errors) {
        const warnings = errors.map(error => {
            return new CommentCompilationWarning(
                `Compilation error while processing comment(-s): /*${error.comment.value}*/: ${error.message}`,
                parser.state.module,
                error.comment.loc,
            );
        });
        if (warnings.length > 0) {
            parser.state.module.warnings.push(...warnings);
        }
    }
    if (options && options.webpackIgnore) {
        const module = parser.state.module;
        if (!importSources.has(module)) {
            importSources.set(module, []);
        }
        importSources.get(module).push(statement);
        module.dependencies
            .filter(isHarmonyImportDependency)
            .forEach(dependency => module.removeDependency(dependency));

        module.addDependency(new ConstDependency('', statement.range));
        return false;
    }
}

function compilationOptimizeChunkAssetsTap(compilation, importSources, chunks) {
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
}

function importsForModule(importSources: WeakMap<object, any>, module: any) {
    return importSources.get(module)
        .map(generate)
        .join('\n');
}

function isHarmonyImportDependency(dependency: { constructor: { name: string } }) {
    return [
        'HarmonyCompatibilityDependency',
        'HarmonyInitDependency',
        'HarmonyImportSpecifierDependency',
        // 'HarmonyImportSideEffectDependency',
    ].includes(dependency.constructor.name);
}
