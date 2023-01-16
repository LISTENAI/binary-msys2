import { join } from 'path';
import { Binary } from '@binary/type';

export const HOME = join(__dirname, '..', 'binary');
export const INSTALLER_VERSION = "2022-03-19"

export default <Binary>{
  homeDir: HOME,

  binaryDir: HOME,

  async version() {
    return INSTALLER_VERSION;
  }
};
