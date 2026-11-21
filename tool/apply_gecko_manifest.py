"""fully 变体：把 GeckoMainActivity 设为 launcher（CI 注入用，本地纯代码）。

背景：此前 fully APK 的 classes.dex 只有 Capacitor MainActivity，
GeckoView 打进去了但没被声明为 launcher → 启动仍走系统 WebView，
171MB 内核成了死重量。

用法（CI 内）：
    python3 tool/apply_gecko_manifest.py android/app/src/main/AndroidManifest.xml
"""
import pathlib
import re
import sys

GECKO_ACTIVITY = """        <activity
            android:name="com.tiernan.music.next.GeckoMainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
"""


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: apply_gecko_manifest.py <AndroidManifest.xml>')
        return 1
    mf = pathlib.Path(sys.argv[1])
    if not mf.exists():
        print('manifest not found:', mf)
        return 1
    s = mf.read_text(encoding='utf-8')
    if 'GeckoMainActivity' in s:
        print('manifest already patched')
        return 0
    # 去掉 Capacitor MainActivity 的 launcher intent-filter（保留 activity 本体）
    s2 = re.sub(
        r'(<activity[^>]*android:name="\.MainActivity"[^>]*>)\s*<intent-filter>.*?</intent-filter>',
        r'\1',
        s,
        flags=re.S,
    )
    if s2 == s:
        print('WARN: MainActivity intent-filter 未匹配（模板结构可能已变）')
    if '    </application>' in s2:
        s2 = s2.replace('    </application>', GECKO_ACTIVITY + '    </application>')
    else:
        s2 = s2.replace('</application>', GECKO_ACTIVITY + '</application>')
    mf.write_text(s2, encoding='utf-8')
    print('manifest: GeckoMainActivity set as LAUNCHER')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
