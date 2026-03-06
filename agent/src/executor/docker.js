const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DockerExecutor {






  async execute(intent, params) {
    switch (intent) {
      case 'docker.status':
        return await this._getStatus();
      case 'docker.list':
        return await this._listContainers();
      case 'docker.logs':
        return await this._getLogs(params.container);
      case 'docker.stop':
        return await this._stopContainer(params.container);
      case 'docker.start':
        return await this._startContainer(params.container);
      case 'docker.restart':
        return await this._restartContainer(params.container);
      default:
        throw new Error(`DockerExecutor: Unsupported intent "${intent}"`);
    }
  }

  async _getStatus() {
    try {
      const { stdout } = await execPromise('docker version --format "{{.Server.Version}}"');
      return { version: stdout.trim() };
    } catch (err) {
      return { error: 'Docker daemon not reachable or not installed' };
    }
  }

  async _listContainers() {
    try {
      const { stdout } = await execPromise('docker ps --format "{{json .}}"');
      const containers = stdout.trim().split('\n').filter((l) => l).map((l) => JSON.parse(l));
      return { containers };
    } catch (err) {
      return { error: `Failed to list containers: ${err.message}` };
    }
  }

  async _getLogs(id) {
    if (!id) return { error: 'No container ID provided' };
    try {
      const { stdout } = await execPromise(`docker logs --tail 100 ${id}`);
      return {
        status: 'success',
        container: id,
        logs: stdout.trim()
      };
    } catch (err) {
      return { error: `Failed to get logs for container ${id}: ${err.message}` };
    }
  }

  async _stopContainer(id) {
    if (!id) return { error: 'No container ID provided' };
    try {
      await execPromise(`docker stop ${id}`);
      return { status: 'success', container: id, action: 'stop' };
    } catch (err) {
      return { error: `Failed to stop container ${id}: ${err.message}` };
    }
  }

  async _startContainer(id) {
    if (!id) return { error: 'No container ID provided' };
    try {
      await execPromise(`docker start ${id}`);
      return { status: 'success', container: id, action: 'start' };
    } catch (err) {
      return { error: `Failed to start container ${id}: ${err.message}` };
    }
  }

  async _restartContainer(id) {
    if (!id) return { error: 'No container ID provided' };
    try {
      await execPromise(`docker restart ${id}`);
      return { status: 'success', container: id, action: 'restart' };
    } catch (err) {
      return { error: `Failed to restart container ${id}: ${err.message}` };
    }
  }
}

module.exports = new DockerExecutor();