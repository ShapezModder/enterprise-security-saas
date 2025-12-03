FROM node:20

# =====================================================
# PHASE 1: Install System Dependencies & Runtimes
# =====================================================

# Install base system packages
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3 \
    python3-pip \
    python3-dev \
    ruby \
    ruby-dev \
    nmap \
    dnsutils \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Go (required for ProjectDiscovery tools)
ENV GO_VERSION=1.21.5
RUN wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz && \
    rm go${GO_VERSION}.linux-amd64.tar.gz

ENV PATH="/usr/local/go/bin:/root/go/bin:$PATH"
ENV GOPATH="/root/go"

# =====================================================
# PHASE 2: Install Go-Based Security Tools
# =====================================================

# ProjectDiscovery Suite
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/katana/cmd/katana@latest && \
    go install -v github.com/ffuf/ffuf/v2@latest

# Update Nuclei templates
RUN nuclei -update-templates

# =====================================================
# PHASE 3: Install Python-Based Security Tools
# =====================================================

# Upgrade pip
RUN pip3 install --break-system-packages --upgrade pip setuptools wheel

# Install Python security tools
RUN pip3 install --break-system-packages \
    sqlmap \
    truffleHog \
    wafw00f \
    commix

# =====================================================
# PHASE 4: Install Ruby-Based Security Tools
# =====================================================

# Install WPScan
RUN gem install wpscan

# =====================================================
# PHASE 5: Install Git-Based Tools
# =====================================================

# Install testssl.sh
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl && \
    chmod +x /opt/testssl/testssl.sh && \
    ln -s /opt/testssl/testssl.sh /usr/local/bin/testssl

# Install WhatWeb
RUN git clone --depth 1 https://github.com/urbanadventurer/WhatWeb.git /opt/whatweb && \
    chmod +x /opt/whatweb/whatweb && \
    ln -s /opt/whatweb/whatweb /usr/local/bin/whatweb

# Install Nikto
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto && \
    chmod +x /usr/local/bin/nikto

# =====================================================
# PHASE 6: Application Setup
# =====================================================

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install Node.js dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Create scans output directory
RUN mkdir -p /app/scans

# Expose port
EXPOSE 3002

# Debug: Verify tool installations
RUN echo "=== Verifying Tool Installations ===" && \
    which nuclei && nuclei -version && \
    which subfinder && subfinder -version && \
    which katana && katana -version && \
    which ffuf && ffuf -V && \
    which nmap && nmap --version && \
    which nikto && nikto -Version && \
    which sqlmap && sqlmap --version && \
    which wafw00f && \
    which wpscan && wpscan --version && \
    which testssl && \
    which whatweb && \
    echo "=== All Tools Verified ==="

# Start worker
CMD ["node", "dist/index.js"]
