const Listr = require('listr');
import { findSubmodules } from '../utils';
import { npmLink } from '../tasks';

// todo: 'npm-link` doesn't track adding new files,
// so watch mode should be added

export function npmLinkCommand({project, local, deep, verbose, yarn, here}) {
  const noDeepLinking = deep === false;
  // 1. clean dist folders
  // 2.1 merge pkg json
  // 2.2 validate pkg (main, module, types)
  // 2.3 write pkg
  // 3. compile ts
  return findSubmodules(project, {local})
    .then((opts: TsmOptions[]) => new Listr([
      {
        title: 'Link all submodules',
        task: () => {
          const linkingTasks = new Listr(
            opts.map(opt => ({
              title: `npm link ${opt.pkg.name} (from: ${opt.dist})`,
              task: () => npmLink({yarn, cwd: opt.dist})
            }))
          );

          if (noDeepLinking) {
            return linkingTasks;
          }

          opts.filter(opt => opt.cross.length > 0)
            .forEach(opt => opt.cross
              .forEach(crossName => linkingTasks.add(
                {
                  title: `npm link ${crossName} to ${opt.pkg.name} (${opt.src})`,
                  task: () => npmLink({yarn, cwd: opt.dist, module: crossName})
                }
              )));
          return linkingTasks;
        }
      },
      {
        title: 'Link submodules to local project',
        task: () => new Listr(
          opts.map(opt => ({
            title: `npm link ${opt.pkg.name}`,
            task: () => npmLink({yarn, module: opt.pkg.name, cwd: '.'})
          }))
        ),
        skip: () => here !== true

      }
    ], {renderer: verbose ? 'verbose' : 'default'}));
}

export function run(cli) {
  const {project, verbose, local, deep, yarn, here} = cli.flags;
  return npmLinkCommand({project, verbose, local, deep, yarn, here})
    .then(tasks => tasks.run());
}
