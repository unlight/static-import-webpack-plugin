import * as webpack from 'webpack';
import * as CommentCompilationWarning from 'webpack/lib/CommentCompilationWarning';
import * as ConstDependency from 'webpack/lib/dependencies/ConstDependency';
import { ConcatSource } from 'webpack-sources';
import { generate } from 'astring';

/**
 * Moves static import in webpack bundle to top level by using special comment webpackIgnore: true
 */
export class StaticImportWebpackPlugin implements webpack.Plugin {

    private imports = new Map<string, string[]>();
    readonly name = this.constructor.name;

    apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap(this.name, this.thisCompilationTap);
    }

    private thisCompilationTap = (compilation, { normalModuleFactory }) => {
        compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
        ['javascript/auto', 'javascript/dynamic', 'javascript/esm'].forEach(type => {
            normalModuleFactory.hooks.parser.for(type).tap(this.name, (parser) => {
                const boundImportTap = this.importTap.bind(this, parser);
                parser.hooks.import.tap(this.name, boundImportTap);
                parser.hooks.importSpecifier.tap(this.name, boundImportTap);
            });
        });
        compilation.hooks.optimizeChunkAssets.tap(this.name, (chunks) => {
            this.compilationOptimizeChunkAssetsTap(compilation, chunks);
        });
    }

    private importTap = (parser, statement, source, specifier, name) => {
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
            let entryModule = module;
            while (entryModule.issuer != undefined) {
                entryModule = entryModule.issuer;
            }
            const moduleId = entryModule.debugId;
            let declarations: string[] = [];
            if (this.imports.has(moduleId)) {
                declarations = this.imports.get(moduleId)!;
            }
            const declaration = generate(statement);
            if (!declarations.includes(declaration)) {
                declarations.push(declaration);
                this.imports.set(moduleId, declarations);
            }
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
        if (!this.imports.has(entryModule.debugId)) {
            return;
        }
        chunk.files.forEach(fileName => {
            const importsForModule = this.imports.get(entryModule.debugId)!
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
            'HarmonyImportSpecifierDependency',
            // 'HarmonyCompatibilityDependency',
            // 'HarmonyInitDependency',
            // 'HarmonyImportSideEffectDependency',
        ].includes(dependency.constructor.name);
    }
}
