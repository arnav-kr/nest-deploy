const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fastify = require('fastify')({ logger: true });

const projects = require("./projects.json");

fastify.get('/deploy/:project', async (request, reply) => {
  const { project } = request.params;
  const token = request.headers.authorization;

  if (!token) return reply.status(401).send("Unauthorized");
  if (projects.findIndex(p => p.id === project) < 0) return reply.status(404).send("Project Not Found");
  project = projects.find(p => p.id === project);
  console.log(project);
  if (token !== project.token) return reply.status(401).send("Unauthorized");
  try {
    const gitOut = await exec(`git pull`, { cwd: project.path });
    if (gitOut.stderr) {
      console.error(gitOut.stderr);
      return reply.status(500).send("Deployment Failed");
    }
    const dockerOut = await exec(`docker build -t ${project} .`, { cwd: project.path });
    if (dockerOut.stderr) {
      console.error(dockerOut.stderr);
      return reply.status(500).send("Deployment Failed");
    }
    let existCheckOut = await exec(`docker ps -a | grep ${project.id}`);
    if (existCheckOut.stderr) {
      console.error(existCheckOut.stderr);
      return reply.status(500).send("Deployment Failed");
    }
    if (existCheckOut.stdout.length > 0) {
      let restartOut = await exec(`docker restart ${project.id}`);
      if (restartOut.stderr) {
        console.error(restartOut.stderr);
        return reply.status(500).send("Deployment Failed");
      }
      return reply.status(200).send("Deployment Successful");
    }
    else {
      let runOut = await exec(`docker run -d --name ${project.id} -p ${project.port}:80 ${project}`);
      if (runOut.stderr) {
        console.error(runOut.stderr);
        return reply.status(500).send("Deployment Failed");
      }
      return reply.status(200).send("Deployment Successful");
    }
  }
  catch (e) {
    return reply.status(500).send("Deployment Failed");
  }
});

fastify.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});