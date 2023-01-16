import download from '@xingrz/download2';
import { join, resolve } from 'path';
import { rm, writeFile } from 'fs/promises';
import { HOME } from './index';
import { spawnSync } from 'child_process';

const _msysDest = join(HOME, 'msys2');
const _msysRootDir = join(_msysDest, 'msys64');

export const inst_version = '2022-03-19';
const installer_name = `msys2-base-x86_64-${inst_version.replace(
  /-/g,
  ''
)}.sfx.exe`;
const inst_url = `https://iflyos-external.oss-cn-shanghai.aliyuncs.com/public/lisa-binary/msys2-installer/${inst_version}/${installer_name}`;
const checksum =
  '0548cc4c1f667ba8ab22760e039d2c8a088b419b432c9597eb8adf8235c13fab';
const msystem_allowed = [
  'MSYS',
  'MINGW32',
  'MINGW64',
  'UCRT64',
  'CLANG32',
  'CLANG64',
];

async function runMsys(cmd: string, args: string[], opts?: any) {
  const quotedArgs = args.map((arg) => {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
  }); // fix confused vim syntax highlighting with: `
  spawnSync(
    'cmd',
    ['/D', '/S', '/C', cmd || ''].concat(['-c', quotedArgs.join(' ')]),
    opts
  );
}

async function pacman(cmd: string, args: string[], opts?: any) {
  await runMsys(cmd, ['pacman', '--noconfirm'].concat(args), opts);
}

async function disableKeyRefresh(msysRootDir: string) {
  const postFile = join(msysRootDir, 'etc\\post-install\\07-pacman-key.post');
  spawnSync(`powershell.exe`, [
    `((Get-Content -path ${postFile} -Raw) -replace '--refresh-keys', '--version') | Set-Content -Path ${postFile}`,
  ]);
}

async function writeWrapper(
  msysRootDir: string,
  pathtype: string,
  destDir: string,
  name: string
) {
  let wrap = [
    `@echo off`,
    `setlocal`,
    `IF NOT DEFINED MSYS2_PATH_TYPE set MSYS2_PATH_TYPE=` + pathtype,
    `set CHERE_INVOKING=1`,
    msysRootDir + `\\usr\\bin\\bash.exe -leo pipefail %*`,
  ].join('\r\n');

  const cmd = join(destDir, name);
  await writeFile(cmd, wrap);

  return cmd;
}

async function debug(message: string) {
  // console.log(message);
}

(async () => {
  if (process.platform !== 'win32') {
    return;
  }

  try {
    await rm(HOME, { recursive: true });
  } catch (e) {
  }

  await download(inst_url, HOME, {});
  const inst_dest = join(HOME, installer_name);
  const extractResult = spawnSync(resolve(inst_dest), [
    '-y',
    `-o${resolve(_msysDest)}`,
  ]);

  if (extractResult.status != 0) {
    throw new Error(
      `Failed to extract MSYS2 installer: ${extractResult.stderr || extractResult.stdout
      }`
    );
  }

  await disableKeyRefresh(_msysRootDir);

  const cmd = await writeWrapper(_msysRootDir, 'inherit', _msysDest, 'msys2.cmd');

  debug("uname -a");
  await runMsys(cmd, ['uname', '-a']);

  debug("sed -i");
  await runMsys(cmd, [
    'sed',
    '-i',
    's/^CheckSpace/#CheckSpace/g',
    '/etc/pacman.conf',
  ]);

  debug("pacman -Syuu");
  await pacman(cmd, ['-Syuu', '--overwrite', '*'], { ignoreReturnCode: true });

  debug("mv pacman.conf");
  await runMsys(cmd, ['mv', '-f', '/etc/pacman.conf.pacnew', '/etc/pacman.conf'], {
    ignoreReturnCode: true,
    silent: true,
  });

  debug("taskkill");
  spawnSync('taskkill', ['/F', '/FI', 'MODULES eq msys-2.0.dll']);

  debug("pacman -Syuu");
  await pacman(cmd, ['-Syuu', '--overwrite', '*'], { ignoreReturnCode: true });

  debug("rm installer");
  await rm(join(HOME, installer_name));
})();
