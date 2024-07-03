# Stage 1: Base
FROM python:3.8-slim as base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    wget \
    pkg-config \
    libc6-dev \
    libncurses-dev \
    libpcre3-dev \
    libglib2.0-dev \
    libreadline-dev \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://sourceforge.net/projects/cwb/files/cwb/cwb-3.5/deb/cwb_3.5.0-1_amd64.deb/download -O cwb-3.5.deb
RUN dpkg -i cwb-3.5.deb

# Set working directory
WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY ./requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Development
FROM base as development

# Install development dependencies
RUN pip install \
    pytest \
    pylint

# Copy the rest of the application code
COPY . .

# Copy the settings directory from the host
COPY ../settings ./settings

# Expose the application port
EXPOSE 8000

# Command to run the application in development mode
CMD ["uvicorn", "get_results:backend", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Stage 3: Production
FROM base as production

# Copy the rest of the application code
COPY . .

# Copy the settings directory from the host
COPY ../settings ./settings

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "get_results:backend", "--host", "0.0.0.0", "--port", "8000"]
