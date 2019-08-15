import { PlainObject } from 'simplytyped';

const PLUGIN_NAME = 'EsmImportPlugin';

export function esmImportPlugin(compiler) {
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
        // Explore each chunk (build output):
        compilation.chunks.forEach(chunk => {
            // Explore each module within the chunk (built inputs):
            chunk.getModules().forEach(module => {
                // Explore each source file path that was included into the module:
                module.fileDependencies.forEach(filepath => {
                    // we've learned a lot about the source structure now...
                });
            });

            // Explore each asset filename generated by the chunk:
            chunk.files.forEach(filename => {
                // Get the asset source for each file generated by the chunk:
                var source = compilation.assets[filename].source();
            });
        });

        callback();
    });
}