# πculator
Web app to approximate pi visually with various algorithms.

Accessible at: https://pi.culator.org


## Developing and running locally

To develop locally, make sure Jekyll is installed. The `jekyll-sitemap` plugin should be enabled for the live deployment, but is not necessary for development. Run `jekyll serve` to host locally at `localhost:4000`. Run `jekyll build` if deploying manually (e.g., not with GitHub pages).


## Building the documentation

To build the JSDoc documentation, comment out the first 3 lines of `worker.js`, then run:

```
rm -r docs
jsdoc piculator.js worker.js algos.js compatibility.js -d docs
```
