import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Transform as TransformStream } from 'node:stream';

const app = express();
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
app.use(vite.middlewares);

const FAKE_END = '</body></html>';
class ViteTransformStream extends TransformStream {
  _receivedFirstChunk = false;

  constructor(response, url) {
    super({ decodeStrings: false });
    this.response = response;
    this.url = url;
  }

  _makeAllScriptsAsync(content) {
    return content.replaceAll(
      '<script type="module"',
      '<script type="module" async'
    );
  }

  _transform(chunk, _encoding, callback) {
    if (this._receivedFirstChunk) {
      callback(null, this._makeAllScriptsAsync(chunk.toString('utf-8')));
    } else {
      this._receivedFirstChunk = true;
      this.response.statusCode = 200;
      this.response.setHeader('content-type', 'text/html');
      vite
        .transformIndexHtml(this.url, chunk.toString('utf-8') + FAKE_END)
        .then((transformedChunk) => {
          callback(
            null,
            this._makeAllScriptsAsync(transformedChunk).slice(
              0,
              FAKE_END.length * -1
            )
          );
        });
    }
  }
}

let suspenseIdCounter = 0;
app.use(async (request, response, next) => {
  function handleError(err) {
    console.log('err', err);
    response.setHeader('content-type', 'text/html');
    response.send('<h1>Something went wrong</h1>');
    vite.ssrFixStacktrace(err);
    next(err);
  }
  try {
    const { render } = await vite.ssrLoadModule('/src/entry-server.jsx');
    const transformStream = new ViteTransformStream(
      response,
      request.originalUrl
    );
    transformStream.pipe(response);
    render(transformStream, handleError, suspenseIdCounter++, response);
  } catch (err) {
    handleError(err);
  }
});

app.listen(8080);
console.log('Server ready: http://localhost:8080/');
