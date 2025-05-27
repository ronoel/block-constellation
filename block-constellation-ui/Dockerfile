# # Use Node Slim image
# FROM node:21.2.0-slim

# ## Copy source code
# COPY . .

# EXPOSE 4000

# ## Start the application
# CMD ["node", "dist/pulseb-page-company-voucher/server/server.mjs"]


# TEST WITHOUT SSR
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /usr/share/nginx/html
COPY dist/block-constellation-ui/browser/ games/block-constellation/
