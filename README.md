# Club RU

Club RU is a Club Penguin inspired MMO, specifically for Rutgers students.

## To Contributors

We will be using the standard pull-request workflow for development. If you're
unfamiliar with this work flow read [Understanding the Github Flow]
(https://guides.github.com/introduction/flow/) (very short read). If you're
unfamiliar with git, please read one of the many
[great online git turorials](https://www.google.com/#q=git+tutorial)
or seek help from someone in the CAVE. You may send pull requests from forked
repositories or work off branches in the main repository. Open an issue if you
need write access to the repo.

If you are in the "Club Rutgers" group in COGS, start by adding your name to
`package.json` in contributors. Just follow this format
`"Barney Rubble <b@rubble.com> (http://barnyrubble.tumblr.com/)"`
You can reference the
[official npm documentation](https://docs.npmjs.com/files/package.json) if you run into any issues.
Second, make sure you understand the basic technologies we will be using for
this project. Knowledge of HTML and CSS or other web development knowledge will
be helpful, but is not required. Knowledge of specific libraries or frameworks
such as NodeJS, SocketIO or PixiJSv4 may be required for certain subgroups but
can easily be learned as you make contributions. Knowledge of basic Javascript
for any programming aspect is necessary to work on this project. Alternatively,
art and music contributions are also encouraged.

If you do not know javascript or would like to refresh your knowledge, I
recommend [Mozilla's Javascript Guide]
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) The
*Introduction* (ignore Web Console stuff), *Grammar and types*, *Control flow
and error handling*, *Loops and iteration*, *Functions* and *Details of the
object model* should easily be enough to get you started writing Javascript.
Javascript is an important language and you will not regret learning it.

## Testing

ClubRU requires NodeJS v7.5.0 or above (or compatible alternative, such as
iojs) with npm to handle libraries. Run the following to download/install
these dependencies.

    $ npm install

ClubRU is run through the `clubru.js` file. By default, it will listen on
port 8080, and the server will be available at `http://localhost:8080/`.

    $ node clubru.js

Unfortunately, it is seemingly impossible to install a secure argon2 library
for node on Windows. Therefore the `argon1` dependency is marked as optional
and ClubRU can be installed without it.

    $ npm install --no-optional

By default, ClubRU will still attempt to run as though the `argon2` library
was installed. To switch to node's built-in SHA256 support, run with the
`-i` flag.

    $ node clubru.js -i

# License and Ownership

Copyright (c) 2017 Club RU team, All Rights Reserved

This project is not affiliated with Rutgers University and was developed
independent of Rutgers University. Rutgers is a registered trademark
of Rutgers, The State University Of New Jersey instrumentality.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
