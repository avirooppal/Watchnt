import { JSDOM } from 'jsdom';
import { readVideoMetadata } from '../src/content/youtube.js';

const html = `
<!DOCTYPE html>
<html>
  <body>
    <h1 class="ytd-watch-metadata"><yt-formatted-string>Building a fully agentic IDE</yt-formatted-string></h1>
    <ytd-channel-name><yt-formatted-string><a href="/@antigravity">Antigravity</a></yt-formatted-string></ytd-channel-name>
  </body>
</html>
`;

const dom = new JSDOM(html, { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
global.window = dom.window;
global.document = dom.window.document;
global.URLSearchParams = dom.window.URLSearchParams;

const result = readVideoMetadata();
console.log('Parsed YouTube Metadata:');
console.log(result);
