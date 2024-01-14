import { random_state, single_1, test_ruleset } from './states.js';

import { global_emitter } from './events.js';

/**
 * @module shared_resources
*/

/**
 * @function setupSharedResources
 * Contains and initializes all resources that are shared between stages.
 * @param {GPUDevice} device The GPU device to create the resources on.
*/
export async function setupSharedResources(device) {
    const shared_resources = {};
    
    /**
     * Cellular Automaton Texture Descriptor
     * @description A descriptor for the texture that contains the current state of the cellular automata.
     * @type {GPUTextureDescriptor}
     * @todo Make the data type a 4 byte packed int maybe, also try as a buffer (maybe can avoid ping-ponging)
    */
    const [ca_width, ca_height] = [parseInt(import.meta.env.VITE_CA_TEXTURE_WIDTH), parseInt(import.meta.env.VITE_CA_TEXTURE_HEIGHT)];

    const ca_texture_descriptor = {
        size: [ca_width, ca_height],
        format: 'r32uint',
        dimension: '2d',
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    };

    shared_resources.ca_textures = Array(parseInt(import.meta.env.VITE_CA_TEXTURE_COUNT)).fill(0).map(() => device.createTexture(ca_texture_descriptor));

    console.log(shared_resources.ca_textures)


    shared_resources.rule_info_buffer = device.createBuffer({
        label: "Rule Info Buffer",
        size: 8, // 2 * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    shared_resources.rule_info = {
        r: 1,
        k: 2
    }

    /**
     * Creates the ruleset buffers with the given size.
     * @function create_ruleset_buffer
     * @param {number} size The size of the ruleset buffer.
    */
    shared_resources.create_ruleset_buffer = (size) => {
        shared_resources.cpu_ruleset_buffer = new Uint32Array(size/4);
        shared_resources.ruleset_buffer?.destroy();

        shared_resources.ruleset_buffer = device.createBuffer({
            label: "Ruleset Buffer",
            size: size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Maybe also update bind groups?
    };

    /**
     * Updates the ruleset buffer with the given value generator.
     * Assumes CPU_Ruleset_Buffer has been created and is the correct size.
     * @function update_ruleset_buffer
     * @param {ValueGenerator} value_generator A function that takes the index of the value to generate and returns the value.
    */
    shared_resources.update_ruleset_buffer = (value_generator) => {
        for(let i = 0; i < shared_resources.cpu_ruleset_buffer.length; i++) {
            shared_resources.cpu_ruleset_buffer[i] = value_generator(i);
        }

        if(import.meta.env.DEV) console.log(shared_resources.cpu_ruleset_buffer);
        device.queue.writeBuffer(shared_resources.ruleset_buffer, 0, shared_resources.cpu_ruleset_buffer);
    }


    /**
     * Sets the top row of the CA texture using the given value generator.
     * @function initialize_ca_texture
     * @param {ValueGenerator} value_generator A function that takes the index of the value to generate and returns the value.
    */
    shared_resources.initialize_ca_texture = (value_generator) => {
        const top_row = new Uint32Array(ca_width);
        for(let i = 0; i < top_row.length; i++) {
            top_row[i] = value_generator(i);
        }

        device.queue.writeTexture({
            texture: shared_resources.ca_textures[0],
        }, top_row, {}, {
            width: ca_width,
            height: 1
        });
    };

    /**
     * @function update_rule_info_buffer
     * @returns {boolean} True if the buffer was updated, false otherwise (buffer size too large).
    */
    (shared_resources.update_rule_info_buffer = () => {
        const size = shared_resources.rule_info.k ** (2*shared_resources.rule_info.r) * 4; // 4 bytes per rule entry
        if(size > device.limits.maxStorageBufferBindingSize) {
            // rule_info_folder.domElement.style.color = "red";
            // rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info (Buffer Size Too Large)";
            return false;
        }
        // rule_info_folder.domElement.style.color = "";
        // rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info";

        // Update the initial row of the CA texture, this is a command on the queue, so changes aren't immediate.
        shared_resources.initialize_ca_texture(single_1(shared_resources.rule_info.k, ca_width));

        // Create the new ruleset buffer
        shared_resources.create_ruleset_buffer(size);
        global_emitter.emit('ruleset_buffer_created');
        shared_resources.update_ruleset_buffer(random_state(shared_resources.rule_info.k)); // Same thing for this one

        // Finally Update the rule info buffer
        device.queue.writeBuffer(shared_resources.rule_info_buffer, 0, new Uint32Array(Object.values(shared_resources.rule_info)));

        return true;
    })(); //This is called immediately, creating and initializing all the buffers.    

    

    return shared_resources;
}