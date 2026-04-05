FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend
COPY backend ./backend
# Copy full repo bounds if necessary for local paths
COPY default.env .
COPY openenv.yaml .
COPY inference.py .

# Copy pre-built React frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860
EXPOSE 8001

ENV HOST=0.0.0.0
ENV PORT=7860
ENV ENVIRONMENT=production
ENV PYTHONPATH=/app

CMD ["python", "backend/main.py"]
