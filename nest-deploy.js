// #!/usr/bin/env node
const util = require('util');
const exec = util.promisify(require('child_process').exec);
if (!process.argv[0].includes("node-deploy")) process.argv.shift();
const args = process.argv.slice(1);

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (!fs.existsSync("./projects.json")) {
  fs.writeFileSync("./projects.json", "[]");
}
let projects = require("./projects.json");
; (async () => {
  if (args[0] === "project") {
    if (!fs.existsSync("nest-deploy.sh")) return console.log("Please run `nest-deploy setup` first");
    if (args[1] === "add") {
      let projectPath = args[2];
      projectPath = path.resolve(projectPath);
      if (!fs.existsSync(projectPath)) {
        return console.log("Path does not exist");
      }
      const id = projectPath.split(/[\\|\/]/gm).pop();
      if (projects.find(project => project.id === id)) {
        return console.log("Project already exists");
      }
      const token = crypto.randomUUID();
      let {
        stdout,
        stderr
      } = await exec('nest get_port');
      if (stderr) return console.log(stderr);

      let port = stdout.match(/\d+/gm)[0];
      let internalPort = 3000;
      let project = { id, token, path: projectPath, port, internalPort };
      projects.push(project);
      fs.writeFileSync(path.join(__dirname, "projects.json"), JSON.stringify(projects, null, 2));
      console.log(`Deploy URL: https://deploy.${process.env.USER}.hackclub.app/${id}`);
      logProjectDetails(project);
    }
    else if (args[1] === "remove") {
      const id = args[2];
      const index = projects.findIndex(project => project.id === id);
      if (index !== -1) {
        projects.splice(index, 1);
        fs.writeFileSync(path.join(__dirname, "projects.json"), JSON.stringify(projects, null, 2));
        // stop and remove container
        await exec(`docker stop ${id}`);
        await exec(`docker rm ${id}`);
        console.log("Project removed");
      }
      else {
        console.log("Project not found");
      }
    }
    else if (args[1] === "status") {
      const id = args[2];
      const project = projects.find(project => project.id === id);
      if (!project) {
        return console.log("Project not found");
      }
      let {
        stdout,
        stderr
      } = await exec(`docker ps -a --filter name=${project.id}`);
      if (stderr) return console.log(stderr);
      console.log(stdout);
    }
    else if (args[1] === "list") {
      for(let project of projects) {
        logProjectDetails(project);
      }
    }
    else {
      console.log("Commands:");
      console.log("    nest-deploy project add <path>");
      console.log("    nest-deploy project remove <id>");
      console.log("    nest-deploy project list");
    }
  }
  else if (args[0] === "setup") {
    let port;
    try {
      let {
        stdout,
        stderr
      } = await exec('nest get_port');
      port = stdout.match(/\d+/gm)[0];
    }
    catch (e) {
      return console.error("Failed to get a port");
    }

    // add a free port to .env
    if (!fs.existsSync(".env")) {
      fs.writeFileSync(".env", `PORT=${port}`);
    }

    // create nest-deploy.sh
    fs.writeFileSync("./nest-deploy.sh", `#!/usr/bin/env bash
cd ${path.resolve("./")}
git pull
npm install
npm start
`);

    // create systemd service
    if (!fs.existsSync(path.resolve(`/home/${process.env.USER}/.config/systemd/user/nest-deploy.service`))) {
      if (!fs.existsSync(path.resolve(`/home/${process.env.USER}/.config/systemd/user`))) {
        fs.mkdirSync(path.resolve(`/home/${process.env.USER}/.config/systemd/user`), { recursive: true });
      }
      fs.writeFileSync(path.resolve(`/home/${process.env.USER}/.config/systemd/user/nest-deploy.service`), `[Unit]
Description=
DefaultDependencies=no
After=network-online.target

[Service]
Type=oneshot
ExecStart=${path.resolve("./nest-deploy.sh")}
TimeoutStartSec=0

[Install]
WantedBy=default.target`);
    }

    // make script executable
    await exec('chmod +x nest-deploy.sh');

    // caddyfile
    // check if entry already exists
    let caddyfile = fs.readFileSync(`/home/${process.env.USER}/Caddyfile`, "utf8");
    if (!caddyfile.includes(`deploy.${process.env.USER}.hackclub.app`)) {
      caddyfile += `http://deploy.${process.env.USER}.hackclub.app {
    bind unix/.deploy.webserver.sock|777
    reverse_proxy 0.0.0.0:${port}
}`;
      fs.writeFileSync(`/home/${process.env.USER}/Caddyfile`, caddyfile);

      // reload caddy
      await exec('systemctl --user reload caddy.service');
      
      // enable service
      await exec('systemctl --user enable nest-deploy.service');
      // start srvice
      await exec('systemctl --user start nest-deploy.service')
    }
  }
  else {
    console.log("Commands:");
    console.log("    nest-deploy setup");
    console.log("    nest-deploy project SUBCOMMAND");
    console.log("    nest-deploy deploy <id>");
  }
})();

function logProjectDetails(project) {
  console.log(`\x1b[34m${project.id}\x1b[0m
    \x1b[90mPath:\x1b[0m ${project.path}
    \x1b[90mDeploy URL:\x1b[0m https://deploy.${process.env.USER}.hackclub.app/${project.id}
    \x1b[90mDeploy Token:\x1b[0m ${project.token}
    \x1b[90mPort:\x1b[0m ${project.port}
    \x1b[90mInternal Port:\x1b[0m ${project.internalPort || 3000}`
  );
}