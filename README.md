<img src="https://github.com/arnav-kr/nest-deploy/raw/main/hatching-chick.gif?raw=true" alt="Nest Deploy" height="128">

# nest-deploy

A Utility for Deploying Docker Containers to Nest Instance

[![GitHub](https://img.shields.io/github/license/arnav-kr/nest-deploy?style=flat-square&logo=github&logoColor=white&label=GitHub&labelColor=%233d3d3d&color=%234285F4)](https://github.com/arnav-kr/nest-deploy)

## Setup

### On Nest

```sh
git clone https://github.com/arnav-kr/nest-deploy
cd nest-deploy
node ./nest-deploy.js setup
```
The setup script will add a `deploy` subdomain entry to `~/Caddyfile`, create a `systemd` service (`~/.config/systemd/user/nest-deploy.service`), enable and start the service

#### Add a project using the nest-deploy cli
```sh
node ./nest-deploy.js project add <path_to_project>
```
it will add a project entry in `./projects.json` file

#### list all the projects
```sh
node ./nest-deploy.js project list
```

Note down the `Deploy URL` and `Deploy Token` of your project,

> [!IMPORTANT]
> Deploy Token is meant to be confidential

### On GitHub Repo
1. copy the [.github/workflows/nest.yml](https://github.com/arnav-kr/nest-deploy/blob/main/.github/workflows/nest.yml) file to your repo
2. in the environment settings of repo add the `DEPLOY_URL` and `DEPLOY_TOKEN` of your project in environment secrets of `nest` environment
3. the deploy action will run whenever code is pushed to main branch and restart the project container running on the nest instance with the latest changes.



#### Run respective help commands of the cli for more info
```sh
node ./nest-deploy.js help
```
```sh
node ./nest-deploy.js project help
```

## Author
Arnav Kumar [@arnav-kr](https://github.com/arnav-kr)

## LICENSE
[AGPL-3.0](https://github.com/arnav-kr/nest-deploy/blob/main/LICENSE)
