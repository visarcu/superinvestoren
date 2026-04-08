const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fix: folly/coro/Coroutine.h is not shipped in ReactNativeDependencies pod.
// Multiple folly headers include it when FOLLY_HAS_COROUTINES=1.
// Patch all affected headers after pod install.
module.exports = function withReanimatedFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes('patch_folly_coroutine')) {
        return config;
      }

      const fixCode = `
    # patch_folly_coroutine: guard all folly/coro/Coroutine.h includes
    folly_dir = File.join(installer.sandbox.root, 'Headers/Public/ReactNativeDependencies/folly')
    if File.directory?(folly_dir)
      Dir.glob(File.join(folly_dir, '*.h')).each do |f|
        src = File.read(f)
        next unless src.include?('#include <folly/coro/Coroutine.h>')
        next if src.include?('__has_include(<folly/coro/Coroutine.h>)')
        src.gsub!('#if FOLLY_HAS_COROUTINES', '#if FOLLY_HAS_COROUTINES && __has_include(<folly/coro/Coroutine.h>)')
        File.write(f, src)
        puts "Patched folly header: #{File.basename(f)}"
      end
    end
`;

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          'post_install do |installer|' + fixCode
        );
      } else {
        contents = contents + `\npost_install do |installer|\n${fixCode}end\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
