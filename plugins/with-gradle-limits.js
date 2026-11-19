// O servidor grátis do EAS tem só 4 vCPUs. Com muitas compilações C++ em paralelo
// (Skia, Reanimated, Worklets...) o build travou até estourar o limite de 45 min.
// Aqui limitamos o paralelismo do Gradle para ele não se afogar.
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = {
  'org.gradle.workers.max': '2',
  'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
};

module.exports = function withGradleLimits(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === key));
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
