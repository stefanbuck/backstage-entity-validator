const core = require('@actions/core');

const usage = `
Usage: validate-entity [OPTION] [FILE]

Validates Backstage entity definition files.  Files may be specified as
arguments or via STDIN, one per line.

OPTION:
-h  display help
-q  minimal output while validating entities
-i  validate files provided over standard input
`.trim();

async function validate(files, { github, verbose }) {
  const {validate} = require('./validator');

  for (const file of files) {
    try {
      if (github) {
        core.setOutput('time', new Date().toTimeString());
      }
      await validate(file, verbose);
    } catch (err) {
      if (github) {
        core.setFailed(`Action failed with error: ${err.message}`);
      } else {
        console.error(`Failed to validate ${file}: ${err.message}`);
      }
      return 1;
    }
  }
  return 0;
}

async function main() {
  const argv = require('minimist')(process.argv.slice(2), {
    boolean: ['h', 'i', 'q'],
    default: {
      // help
      h: false,
      // read file(s) to validate from STDIN
      i: false,
      // quiet output
      q: false,
    }
  });

  if (argv.h) {
    console.log(usage);
    return 0;
  }

  const options = {
    verbose: !argv.q,
    github: false,
  };

  // files to validate
  let files = [];

  // this will be empty in non-github environments
  const ghPath = core.getInput('path');
  if (ghPath) {
    files.push(ghPath);
    options.github = true;
  }

  // add files specified as arguments
  files = files.concat(argv._);

  if (argv.i) {
    // add files specified over STDIN
    files = files.concat(require('fs')
      .readFileSync(0)
      .toString()
      .split('\n')
      .filter(l => l.length > 0));
  }

  if (files.length === 0) {
    console.error('No files specified to validate');
    return 1;
  }

  return await validate(files, options);
}

main().then(process.exit);
