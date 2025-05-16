
# Start Clarinet

```
clarinet devnet start
```

```
clarinet check
```

## Run tests

Test the smart contracts

```
npm test
```

# How to install Clarinet

## Go to the project:
https://github.com/hirosystems/clarinet

## Install from a pre-built binary

Select the last tag, the last release.

Choose the file clarinet-linux-x64-glibc.tar.gz 

```
wget -nv https://github.com/hirosystems/clarinet/releases/download/v2.16.0/clarinet-linux-x64-glibc.tar.gz -O clarinet-linux-x64.tar.gz

tar -xf clarinet-linux-x64.tar.gz

chmod +x ./clarinet

sudo mv ./clarinet /usr/local/bin
```

# How to update to Nakamoto Upgrade

https://docs.hiro.so/stacks/nakamoto/guides/clarinet