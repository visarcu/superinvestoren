const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fix: react-native-reanimated activates FOLLY_HAS_COROUTINES via compiler detection,
// but folly/coro/Coroutine.h is not shipped in the ReactNativeDependencies pod.
// Injects -DFOLLY_HAS_COROUTINES=0 into the existing post_install block.
module.exports = function withReanimatedFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes('FOLLY_HAS_COROUTINES')) {
        return config;
      }

      const fixCode = `
    # Fix: folly/coro/Coroutine.h not available in ReactNativeDependencies pod
    installer.pods_project.targets.each do |target|
      if target.name == 'RNReanimated'
        target.build_configurations.each do |bc|
          existing = bc.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
          bc.build_settings['OTHER_CPLUSPLUSFLAGS'] = existing + ' -DFOLLY_HAS_COROUTINES=0'
        end
      end
    end
`;

      // Insert inside existing post_install block
      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          'post_install do |installer|' + fixCode
        );
      } else {
        // No existing post_install — add one
        contents =
          contents +
          `\npost_install do |installer|\n${fixCode}end\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
