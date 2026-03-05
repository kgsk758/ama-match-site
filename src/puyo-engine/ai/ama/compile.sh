#!/bin/bash

# Find all .cpp files except the one in test/
CPP_FILES=$(find . -name "*.cpp" ! -path "./test/*")

echo "Compiling with emcc..."
emcc -O3 \
    $CPP_FILES \
    --bind \
    -I. \
    -I./ai \
    -I./core \
    -I./lib \
    -std=c++20 \
    -msimd128 \
    -msse4.1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createAmaAI' \
    -o ama_ai.js

echo "Done!"
