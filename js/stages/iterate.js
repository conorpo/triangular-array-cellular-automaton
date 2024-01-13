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

    iterate_stage.pingpong_bindgroup_layout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    access: 'write-only',
                    format: 'r32uint',
                    viewDimension: '2d'
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
}