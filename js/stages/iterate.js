import { iterate_shader_src } from './iterate.wgsl.js';

/**
 * @module iterate
*/

/**
 * @function setupIterateStage
 * Contains and initializes the iterate stage, compute Shader that iterates the cellular automaton, generating the next row of cells.
 * @param {GPUDevice} device The GPU device to create the resources on.
*/
export async function setupIterateStage(device, shared_resources) {
    const iterate_stage = {};

    iterate_stage.shader = device.createShaderModule({
        label: "Iterate Shader Module",
        code: iterate_shader_src
    });

    iterate_stage.iterate_settings_buffer = device.createBuffer({
        label: "Iterate Settings Buffer",
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    // Temp?
    iterate_stage.reset = () => {
        device.queue.writeBuffer(iterate_stage.iterate_settings_buffer, 0, new Uint32Array([0]));
    }

    iterate_stage.iterate_bindgroup_layout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'uniform'
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
        ]
    });

    // This is kind of hacky but I would have to refactor everything from the ground up to fix it
    let memo_loc = false;
    iterate_stage.iterate_bindgroup = null;

    iterate_stage.get_iterate_bindgroup = () => {
        if(shared_resources.ruleset_buffer === memo_loc) return iterate_stage.iterate_bindgroup;
        memo_loc = shared_resources.ruleset_buffer;
        return iterate_stage.iterate_bindgroup = device.createBindGroup({
            layout: iterate_stage.iterate_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: iterate_stage.iterate_settings_buffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: shared_resources.rule_info_buffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: shared_resources.ruleset_buffer
                    }
                }
            ]
        });
    }


    iterate_stage.pingpong_bindgroup_layout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                texture: {
                    sampleType: "uint",
                    viewDimension: "2d"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    access: 'write-only',
                    format: 'r32uint',
                    viewDimension: '2d'
                }
            },
        ]
    });

    const n = shared_resources.ca_textures.length; // Number of ping-pong textures
    iterate_stage.pingpong_bindgroups = [];

    for(let i = 0; i < n; i++) {
        iterate_stage.pingpong_bindgroups.push(device.createBindGroup({
            layout: iterate_stage.pingpong_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: shared_resources.ca_textures[i].createView()
                },
                {
                    binding: 1,
                    resource: shared_resources.ca_textures[(i + 1) % n].createView()
                }
            ]
        }));
    }

    const iterate_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [
            iterate_stage.iterate_bindgroup_layout,
            iterate_stage.pingpong_bindgroup_layout
        ]
    });

    iterate_stage.iterate_pipeline = device.createComputePipeline({
        layout: iterate_pipeline_layout,
        compute: {
            module: iterate_stage.shader,
            entryPoint: "main"
        }
    });

    return iterate_stage;
}