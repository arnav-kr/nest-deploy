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
      if(stderr) return console.log(stderr);

      let port = stdout.match(/\d+/gm)[0];
      projects.push({ id, token, path: projectPath, status: "stopped", port });
      fs.writeFileSync(path.join(__dirname, "projects.json"), JSON.stringify(projects, null, 2));
    }
    else if (args[1] === "remove") {
      const id = args[2];
      const index = projects.findIndex(project => project.id === id);
      if (index !== -1) {
        projects.splice(index, 1);
        fs.writeFileSync(path.join(__dirname, "projects.json"), JSON.stringify(projects, null, 2));
      }
      else {
        console.log("Project not found");
      }
    }
    else if (args[1] === "list") {
      console.log(projects.map(project => (
        // ansi styled red \x1b[
        `\x1b[34m${project.id}\x1b[0m
\t\x1b[30mPath:\x1b[0m ${project.path}
\t\x1b[30mDeploy Token:\x1b[0m ${project.token}
\t\x1b[30mStatus:\x1b[0m ${project.status === "stopped" ? "\x1b[31m" : "\x1b32m"}${project.status}\x1b[0m`
      )).join("\n"));
    }
    else {
      console.log("Commands:");
      console.log("\tnest-deploy project add <path>");
      console.log("\tnest-deploy project remove <id>");
      console.log("\tnest-deploy project list");
    }
  }
  else if (args[0] === "deploy") {
    const id = args[1];
    const project = projects.find(project => project.id === id);
    if (!project) {
      return console.log("Project not found");
    }
    const token = args[2];
    if (token !== project.token) {
      return console.log("Unauthorized");
    }
    try {
      // TODO: Deploy Project
      console.log("Deployment Successful");
    }
    catch (e) {
      console.log("Deployment Failed");
    }
  }
  else {
    console.log("Commands:");
    console.log("\tnest-deploy project SUBCOMMAND");
    console.log("\tnest-deploy deploy <id>");
  }
})();