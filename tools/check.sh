#!/usr/bin/env bash
# 语法检查：所有前端 JS 与服务端
cd "$(dirname "$0")/.." || exit 1
fail=0
for f in server.js public/js/core.js public/js/views/*.js tools/*.js; do
  [ -e "$f" ] || continue
  node --check "$f" || { echo "语法错误: $f"; fail=1; }
done
if [ $fail -eq 0 ]; then echo "语法检查全部通过"; fi
exit $fail
