# Club Knight

[![Travis](https://img.shields.io/travis/three/ClubKnight/master.svg?style=flat-square)](https://travis-ci.org/three/ClubKnight)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?style=flat-square)](https://raw.githubusercontent.com/three/ClubKnight/master/LICENSE)

Club Knight is a Club Penguin inspired MMO, made for Rutgers students.

To be live on [clubknight.world](https://www.clubknight.world/).

*Please read the entire README (it took time to make this!) before contributing
or asking questions.*

## To Contributors

We will be using the standard pull-request workflow for development. If you're
unfamiliar with this work flow read [Understanding the Github
Flow](https://guides.github.com/introduction/flow/). If you're unfamiliar with
git, please read one of the many [great online git
turorials](https://www.google.com/#q=git+tutorial) or seek help from someone in
the CAVE.

If you are in the "Club Rutgers" group in COGS, start by adding your name to
`package.json` in contributors. Just follow this format
`"Barney Rubble <b@rubble.com> (http://barnyrubble.tumblr.com/)"`
You can reference the
[official npm documentation](https://docs.npmjs.com/files/package.json) if
you run into any issues.

## Testing

ClubRU requires NodeJS v7.8.0 or above (or compatible alternative, such as
iojs) with npm to handle libraries. The latest NodeJS is available at
[nodejs.org](https://nodejs.org/en/) (choose the newer version).

### Linux/OSX

    $ npm install
    $ node clubru.js

### Windows

    $ npm install --no-optional
    $ node clubru.js -i

Because certain crypto libraries require node-gyp, which is has infamously
[terrible Windows support](https://github.com/nodejs/node-gyp/issues/629)
these packages are marked as optional, and slightly different commands
need to be run.

## Asset Storage

Assets and binary files should not be stored on this git repository. Instead,
they will be stored (without version control) on S3 storage. The endpoint for
this bucket is https://cdn-clubknight-world.s3.amazonaws.com/. Since
[CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) has been
fully enabled (`Access-Control-Allow-Origin: *`) you should be able to make
requests (ajax, etc.) to this server, even from your local dev environment.
When accessing assets from S3 always specify https (ex:
`https://cdn-clubknight-world.s3.amazonaws.com/clubru.png`, NOT
`http://cdn-clubknight-world.s3.amazonaws.com/`). Open an issue or contact
@three if you need to upload assets.

# License and Ownership

Copyright 2017 ClubKnight Team

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This project is not affiliated with Rutgers University and was developed
independent of Rutgers University. Rutgers is a registered trademark
of Rutgers, The State University Of New Jersey instrumentality.
