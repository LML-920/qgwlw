const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const hbuilder = process.env.HBUILDERX_HOME || 'E:/html/HBuilderX';
const plugins = path.join(hbuilder, 'plugins');
const localCli = path.join(root, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js');
const useHBuilder = !fs.existsSync(localCli);
const cli = useHBuilder ? path.join(plugins, 'uniapp-cli-vite/node_modules/@dcloudio/vite-plugin-uni/bin/uni.js') : localCli;
if (!fs.existsSync(cli)) throw new Error('Set HBUILDERX_HOME to an installed HBuilderX with the uniapp-cli-vite plugin.');
const result = spawnSync(process.execPath, [cli, 'build', '-p', 'h5'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ...(useHBuilder ? { HX_APP_ROOT: hbuilder, UNI_HBUILDERX_PLUGINS: plugins, NODE_PATH: path.join(plugins, 'uniapp-cli-vite/node_modules') } : {}), UNI_INPUT_DIR: root, UNI_OUTPUT_DIR: path.join(root, 'unpackage/dist/build/web'), UNI_PLATFORM: 'h5', NODE_ENV: 'production' }
});
if (result.status === 0) {
  // HBuilderX may emit CRCRLF in index.html on Windows; keep the tracked output portable.
  const index = path.join(root, 'unpackage/dist/build/web/index.html');
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace(/\r+\n/g, '\n').replace(/[ \t]+$/gm, ''));
}
process.exit(result.status ?? 1);
