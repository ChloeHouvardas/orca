#!/bin/bash

cd frontend; pnpm dev &
cd ../backend; uv run uvicorn main:app --reload 

