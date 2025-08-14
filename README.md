# ss15-static-like-wool-fabric

This is an app created over the weekend for the following competition
http://www.staticshowdown.com/

## Running the app

This project was originally built with the early Polymer 0.5 stack and Grunt tooling. Modern Node versions have dropped support for many of the old build tools, but the application can still be served as a static site.

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

### Steps

1. Install server and Bower dependencies:
   ```sh
   npm install
   ```
2. Fetch the Polymer components using Bower:
   ```sh
   npm run bower
   ```
3. Start a simple development server:
   ```sh
   npm start
   ```
4. Open <http://localhost:8080> in your browser.

The `start` script uses [`http-server`](https://www.npmjs.com/package/http-server) to serve the `app/` directory. No build step is required.

