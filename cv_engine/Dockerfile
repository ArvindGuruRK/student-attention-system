FROM python:3.11-slim

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY cv_engine/requirements.txt ./cv_engine/requirements.txt
RUN pip install --no-cache-dir -r cv_engine/requirements.txt
COPY . .

CMD ["python", "-m", "cv_engine.main", "--token", "${STUDENT_TOKEN}"]
