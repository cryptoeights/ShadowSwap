FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (none for now, pure Node.js)
RUN npm install --production 2>/dev/null || true

# Copy source code
COPY src/ ./src/

# iExec TEE environment variables will be set at runtime:
# IEXEC_IN - input directory with protected data
# IEXEC_OUT - output directory for results
# IEXEC_DATASET_FILENAME - name of the decrypted dataset file

ENTRYPOINT ["node", "src/app.js"]
