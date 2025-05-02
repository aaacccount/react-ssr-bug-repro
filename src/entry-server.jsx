import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

export function render(writeable, handleError, id) {
  const { pipe, _abort } = renderToPipeableStream(
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>React SSR Bug Repro</title>
      </head>
      <body>
        <template id="suspenseId" data-suspense-id={id} />
        <div id="root">
          <App suspenseId={id} />
        </div>
      </body>
    </html>,
    {
      onShellReady() {
        pipe(writeable);
      },
      onShellError: handleError,
      onError: handleError,
      progressiveChunkSize: Infinity,
      bootstrapModules: ['/src/entry-client.jsx'],
    }
  );
}
