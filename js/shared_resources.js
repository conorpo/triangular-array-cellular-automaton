import { random_state, single_1, test_ruleset } from './states.js';

import device_info from './device.js';

/**
 * @module shared_resources
*/

export const [ca_width, ca_height] = [parseInt(import.meta.env.TCA_TEXTURE_WIDTH), parseInt(import.meta.env.TCA_TEXTURE_HEIGHT)];
    
/**
 * Cellular Automaton Texture Descriptor
 * @description A descriptor for the texture that contains the current state of the cellular automata.
 * @type {GPUTextureDescriptor}
 * @todo Make the data type a 4 byte packed int maybe, also try as a buffer (maybe can avoid ping-ponging)
*/
const ca_texture_descriptor = {
    size: [ca_width, ca_height],
    format: 'r32uint',
    dimension: '2d',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
};

export const ca_textures = {
    webgpu_resource: Array(parseInt(import.meta.env.TCA_TEXTURE_COUNT)).fill(),
    create: () => {
        ca_textures.webgpu_resource.forEach((_, i) => { ca_textures.webgpu_resource[i] = device_info.device.createTexture(ca_texture_descriptor); });
    },
    // initialize: (value_generator, texture_index) => {
        
    //     const max_width = Math.max(ca_width, parseInt(import.meta.env.MAX_RANDOM_STATES));
    //     const top_row = new Uint32Array(max_width);
    //     for(let i = 0; i < max_width; i++) {
    //         top_row[i] = value_generator(i);
    //     }
        
        
    //     for(let cur_col = 0; cur_col < ca_width; cur_col += max_width) {
    //         device_info.device.queue.writeTexture({
    //             texture: ca_textures.resource[texture_index],
    //             origin: [cur_col, 0, 0]
    //         }, top_row , {}, {
    //             width: max_width,
    //             height: 1
    //         });
    //     }
    // }
}



const initial_r = parseInt(import.meta.env.TCA_INITIAL_RANGE);
const initial_k = parseInt(import.meta.env.TCA_INITIAL_STATES);

/** 
* @typedef {Object} RuleInfo
* @property {Object} local_resource The local resource that contains the rule info.
* @property {number} local_resource.r The range of the rule, 1 means the cells immediately adjacent above you.
* @property {number} local_resource.k The number of possible states for a cell
* @property {number} size The size of the rule info buffer.
* @property {GPUBuffer} webgpu_resource The GPU buffer that contains the rule info.
* @property {function} create_webgpu_resource Creates the webgpu resource.
* @property {function} update Updates the rule info buffer, and recreates the ruleset buffer.
* @property {function} update_validation Validates the requested size for the rule info buffer.
*/

/**
* @type {RuleInfo} rule_info
*/
export const rule_info = {
    webgpu_resource: null,
    local_resource: { r: initial_r, k: initial_k },
    size: initial_k ** (2 * initial_r) * 4,
    create: function() {
        this.webgpu_resource = device_info.device.createBuffer({
            label: "Rule Info Buffer",
            size: 8, // Same structure, 2 * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    },
    update: function() {
        const new_size = this.local_resource.k ** (2 * this.local_resource.r) * 4; 

        if (!this.update_validation(new_size)) return false;
        ruleset.create(new_size);

        device_info.queue.writeBuffer(this.webgpu_resource, 0, new Uint32Array(Object.values(this.local_resource)));
    },
    update_validation: function(requested_size) {
        return requested_size > device_info.device.limits.maxStorageBufferBindingSize;
    }
}

export const ruleset = {
    webgpu_resource: null,
    local_resource: null,
    create: function(size) {
        this.local_resource = new Uint32Array(size/4);

        this.webgpu_resource?.destroy();

        this.webgpu_resource = device_info.device.createBuffer({
            label: "Ruleset Buffer",
            size: size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
    },
    /**
     * Updates the ruleset buffer with the given value generator.
     * @function update
     * @param {function} value_generator A function that takes a single parameter, the index of the value to generate.
    * @todo Implement hacky solution to cheat the ranndomness, and beat JS O(n)
    */
    update: function(value_generator) {
        for(let i = 0; i < this.local_resource.length; i++) {
            this.local_resource[i] = value_generator(i);
        }

        if(import.meta.env.DEV) console.log(this.local_resource);
        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, this.local_resource);
    }
}

export default {
    ca_textures,
    rule_info,
    ruleset_buffer: ruleset
}