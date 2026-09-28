// Node 24 on some Windows installations can make os.userInfo() fail with
// uv_os_get_passwd/ENOMEM. tsx only needs a stable value for its temp folder.
// Linux already exposes geteuid(), so production keeps the native behavior.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', {
    configurable: true,
    value: () => process.env.USERNAME || 'peddi',
  });
}
