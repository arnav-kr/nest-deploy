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
      try {
        // stop container
        await exec(`docker stop ${project.id}`);
        // remove conatiner
        await exec(`docker rm ${project.id}`);
        // run new container
        await exec(`docker run -d --name ${project.id} -p ${project.port}:${project.internalPort || 3000} ${project.id}`, { cwd: project.path });
        return "Started Container";
      }
      catch (e) {
        return "An error occurred while creating container";
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