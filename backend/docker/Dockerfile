FROM python:3.8-slim

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

# COPY Corpus /Corpus
COPY settings /settings
# Set working directory
WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of the application code
COPY backend .
COPY backend/docker/prepare_docker_structure.py .

# Expose the application port
EXPOSE 8000

# Command to run the application
# CMD ["uvicorn", "get_results:backend", "--host", "0.0.0.0", "--port", "8000"]
CMD [ "bash", "-c", "python docker/prepare_docker_structure.py && gunicorn get_results:backend --bind 0.0.0.0:8000 -w 4 -k uvicorn.workers.UvicornWorker" ]
