import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const originalExit = process.exit;
process.exit = function (code) {
    console.trace('process.exit called with code:', code);
    originalExit.call(process, code);
};

async function runBuild() {
    try {
        await build({
            root: __dirname,
            build: {
                minify: false,
            }
        });
        console.log('Build succeeded!');
    } catch (e) {
        console.error('Build failed with error:');
        console.error(e);
    }
}

runBuild();
