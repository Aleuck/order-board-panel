@echo off
set IMAGE_NAME=painel-overcooked-dev

docker build -t %IMAGE_NAME% .

docker run --rm -it -p 5173:5173 -v "%cd%":/app -w /app %IMAGE_NAME%
