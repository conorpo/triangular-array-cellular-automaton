/**
 * @typedef {Object} BindgroupContainer
 * @property {GPUBindGroup | Array<GPUBindGroup>} _bindgroup - The bindgroup object, memoized
 * @property {GPUBindGroupLayout} layout - The bindgroup layout object
 * @property {boolean} dirty - Whether the bindgroup needs to be recreated
 * @property {GPUBindGroup | Array<GPUBindGroup>} bindgroup - The bindgroup getter, recreates the bindgroup if dirty
 * @property {function} create_layout - Creates the bindgroup layout
 * @property {function} create_bindgroup - Creates the bindgroup 
 */

/**
 * @typedef {GPUBuffer | GPUTexture} _Resource
 */

/**
 * @typedef {Object} ResourceContainer
 * @property {_Resource | Array<_Resource> | null} webgpu_resource - The webgpu buffer object
 * @property {function} [update] - Updates the webgpu buffer with the local buffer
 * @property {function} create - Creates the webgpu buffer
*/

/**
 * @typedef {Object} StageContainer
 * @property {GPUShaderModule} shader - The shader module
 * @property {GPUPipelineLayout} layout - The pipeline layout
 * @property {GPUComputePipeline | GPURenderPipeline} pipeline - The pipeline
 * @property {function} create_layout - Creates the pipeline layout
 * @property {function} create - Creates the shader module and pipeline
 */

export default {}