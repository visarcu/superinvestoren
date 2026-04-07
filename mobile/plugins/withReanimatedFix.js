const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fix: react-native-reanimated activates FOLLY_HAS_COROUTINES via compiler detection,
// but folly/coro/Coroutine.h is not shipped in the ReactNativeDependencies pod.
// This injects -DFOLLY_HAS_COROUTINES=0 into RNReanimated's build settings.
module.exports = function withReanimatedFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const patch = `
# Fix folly/coro/Coroutine.h missing in ReactNativeDependencies pod
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'RNReanimated'
      target.build_configurations.each do |bc|
        existing = bc.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        bc.build_settings['OTHER_CPLUSPLUSFLAGS'] = existing + ' -DFOLLY_HAS_COROUTINES=0'
      end
    end
  end
end
`;

      if (!contents.includes('FOLLY_HAS_COROUTINES')) {
        contents = contents + patch;
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
