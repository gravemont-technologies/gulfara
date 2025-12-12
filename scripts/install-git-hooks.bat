@echo off
REM Simple Windows installer to copy the pre-commit hook into .git\hooks
setlocal
set ROOT=%~dp0\..
set ROOT=%ROOT:~0,-1%
set HOOKS=%ROOT%\.git\hooks
if not exist "%HOOKS%" (
  echo ".git\hooks not found. Are you running this from the repo's scripts folder?"
  exit /b 1
)
copy /Y "%~dp0prevent-secrets.sh" "%HOOKS%\pre-commit" >nul
echo Installed pre-commit hook to %HOOKS%\pre-commit
exit /b 0
