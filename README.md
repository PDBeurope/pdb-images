# pdbe-images
Generates images from mmCIF/BCIF files


## Testing

```sh
npm run jest
```

Note: Current version of ts-jest (29.1.0) doesn't work perfectly with TypeScript 5.0 (wrong source map, i.e. the Jest error message will point to a different place in code than where the error really comes from).



## Errors

```
        var ext = gl.getExtension('ANGLE_instanced_arrays');
TypeError: Cannot read properties of null (reading 'getExtension')
```

This will be thrown when graphics not available on the machine. GitHub testing workflow solves the issue like this: `sudo apt-get install xvfb && xvfb-run --auto-servernum npm run jest`

TODO add useful log for this error
