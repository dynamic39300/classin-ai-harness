type OwnedBrowserServer = { close(): Promise<void>; kill(): Promise<void> };

/** Only accepts the handle returned by this render's BrowserType.launchServer. */
export async function closeRenderBrowser(server: OwnedBrowserServer): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const exited = await Promise.race([
      Promise.resolve().then(() => server.close()).then(() => true, () => false),
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 2000); }),
    ]);
    if (!exited) await server.kill();
  } finally { clearTimeout(timer); }
}
