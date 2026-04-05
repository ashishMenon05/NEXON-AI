FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

FROM python:3.11-slim
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --chown=user:user backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend
COPY --chown=user:user backend ./backend
# Copy full repo bounds if necessary for local paths
COPY --chown=user:user default.env .
COPY --chown=user:user openenv.yaml .
COPY --chown=user:user inference.py .

# Copy pre-built React frontend
COPY --chown=user:user --from=frontend-builder /app/frontend/dist ./frontend/dist

USER user

EXPOSE 7860
EXPOSE 8001

ENV HOST=0.0.0.0
ENV PORT=7860
ENV ENVIRONMENT=production
ENV PYTHONPATH=$HOME/app

CMD ["python", "backend/main.py"]
