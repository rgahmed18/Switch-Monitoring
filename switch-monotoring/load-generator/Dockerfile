FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY transaction_generator.py .

CMD ["python", "transaction_generator.py", "--broker", "kafka:29092", "--total", "100000", "--tps", "200"]
