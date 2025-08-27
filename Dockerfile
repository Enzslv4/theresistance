# Use uma imagem Node.js leve
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos
COPY package*.json ./
COPY . .

# Instalar dependências
RUN npm install --only=production

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]