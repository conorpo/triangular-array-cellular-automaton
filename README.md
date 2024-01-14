# T. A. E. C. A.
### Triangular Array Elementary Cellular Automaton

Demo Link: https://conorpo.github.io/triangular-array-cellular-automaton

## TODO
```
- [❌] Add a way to change initialization
- [❌] Get rid of the atomic operations
- [❌] Display the rule number
- [❌] Add a way to change the rule number
- [❌] Add View Controls
- [❌] Add a way to change the color scheme
- [❌] Fix filtering / multisampling
```

### Retrospect
Once again the codebase didn't turn out perfect, but it's a lot better than the [last one](https://github.com/conorpo/marching-cubes-webgpu). WebGPU resources are tough to modularize cleanly, I seperated by shader which made it hard to automatically update the bindings. The UI module still takes all the shaders as input parameters which I don't think is the best way to do it. Next time I need some abstract way of establishing resource dependencies. And operations that involve updating multiple resources should be abstracted to some other module rather than on one of the resources.


<!-- ✔️ -->