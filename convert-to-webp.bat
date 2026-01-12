@echo off
echo ========================================
echo  JPG to WebP Converter for Event Images
echo ========================================
echo.

:: Check if ImageMagick is installed
where magick >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: ImageMagick is not installed or not in PATH.
    echo.
    echo Install it using one of these methods:
    echo   1. winget install ImageMagick.ImageMagick
    echo   2. Download from https://imagemagick.org/script/download.php
    echo.
    pause
    exit /b 1
)

echo ImageMagick found. Starting conversion...
echo.

:: Set quality level (80 = good balance of quality and file size)
set QUALITY=80

:: Counter for converted files
set /a COUNT=0
set /a ERRORS=0

:: Convert season1 images
echo Converting season1 images...
for %%f in (event-images\season1\*.jpg) do (
    echo   Converting: %%~nxf
    magick convert "%%f" -quality %QUALITY% "%%~dpnf.webp" 2>nul
    if %errorlevel% equ 0 (
        set /a COUNT+=1
    ) else (
        echo   ERROR converting %%~nxf
        set /a ERRORS+=1
    )
)

:: Convert special event images
echo.
echo Converting special event images...
for %%f in (event-images\special\*.jpg) do (
    echo   Converting: %%~nxf
    magick convert "%%f" -quality %QUALITY% "%%~dpnf.webp" 2>nul
    if %errorlevel% equ 0 (
        set /a COUNT+=1
    ) else (
        echo   ERROR converting %%~nxf
        set /a ERRORS+=1
    )
)

echo.
echo ========================================
echo  Conversion Complete
echo ========================================
echo  Files converted: %COUNT%
echo  Errors: %ERRORS%
echo.

:: Show file size comparison
echo File size comparison (season1):
echo.
echo JPG files:
for %%f in (event-images\season1\*.jpg) do (
    echo   %%~nxf: %%~zf bytes
)
echo.
echo WebP files:
for %%f in (event-images\season1\*.webp) do (
    echo   %%~nxf: %%~zf bytes
)

echo.
pause
