// O servidor grátis do EAS (4 vCPUs, 16 GB) ficou sem memória compilando o C++
// do Skia/Reanimated em paralelo: o processo do Gradle foi morto ("daemon disappeared").
// Aqui deixamos o build mais econômico: uma tarefa por vez, Kotlin dentro do
// mesmo processo do Gradle (um Java a menos na memória) e heap menor.
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = {
  'org.gradle.workers.max': '1',
  'org.gradle.parallel': 'false',
  'kotlin.compiler.execution.strategy': 'in-process',
  'org.gradle.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8',
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
