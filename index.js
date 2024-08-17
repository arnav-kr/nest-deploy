const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { spawn } = require('child_process');
const fastify = require('fastify')({ logger: true });

const projects = require("./projects.json");

fastify.get('/:project/:action', async (request, reply) => {
  let { project, action } = request.params;
  const token = request.headers.authorization;

  if (!token) return reply.status(401).send("Unauthorized");
  if (projects.findIndex(p => p.id === project) < 0) return reply.status(404).send("Project Not Found");

  // get project from local config
  project = projects.find(p => p.id === project);
  if (token !== project.token) return reply.status(401).send("Unauthorized");

  try {
    // pull latest changes
    if (action === "pull") {
      let gitOut = await exec(`git pull`, { cwd: project.path });
      return gitOut.stdout;
    }
    // build docker image
    else if (action === "build") {
      const dockerOut = spawn("docker", ["build", "-t", project.id, "."], { encoding: 'utf8', cwd: project.path });
      // Docker by default streams to stderr for build output, check https://github.com/docker/compose/issues/7346
      return dockerOut.stderr;
    }
    // run container
    else if (action === "run") {
      // check for existing container
      let exists = false;
      try {
        let existCheckOut = await exec(`docker ps -a | grep ${project.id}`);
        exists = true
      }
      catch (e) {
        exists = false;
      }

      // restart if exists
      if (exists) {
        spawn("docker", ["restart", project.id], { encoding: 'utf8', cwd: project.path });
        return "Restarted Container";
      }
      // else run new container
      else {
        spawn("docker", ["run", "-d", "--name", project.id, "-p", `${project.port}:${process.env.PORT}`, project.id], { encoding: 'utf8', cwd: project.path });
        return "Started Container";
      }
    }
    else {
      return reply.status(400).send("Invalid Action");
    }
  }
  catch (e) {
    return reply.status(500).send(e);
  }
});

fastify.get('*', (request, reply) => {
  return "Nest Deployer";
});

fastify.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});