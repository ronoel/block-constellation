#!/bin/bash

tag=$1

if [ $# -eq 0 ]
  then
    echo "No tag supplied!"
    exit 1;
fi

echo -e "\e[34m"
echo ">>> Building project - Tag: $tag <<<"
echo -e "\e[0m"
ng build --configuration production --base-href /games/block-constellation/
#ng build --configuration production

echo -e "\e[34m"
echo ">>> Building Image <<<"
echo -e "\e[0m"
docker image build -t block-constellation-ui .
docker tag block-constellation-ui southamerica-east1-docker.pkg.dev/smiling-stock-373320/pulseb-containers/block-constellation-ui:$tag

echo -e "\e[34m"
echo ">>> Pushing Image <<<"
echo -e "\e[0m"
docker push southamerica-east1-docker.pkg.dev/smiling-stock-373320/pulseb-containers/block-constellation-ui:$tag