const path = require('path');

const commonOptions = [
  { name: 'config', type: 'string', description: 'path to the config file' },
  {
    name: 'clear-reporters',
    type: 'bool',
    description: 'clear default reporters in the HTML page',
  },
  { name: 'port', type: 'number', description: 'port to run the server on' },
];

const subCommands = [
  { name: 'help', alias: '-h', action: help, description: 'show help' },
  {
    name: 'version',
    alias: '-v',
    action: version,
    description: 'show versions for this and jasmine-core',
  },
  {
    name: 'serve',
    action: serve,
    options: commonOptions,
    description: 'start a server with your Jasmine specs',
  },
  {
    name: 'runSpecs',
    action: runSpecs,
    description: 'start a server and run your Jasmine specs in a browser',
    options: commonOptions.concat([
      {
        name: 'color',
        type: 'bool',
        description: 'turn on or off color output',
      },
      {
        name: 'filter',
        type: 'string',
        description:
          'filter specs to run only those that match the given string',
      },
      {
        name: 'stop-on-failure',
        type: 'bool',
        description: 'stop spec execution on expectation failure',
      },
      {
        name: 'fail-fast',
        type: 'bool',
        description: 'stop Jasmine execution on spec failure',
      },
      {
        name: 'random',
        type: 'bool',
        description: 'turn on or off randomization',
      },
      {
        name: 'seed',
        type: 'string',
        description: 'specify a seed for randomization',
      },
      {
        name: 'reporter',
        type: 'string',
        description:
          'path to reporter to use instead of the default Jasmine reporter',
      },
      {
        name: 'browser',
        type: 'string',
        description: 'which local browser to launch',
      },
    ]),
  },
];

function Command(config) {
  this.config = config;
  this.logger = config.console || console;
  this.run = function(args) {
    const commandStr = args[0];
    const toRun = subCommands.find(function(command) {
      return command.name === commandStr || command.alias === commandStr;
    });

    if (!toRun) {
      help.call(this);
    } else if (!toRun.options) {
      toRun.action.call(this);
    } else {
      toRun.action.call(this, parseOptions(toRun, args.slice(1)));
    }
  };
}

const extractArg = /^--(no-)?([^=]*)(?:=(.*))?$/;
function parseOptions(command, args) {
  const parsedArgs = { unknown: [] };
  args.forEach(function(arg) {
    const extracted = arg.match(extractArg);

    if (!extracted) {
      parsedArgs.unknown.push(arg);
    } else {
      const opt = command.options.find(o => o.name === extracted[2]);
      if (!opt) {
        parsedArgs.unknown.push(arg);
      } else {
        if (opt.type === 'bool') {
          parsedArgs[opt.name] = !extracted[1];
        } else if (opt.type === 'number') {
          parsedArgs[opt.name] = parseInt(extracted[3], 10);
        } else {
          parsedArgs[opt.name] = extracted[3];
        }
      }
    }
  });

  return parsedArgs;
}

function paddingLength(strings) {
  return Math.max.apply(
    Math,
    strings.map(s => s.length)
  );
}

function commandText(command) {
  return [command.name, command.alias].filter(s => s !== undefined).join(', ');
}

function optionText(option) {
  return option.type === 'bool'
    ? `--[no-]${option.name}`
    : `--${option.name}=<value>`;
}

function wrapDescription(indentLevel, prefixWidth, maxWidth, text) {
  const indentLength = indentLevel * 2; // console.group
  const columnWidth = maxWidth - indentLength - prefixWidth;

  if (text.length < columnWidth) {
    return text;
  }

  var chunks = [];
  while (text.length > columnWidth) {
    const wrapChar = text.lastIndexOf(' ', columnWidth);
    chunks.push(text.substring(0, wrapChar));
    text = text.substring(wrapChar + 1);
  }
  chunks.push(text);

  return chunks.join('\n'.padEnd(prefixWidth + 1, ' '));
}

function help() {
  const width = 80;
  const logger = this.logger;
  logger.log();
  logger.log('Usage: jasmine-browser <command> [options]');
  logger.log();
  logger.group('Commands:');
  const commandPadding = paddingLength(subCommands.map(commandText)) + 2;
  subCommands.forEach(function(command) {
    logger.log(
      commandText(command).padEnd(commandPadding, ' ') +
        wrapDescription(1, commandPadding, width, command.description)
    );
  });
  logger.groupEnd();
  logger.log();
  logger.group('Subcommand options:');

  const detailedCommands = subCommands.filter(c => c.options);
  detailedCommands.forEach(function(command) {
    logger.log();
    logger.group(command.name);
    const optionPadding = paddingLength(command.options.map(optionText)) + 2;
    command.options.forEach(function(option) {
      logger.log(
        optionText(option).padEnd(optionPadding, ' ') +
          wrapDescription(1, optionPadding, width, option.description)
      );
    });
    logger.groupEnd();
  });
  logger.groupEnd();
}

function version() {
  const pkg = require('../package.json');
  this.logger.log();
  this.logger.log(`${pkg.name} v${pkg.version}`);
  this.logger.log('jasmine-core v' + this.config.jasmineCore.version());
}

Command.prototype.loadConfig = function(options) {
  const configFile = options.config || 'spec/support/jasmine-browser.json';
  delete options.config;
  delete options.unknown;
  Object.keys(options).forEach(function(opt) {
    const camelCase = opt.replace(/-./g, function(input) {
      return input[1].toUpperCase();
    });
    if (camelCase !== opt) {
      options[camelCase] = options[opt];
      delete options[opt];
    }
  });
  const fullPath = path.resolve(this.config.baseDir, configFile);
  return Object.assign({}, require(fullPath), options);
};

function serve(options) {
  this.config.jasmineBrowser.startServer(this.loadConfig(options));
}

function runSpecs(options) {
  this.config.jasmineBrowser.runSpecs(this.loadConfig(options));
}

module.exports = Command;
