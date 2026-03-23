@echo off
g++ main.cpp -o dicesim.exe
if %ERRORLEVEL% EQU 0 (
    echo Compilation successful!
    echo Running Dice Simulator...
    dicesim.exe
) else (
    echo Compilation failed.
)
pause
