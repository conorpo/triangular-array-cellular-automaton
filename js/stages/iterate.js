import { iterate_shader_src } from './iterate.wgsl.js';

import { global_emitter } from '../events.js';

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

    iterate_stage.iterate_settings = {
        current_row: 0,
    }

    const iterate_settings_buffer_descriptor = device.createBuffer({
        label: "Iterate Settings Buffer",
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    iterate_stage.iterate_settings_buffers = Array(parseInt(import.meta.env.VITE_CA_TEXTURE_COUNT)).fill().map(() => { return device.createBuffer(iterate_settings_buffer_descriptor); });

    iterate_stage.update_iterate_settings_buffer = function() {
        device.queue.writeBuffer(
            iterate_stage.iterate_settings_buffers[0],
            0,
            new Uint32Array([iterate_stage.iterate_settings.current_row])
        );
    }
    
    iterate_stage.reset = function() {
        iterate_stage.iterate_settings.current_row = 0;
        iterate_stage.update_iterate_settings_buffer();
    }

    iterate_stage.rule_bindgroup_layout = device.createBindGroupLayout({
        label: "Rule Bindgroup Layout",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'uniform'
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
        ]
    });

    // This is kind of hacky but I would have to refactor everything from the ground up to fix it
    iterate_stage.iterate_bindgroup = null;

    function create_iterate_bindgroup() {
        iterate_stage.iterate_bindgroup = device.createBindGroup({
            layout: iterate_stage.rule_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: shared_resources.rule_info_buffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: shared_resources.ruleset_buffer
                    }
                }
            ]
        });
    };
    create_iterate_bindgroup();
    global_emitter.on('ruleset_buffer_created', create_iterate_bindgroup);


    iterate_stage.pingpong_bindgroup_layout = device.createBindGroupLayout({
        label: "Pingpong Bindgroup Layout",
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
                buffer: {
                    type: 'read-only-storage'
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    access: 'write-only',
                    format: 'r32uint',
                    viewDimension: '2d'
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            }
        ]
    });

    const n = parseInt(import.meta.env.VITE_CA_TEXTURE_COUNT);
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
                    resource: {
                        buffer: iterate_stage.iterate_settings_buffers[i]
                    }
                },
                {
                    binding: 2,
                    resource: shared_resources.ca_textures[(i + 1) % n].createView()
                },
                {
                    binding: 3,
                    resource: {
                        buffer: iterate_stage.iterate_settings_buffers[(i + 1) % n]
                    }
                }
            ]
        }));
    }

    const iterate_pipeline_layout = device.createPipelineLayout({
        label: "Iterate Pipeline Layout",
        bindGroupLayouts: [
            iterate_stage.rule_bindgroup_layout,
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