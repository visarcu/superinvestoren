const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fix: folly/coro/Coroutine.h is not shipped in ReactNativeDependencies pod.
// folly/Expected.h includes it unconditionally when FOLLY_HAS_COROUTINES=1
// (set via compiler feature detection, can't be overridden with preprocessor flags).
// Patch the header after pod install to guard the include with __has_include.
module.exports = function withReanimatedFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes('patch_folly_coroutine')) {
        return config;
      }

      // Ruby code to insert inside the existing post_install block
      const fixCode = `
    # patch_folly_coroutine: guard folly/coro/Coroutine.h include
    expected_h = File.join(installer.sandbox.root, 'Headers/Public/ReactNativeDependencies/folly/Expected.h')
    if File.exist?(expected_h)
      src = File.read(expected_h)
      unless src.include?('__has_include(<folly/coro/Coroutine.h>)')
        src.gsub!('#if FOLLY_HAS_COROUTINES', '#if FOLLY_HAS_COROUTINES && __has_include(<folly/coro/Coroutine.h>)')
        File.write(expected_h, src)
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
