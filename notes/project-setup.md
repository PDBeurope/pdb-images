```sh
npm init
npm install --save-dev typescript jest eslint
npx tsc --init
# Setup tsconfig.json file, use "module": "CommonJS"
# Setup scripts "build, "watch", "lint", "jest", "test" in package.json
npm run build  # Build
node build/index.js  # Run
npm init @eslint/config
# Copy .eslintrc.json from the MolStar project
# Setup jest in jest.config.json
# Setup GitHub automatic testing in .github/workflows/node.yml
```

