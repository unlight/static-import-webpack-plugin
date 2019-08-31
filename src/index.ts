import * as webpack from 'webpack';
import * as CommentCompilationWarning from 'webpack/lib/CommentCompilationWarning';
import * as ConstDependency from 'webpack/lib/dependencies/ConstDependency';
import { ConcatSource } from 'webpack-sources';
import { generate } from 'astring';

/**
 * Moves static import in webpack bundle to top level by using special comment webpackIgnore: true
 */
export class StaticImportWebpackPlugin implements webpack.Plugin {

    private importSources = new Map<string, any[]>();

    apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap('StaticImport', this.thisCompilationTap);
    }

    private thisCompilationTap = (compilation, { normalModuleFactory }) => {
        compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
        ['javascript/auto', 'javascript/dynamic', 'javascript/esm'].forEach(type => {
            normalModuleFactory.hooks.parser.for(type).tap('StaticImport', this.parserImportTap);
        });
        const boundOptimizeChunkAssetsTap = this.compilationOptimizeChunkAssetsTap.bind(this, compilation);
        compilation.hooks.optimizeChunkAssets.tap('StaticImport', boundOptimizeChunkAssetsTap);
    }

    private parserImportTap = (parser, parserOptions) => {
        const boundImportTap = this.importTap.bind(this, parser);
        parser.hooks.import.tap('StaticImport', boundImportTap);
        parser.hooks.importSpecifier.tap('StaticImport', boundImportTap);
    }

    private importTap = (parser, statement, source, specifier, name) => {
        const module = parser.state.module;
        let entryModule = module;
        while (entryModule.issuer != undefined) {
            entryModule = entryModule.issuer;
        }
        const moduleId = entryModule.debugId;
        let statements: any[] = [];
        if (this.importSources.has(moduleId)) {
            statements = this.importSources.get(moduleId)!;
        }
        if (statements.includes(statement)) {
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
            statements.push(statement);
            this.importSources.set(moduleId, statements);
            module.dependencies
                .filter(this.isHarmonyImportDependency)
                .forEach(dependency => module.removeDependency(dependency));
            module.addDependency(new ConstDependency('', statement.range));
            return false;
        }
    }

    private compilationOptimizeChunkAssetsTap = (compilation, chunks: any[]) => {
        chunks.forEach(chunk => {
            if (chunk.entryModule.constructor.name === 'MultiModule') {
                chunk.entryModule.dependencies.forEach(dependency => {
                    this.addImports(compilation, chunk, dependency.module);
                });
            } else {
                this.addImports(compilation, chunk, chunk.entryModule);
            }
        });
    }

    private addImports = (compilation, chunk, entryModule) => {
        if (!this.importSources.has(entryModule.debugId)) {
            return;
        }
        chunk.files.forEach(fileName => {
            const importsForModule = this.importSources.get(entryModule.debugId)!
                .map(statement => generate(statement))
                .join('\n');
            compilation.assets[fileName] = new ConcatSource(
                importsForModule,
                '\n\n',
                compilation.assets[fileName],
            );
        });
    }

    private isHarmonyImportDependency(dependency: { constructor: { name: string } }) {
        return [
            'HarmonyCompatibilityDependency',
            'HarmonyInitDependency',
            'HarmonyImportSpecifierDependency',
            // 'HarmonyImportSideEffectDependency',
        ].includes(dependency.constructor.name);
    }
}
