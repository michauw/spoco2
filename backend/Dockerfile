# Stage 1: Base
FROM python:3.8-slim as base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and install CWB tools
RUN wget -O cwb-3.5.0-src.tar.gz "https://sourceforge.net/projects/cwb/files/cwb/cwb-3.5/source/cwb-3.5.0-src.tar.gz" \
    && tar -xf cwb-3.5.0-src.tar.gz \
    && rm cwb-3.5.0-src.tar.gz \
    && cd cwb-3.5.0-src \
    && ./install-scripts/install-linux

# Set working directory
WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Development
FROM base as development

# Install development dependencies
RUN pip install \
    pytest \
    pylint

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 8000

# Command to run the application in development mode
CMD ["uvicorn", "get_results:backend", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Stage 3: Production
FROM base as production

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "get_results:backend", "--host", "0.0.0.0", "--port", "8000"]
