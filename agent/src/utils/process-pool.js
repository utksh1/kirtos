const { spawn } = require('child_process');

class WarmProcess {
  constructor(command, args, options) {
    this.command = command;
    this.args = args;
    this.options = options;
    this.process = null;
    this.uses = 0;
    this.maxUses = options.maxUses || 50;
    this.spawn();
  }

  spawn() {
    if (this.process) {
      this.process.kill();
    }
    this.process = spawn(this.command, this.args, this.options);
    this.uses = 0;


    this.process.on('exit', () => {
      if (this.uses < this.maxUses) {
        this.spawn();
      }
    });
  }

  async run(input) {
    this.uses++;
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const onData = (data) => stdout += data.toString();
      const onErr = (data) => stderr += data.toString();

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', onErr);

      this.process.stdin.write(input + '\n');




      const delimiter = `__KIRTOS_DONE_${Math.random().toString(36).slice(2)}__`;
      this.process.stdin.write(`echo ${delimiter}\n`);
      this.process.stdin.write(`echo ${delimiter} >&2\n`);

      const check = setInterval(() => {
        if (stdout.includes(delimiter) && stderr.includes(delimiter)) {
          clearInterval(check);
          this.process.stdout.removeListener('data', onData);
          this.process.stderr.removeListener('data', onErr);

          resolve({
            stdout: stdout.split(delimiter)[0].trim(),
            stderr: stderr.split(delimiter)[0].trim()
          });
        }
      }, 10);

      if (this.uses >= this.maxUses) {
        this.spawn();
      }
    });
  }
}

class ProcessPool {
  constructor(command, args, options = {}, poolSize = 2) {
    this.pool = Array.from({ length: poolSize }, () => new WarmProcess(command, args, options));
    this.index = 0;
  }

  async run(input) {
    const proc = this.pool[this.index];
    this.index = (this.index + 1) % this.pool.length;
    return proc.run(input);
  }
}

module.exports = ProcessPool;