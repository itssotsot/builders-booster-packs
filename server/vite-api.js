import { localDatabase } from './local-database.js';
import { handleApi } from './worker.js';
export function gameApi() {
  const setup = (server) => {
    const DB = localDatabase();
    server.httpServer?.once('close', () => DB.close());
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next();
      try {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method, headers: req.headers,
          ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }),
        });
        const response = await handleApi(request, { DB });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) { console.error(error); res.writeHead(503); res.end('{"error":"Saved collections are unavailable."}'); }
    });
  };
  return { name: 'booster-api', configureServer: setup, configurePreviewServer: setup };
}
