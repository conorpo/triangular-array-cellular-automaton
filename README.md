# T. A. E. C. A.
### Triangular Array Elementary Cellular Automaton

Demo Link: https://conorpo.github.io/triangular-array-cellular-automaton

## TODO
```
- [❌] Add a way to change initialization
- [✔️] Get rid of the atomic operations
- [❌] Display the rule number
- [❌] Add a way to change the rule number
- [✔️] Add View Controls
- [❌] Add a way to change the color scheme
- [❌] Fix filtering / multisampling
```
<!-- ✔️ -->


## WebGPU Retrospect
Once again the codebase didn't turn out perfect, but it's a lot better than the [last one](https://github.com/conorpo/marching-cubes-webgpu). WebGPU resources are tough to modularize cleanly; I separated them by shader which made it hard to automatically update the bindings. 

I decided on the following abstraction model; but for my next project, I would do things a bit differently (see Pros/Cons below).

- **Resource Container**
  - `webgpu_resource` - The webgpu resource object
  - `local_resource` - The local resource object
  - `update()` - Updates the webgpu resource with the local resource
  - `create()` - Creates the webgpu resource
- **Bindgroup Container**
  - `_bindgroup` - The bindgroup object, memoized
  - `layout` - The bindgroup layout object
  - `dirty` - Whether the bindgroup needs to be recreated
  - `bindgroup` - The bindgroup getter, recreates the bindgroup if dirty
  - `create_layout()` - Creates the bindgroup layout
  - `create_bindgroup()` - Creates the bindgroup
- **Pipeline Container**
  - `shader` - The shader module
  - `layout` - The pipeline layout
  - `pipeline` - The pipeline
  - `create_layout()` - Creates the pipeline layout
  - `create()` - Creates the shader module and pipeline

### Pros / Cons

First of all, it's not exactly strictly typed, webgpu_resource can be a Buffer, Texture, or an Array of either of those. In addition, webgpu_resource starts as null. I decided it would be my responsibility to make sure resources are created before they are used, this allowed me to define project structure in modules before the device is created.

But at the end of the day, it abstracted the parts I needed and provided some useful functionality. For example, GPU resources could be updated with a simple `.update()` call and local resources could be directly modified by other modules. 

In terms of the bindgroups, instead of automatically recreating them whenever a resource was re-created (slow if many resources are re-created during the frame), it memoizes the bindgroup, only recreating it if it's been marked dirty by a ResourceContainer `.create()` call. The bindgroup also creates its own layout. Storing the layouts on the bindgroups means resources can be used in multiple ways (e.g. GPUBuffer with the usage flag STORAGE can be bound as "storage" or "read-only-storage" depending on the bindgroup it's used in). `.create_layout()` is expected to have already been called before `.create_bindgroup()` or `.bindgroup` is called. Once again I chose this approach to lower validation costs, and encourage proper project initialization.

Finally, the pipeline container is the simplest as the layout is never gonna need to be recreated (for my projects), and the shader module and pipeline are created together, which allows for hot reloading of the shader module.

I think next time I would be a bit stricter about type-checking the webgpu_resource, having separate types for each type of resource that extend some **ResourceContainer** base class. Instead of allowing resource containers to have arrays, I would instead choose to have arrays of resource containers. Descriptors could be moved outside of the resource container for reuse in create functions. Update functions could also be moved outside and reused by including the ResourceContainer as a parameter. These array changes could be applied to **BindgroupContainer**s as well, it's not 100% clean, but arrays of bindgroups seem like a rare use case. I plan to explore further limitations of this abstraction model in future projects.

## Bindgroups Overview
| | Group 0 | Group 1 | Group 2 | Group 3 |
|-|---------|---------|---------|---------|
| Init Stage | RuleInfo + Ruleset | Random Seeds | | |
| Iterate Stage | RuleInfo + Ruleset | Input CA Texture + Output CA Texture, Input IterateSettings + Output IterateSettings (Ping Pong) | | | |
| Render Stage | View Info | CA Texture | | |
| Debug View Stage | View Info | RuleInfo | | |


Iterate Stage computes one iteration of the CA, it is run once for every row in the CA Texture.

Render Stage renders the CA Texture to the screen, offsetting odd rows by half a cell.