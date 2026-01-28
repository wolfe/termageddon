# Multi-stage build for Django backend
FROM python:3.13-slim as builder

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Install Gunicorn for production
RUN pip install --no-cache-dir --user gunicorn

# Production stage
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Build metadata (will be overridden by build args)
ARG BUILD_VERSION=unknown
ARG BUILD_TIME=unknown
RUN echo "{\"version\": \"${BUILD_VERSION}\", \"build_time\": \"${BUILD_TIME}\"}" > /app/build_info.json

# Create directory for static files
RUN mkdir -p /app/staticfiles

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "Termageddon.wsgi:application"]
