import device_info from './device.js';
import { vertex_buffer } from './stages/debug_view.js';

import { rule_info_bindgroup as init_rule_info_bindgroup } from './stages/initialize_ruleset.js';
import { rule_info_bindgroup as iterate_rule_info_bindgroup, pingpong_bindgroups }from './stages/iterate.js';
import { texture_bindgroup } from './stages/render.js';
/**
 * @module SharedResources
 * @namespace SharedResources
 * @description A namespace for shared resources.
*/



// #region Cellular Automaton Texture Resources
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

/**
 * @typedef {Function} Initialize
 * @param {Function} value_generator A function that takes a single parameter, the index of the value to generate, and returns a state value.
 */

/**
 * @typedef {Object} CATexturesResourceContainer
 * @property {Initialize} initialize_top_row A function that initializes the top row of CA texture [0].
 * @memberof SharedResources
 */
/** 
 *@type {import('./types.js').ResourceContainer & CATexturesResourceContainer} 
 */
export const ca_textures = {
    webgpu_resource: null,
    create: function() {
        this.webgpu_resource?.forEach(texture => texture.destroy());

        this.webgpu_resource = Array(parseInt(import.meta.env.TCA_TEXTURE_COUNT)).fill().map(() => { return device_info.device.createTexture(ca_texture_descriptor); });
        if(import.meta.env.DEV) console.log(`Created ${this.webgpu_resource.length} CA Textures`);
        
        pingpong_bindgroups.dirty = true;
        texture_bindgroup.dirty = true;
    },
    initialize_top_row: function(value_generator) {
        const top_row_buffer = new Uint32Array(ca_width);
        
        for(let i = 0; i < top_row_buffer.length; i++) {
            top_row_buffer[i] = value_generator(i);
        }

        if(import.meta.env.DEV) console.log(top_row_buffer);

        device_info.device.queue.writeTexture({
            texture: this.webgpu_resource[0],
        }, top_row_buffer, {}, {
            width: ca_width,
            height: 1,
        });
    }
}

//#endregion



//#region Rule Info Resource
const initial_r = parseInt(import.meta.env.TCA_INITIAL_RANGE);
const initial_k = parseInt(import.meta.env.TCA_INITIAL_STATES);

/**
 * @typedef {Object} RuleInfo
 * @property {number} k The number of states
 * @property {number} r The radius of the neighborhood
 * @property {number} size The size of the ruleset
 * @memberof SharedResources
*/

/**
 * @typedef {Object} RuleInfoResourceContainer
 * @property {RuleInfo} local_resource The local rule info object
*/

/** 
 *@type {import('./types.js').ResourceContainer & RuleInfoResourceContainer} 
 */
export const rule_info = {
    webgpu_resource: null,
    local_resource: null,
    create: function() {
        this.webgpu_resource?.destroy();

        /** @type {RuleInfo} */
        this.local_resource = {
            r: initial_r,
            k: initial_k,
            get size() {
                return this.k ** (2 * this.r) * 4;
            }
        }

        this.webgpu_resource = device_info.device.createBuffer({
            label: "Rule Info Buffer",
            size: 8, // Same structure, 2 * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        init_rule_info_bindgroup.dirty = true;
        iterate_rule_info_bindgroup.dirty = true;
    },
    update: function() {
        try {
            ruleset.create(this.local_resource.size);
        } catch (e) {
            console.error(e);
            return;
        }

        // Also update the debug vertex buffer
        vertex_buffer.update(this.local_resource.r);

        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, new Uint32Array([this.local_resource.r, this.local_resource.k]));
    }
}
//#endregion



//#region Rule Set Resource
/**
 * @typedef {Object} RuleSetResourceContainer
 * @property {Uint32Array} local_resource The local ruleset buffer
 * @memberof SharedResources
*/

/** 
 * @type {import('./types.js').ResourceContainer & RuleSetResourceContainer} ruleset 
 */
export const ruleset = {
    webgpu_resource: null,
    local_resource: null,
    create: function(size) {
        // Check if the size is valid
        if (size > device_info.device.limits.maxStorageBufferBindingSize) return false;

        this.webgpu_resource?.destroy();
        
        console.time("Local Ruleset Buffer Creation");
        this.local_resource = new Uint32Array(size/4);
        console.timeEnd("Local Ruleset Buffer Creation");

        this.webgpu_resource = device_info.device.createBuffer({
            label: "Ruleset Buffer",
            size: size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        init_rule_info_bindgroup.dirty = true;
        iterate_rule_info_bindgroup.dirty = true;

        return true;
    },
    /**
     * Updates the ruleset buffer with the given value generator.
     * @function update
     * @param {function} value_generator A function that takes a single parameter, the index of the value to generate.
    * @todo Implement hacky solution to cheat the ranndomness, and beat JS O(n)
    */
    update: function() {
        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, this.local_resource);
    }
}
//#endregion



//#region View Info Resource
/**
 * @typedef {Object} Vector
 * @property {number} x The x coordinate of the origin
 * @property {number} y The y coordinate of the origin
 * @memberof SharedResources
*/

/**
 * @typedef {Object} ViewInfo
 * @property {Vector} origin The origin of the view
 * @property {number} zoom The zoom of the view
 * @property {Object} canvas The canvas size
 * @memberof SharedResources
*/

/** 
 * @typedef {Object} ViewInfoResourceContainer
 * @property {ViewInfo} local_resource The local view info object
 * @memberof SharedResources
 */

/** 
 * @type {import('./types.js').ResourceContainer & ViewInfoResourceContainer} 
 */
export const view_info = {
    webgpu_resource: null,
    local_resource: null,
    update: function() {

        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, new Float32Array([
            this.local_resource.origin.x,
            this.local_resource.origin.y,
            this.local_resource.canvas.width,
            this.local_resource.canvas.height,
            this.local_resource.zoom
        ]));        
    },
    create: function(canvas) {
        this.local_resource = {
            origin: {
                x: parseInt(import.meta.env.TCA_TEXTURE_WIDTH) / 2 - (canvas.width / 2) / parseInt(import.meta.env.TCA_INIT_ZOOM),
                y: 0,
            },
            canvas: {
                width: canvas.width,
                height: canvas.height,
            },
            zoom: parseInt(import.meta.env.TCA_INIT_ZOOM),
        };

        this.webgpu_resource = device_info.device.createBuffer({
            label: "View Info Buffer",
            size: 24,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.update();

        view_info_bindgroup.dirty = true;
    }
}
//#endregion



//#region View Info Bindgroup
/** 
 * @type {import('./types.js').BindgroupContainer} 
 */
export const view_info_bindgroup = {
    _bindgroup: null,
    layout: null,
    dirty: true,
    get bindgroup() {
        if(this.dirty) this.create_bindgroup();
        return this._bindgroup;
    },
    create_layout: function() {
        this.layout = device_info.device.createBindGroupLayout({
            label: "View Info Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform'
                }
            }]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = device_info.device.createBindGroup({
            label: "View Info Bind Group",
            layout: this.layout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: view_info.webgpu_resource
                }
            }]
        });
        this.dirty = false;
    },
}
//#endregion