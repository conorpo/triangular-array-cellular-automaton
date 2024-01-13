import { bufferProxyWrapper } from './util.js';

import { random_state, single_1, test_ruleset } from './states.js';

/**
 * @module shared_resources
*/

/**
 * @function setupSharedResources
 * Contains and initializes all resources that are shared between stages.
 * @param {GPUDevice} device The GPU device to create the resources on.
*/
export async function setupSharedResources(device, gui) {
    const shared_resources = {};
    
    /**
     * Cellular Automaton Texture Descriptor
     * @description A descriptor for the texture that contains the current state of the cellular automata.
     * @type {GPUTextureDescriptor}
     * @todo Make the data type a 4 byte packed int maybe, also try as a buffer (maybe can avoid ping-ponging)
    */
    const ca_texture_descriptor = {
        size: [500, 500],
        format: 'r32uint',
        dimension: '2d',
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    };

    shared_resources.ca_textures = [device.createTexture(ca_texture_descriptor), device.createTexture(ca_texture_descriptor)];


    shared_resources.rule_info_buffer = device.createBuffer({
        label: "Rule Info Buffer",
        size: 8, // 2 * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();

    /**
     * Need this because dat.gui doesnt check if the value has actually changed before calling the onChange callback.
     * Since I have this I may aswell also use it to automatically update the buffer.
     * Rule Info is a shared resource incase ruleset generation becomes its own stage.
    */
    shared_resources.rule_info = bufferProxyWrapper(device, {
        r: {val: 1, offset: 0, size: 4},
        k: {val: 2, offset: 4, size: 4},
    }, shared_resources.rule_info_buffer, Uint32Array, () => {
        //This is the validate callback, it is called before the buffer is updated.
        
        const size = shared_resources.rule_info.k ** (2*shared_resources.rule_info.r) * 4; // 4 bytes per rule entry
        //if(import.meta.env.DEV) console.log(`r: ${shared_resources.rule_info.r}, k: ${shared_resources.rule_info.k}, size: ${size}, \nmaxSize: ${device.limits.maxStorageBufferBindingSize}`);
        
        if(size > device.limits.maxStorageBufferBindingSize) {
            rule_info_folder.domElement.style.color = "red";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info (Buffer Size Too Large)";
            return false;
        }
        rule_info_folder.domElement.style.color = "";
        rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info";

        // Update the initial row of the CA texture
        shared_resources.initialize_ca_texture(single_1(shared_resources.rule_info.k, shared_resources.ca_textures[0].width));
        
        // Create the new ruleset buffer
        shared_resources.create_ruleset_buffer(size);
        shared_resources.update_ruleset_buffer(random_state(shared_resources.rule_info.k));

        return true;
    });


    /**
     * Creates the ruleset buffers with the given size.
     * @function create_ruleset_buffer
     * @param {number} size The size of the ruleset buffer.
    */
    (shared_resources.create_ruleset_buffer = (size) => {
        shared_resources.cpu_ruleset_buffer = new Uint32Array(size/4);
        shared_resources.ruleset_buffer?.destroy();

        shared_resources.ruleset_buffer = device.createBuffer({
            label: "Ruleset Buffer",
            size: size,
            usage: GPUBufferUsage.STORAGE_BINDING | GPUBufferUsage.COPY_DST
        });

        // Maybe also update bind groups?
    })(shared_resources.rule_info.k ** (2*shared_resources.rule_info.r) * 4);

    /**
     * Updates the ruleset buffer with the given value generator.
     * Assumes CPU_Ruleset_Buffer has been created and is the correct size.
     * @function update_ruleset_buffer
     * @param {ValueGenerator} value_generator A function that takes the index of the value to generate and returns the value.
    */
    (shared_resources.update_ruleset_buffer = (value_generator) => {
        for(let i = 0; i < shared_resources.cpu_ruleset_buffer.length; i++) {
            shared_resources.cpu_ruleset_buffer[i] = value_generator(i);
        }

        if(import.meta.env.DEV) console.log(shared_resources.cpu_ruleset_buffer);
        device.queue.writeBuffer(shared_resources.ruleset_buffer, 0, shared_resources.cpu_ruleset_buffer);
    })(test_ruleset(shared_resources.rule_info.k));


    /**
     * Sets the top row of the CA texture using the given value generator.
     * @function initialize_ca_texture
     * @param {ValueGenerator} value_generator A function that takes the index of the value to generate and returns the value.
    */
    (shared_resources.initialize_ca_texture = (value_generator) => {
        const top_row = new Uint32Array(shared_resources.ca_textures[0].width);
        for(let i = 0; i < top_row.length; i++) {
            top_row[i] = value_generator(i);
        }

        device.queue.writeTexture({
            texture: shared_resources.ca_textures[0],
        }, top_row, {}, {
            width: shared_resources.ca_textures[0].width,
            height: 1
        });

        console.log("Top Row ",top_row)
    })(single_1(shared_resources.rule_info.k, shared_resources.ca_textures[0].width));

    //GUI Settings
    rule_info_folder.add(shared_resources.rule_info, 'r', 1, 8, 1).name('r (range)');
    rule_info_folder.add(shared_resources.rule_info, 'k', 1, 8, 1).name('k (states)');
    

    return shared_resources;
}