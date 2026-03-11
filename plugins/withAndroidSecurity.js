const { withAndroidManifest, withMainActivity, withProjectBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that applies Android security hardening:
 * 1. network_security_config.xml (HTTPS-only + IP fallback exception)
 * 2. Manifest: allowBackup=false, taskAffinity="", singleInstance, networkSecurityConfig
 * 3. ProGuard/R8 rules
 * 4. StrandHogg protection in MainActivity
 */
function withAndroidSecurity(config) {
  // Step 1: Create network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });

      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">87.106.51.243</domain>
    </domain-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>`;

      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), networkSecurityConfig);
      return config;
    },
  ]);

  // Step 2: Create ProGuard rules
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');

      const proguardRules = `# React Native & Expo core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class expo.modules.** { *; }
-dontwarn com.facebook.react.**

# OkHttp & Networking
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Google Maps
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.maps.android.** { *; }

# Strip android.util.Log in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Obfuscate SQLite references
-keep class android.database.sqlite.SQLiteDatabase { *; }
-keep class android.database.sqlite.SQLiteOpenHelper { *; }
`;

      fs.writeFileSync(proguardPath, proguardRules);
      return config;
    },
  ]);

  // Step 3: Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (application) {
      application.$['android:allowBackup'] = 'false';
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    // Find MainActivity and set security attributes
    const activities = application?.activity;
    if (activities) {
      for (const activity of activities) {
        if (activity.$['android:name'] === '.MainActivity') {
          activity.$['android:taskAffinity'] = '';
          activity.$['android:launchMode'] = 'singleInstance';
          activity.$['android:allowTaskReparenting'] = 'false';
        }
      }
    }

    return config;
  });

  // Step 4: Enable R8 minification in build.gradle
  config = withProjectBuildGradle(config, (config) => {
    // Project-level build.gradle doesn't need changes for R8
    return config;
  });

  // Step 5: Modify build.gradle (app-level) for ProGuard, R8, and release signing
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle');
      let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

      // Copy keystore to android/app/ if it exists in project root
      const projectRoot = path.join(config.modRequest.platformProjectRoot, '..');
      const keystoreSrc = path.join(projectRoot, 'kashif-release.keystore');
      const keystoreDst = path.join(config.modRequest.platformProjectRoot, 'app', 'kashif-release.keystore');
      if (fs.existsSync(keystoreSrc) && !fs.existsSync(keystoreDst)) {
        fs.copyFileSync(keystoreSrc, keystoreDst);
      }

      // Add release signing config if not present
      if (!buildGradle.includes('kashif-release.keystore')) {
        buildGradle = buildGradle.replace(
          /signingConfigs\s*\{/,
          `signingConfigs {
        release {
            storeFile file('kashif-release.keystore')
            storePassword 'Kashif2026Release'
            keyAlias 'kashif-key'
            keyPassword 'Kashif2026Release'
        }`
        );
      }

      // Always ensure release build type uses release signing config
      // Count occurrences of signingConfig signingConfigs.debug — the second one is in release block
      const debugSigningPattern = 'signingConfig signingConfigs.debug';
      const firstIdx = buildGradle.indexOf(debugSigningPattern);
      if (firstIdx !== -1) {
        const secondIdx = buildGradle.indexOf(debugSigningPattern, firstIdx + debugSigningPattern.length);
        if (secondIdx !== -1) {
          buildGradle = buildGradle.substring(0, secondIdx) + 'signingConfig signingConfigs.release' + buildGradle.substring(secondIdx + debugSigningPattern.length);
        }
      }

      // Enable minification for release builds
      if (buildGradle.includes('minifyEnabled false') && buildGradle.includes('release {')) {
        buildGradle = buildGradle.replace(
          /release\s*\{[^}]*minifyEnabled\s+false/,
          (match) => match.replace('minifyEnabled false', 'minifyEnabled true')
        );
      }

      // Add proguard file reference if not present
      if (!buildGradle.includes('proguard-rules.pro')) {
        buildGradle = buildGradle.replace(
          /release\s*\{/,
          `release {\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'`
        );
      }

      fs.writeFileSync(buildGradlePath, buildGradle);
      return config;
    },
  ]);

  // Step 6: Add StrandHogg protection to MainActivity
  config = withMainActivity(config, (config) => {
    let content = config.modResults.contents;

    // Add Intent import if not present
    if (!content.includes('import android.content.Intent')) {
      content = content.replace(
        'import android.os.Bundle',
        'import android.content.Intent\nimport android.os.Bundle'
      );
    }

    // Inject StrandHogg protection at beginning of existing onCreate
    if (!content.includes('isTaskRoot')) {
      content = content.replace(
        'override fun onCreate(savedInstanceState: Bundle?) {',
        `override fun onCreate(savedInstanceState: Bundle?) {
    // StrandHogg protection: verify this activity was launched by our app
    if (!isTaskRoot) {
      val launchIntent = intent
      if (launchIntent.hasCategory(Intent.CATEGORY_LAUNCHER) && Intent.ACTION_MAIN == launchIntent.action) {
        finish()
        return
      }
    }`
      );
    }

    // Add onNewIntent validation if not present
    if (!content.includes('onNewIntent')) {
      // Insert before the closing brace of the class
      const lastBrace = content.lastIndexOf('}');
      content = content.substring(0, lastBrace) + `
  override fun onNewIntent(intent: Intent) {
    if (intent.component?.packageName != packageName) {
      return
    }
    super.onNewIntent(intent)
  }
` + content.substring(lastBrace);
    }

    config.modResults.contents = content;
    return config;
  });

  return config;
}

module.exports = withAndroidSecurity;
