@echo off
cd /d "%~dp0"
if not exist "元素塔防-双击即玩.html" (
  echo 未找到单文件游戏，请先运行 node tools\build-standalone.mjs
  pause
  exit /b 1
)
start "" "元素塔防-双击即玩.html"
exit /b 0
