#!/bin/bash
V=$1
if [ -z "$V" ]; then echo "Usage: ./make-version.sh 1.0.0"; exit 1; fi
python3 << PYEOF
import json, re
V = "$V"
for path in ["src-tauri/tauri.conf.json", "package.json"]:
    with open(path) as f: d = json.load(f)
    d["version"] = V
    with open(path, "w") as f: json.dump(d, f, indent=2)
with open("src-tauri/Cargo.toml") as f: c = f.read()
c = re.sub(r'^version = "[\d\.]+"', f'version = "{V}"', c, count=1, flags=re.MULTILINE)
with open("src-tauri/Cargo.toml", "w") as f: f.write(c)
print(f"✅ All version files set to {V}")
PYEOF
git add -A
git commit -m "chore: release v$V"
git push origin main
git tag "v$V"
git push origin "v$V"
echo "✅ Released v$V — watch at:"
echo "   https://github.com/remote-accounting-and-consulting/hisabdesk-desktop/actions"
