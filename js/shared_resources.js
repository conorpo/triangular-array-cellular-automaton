import { bufferProxyWrapper } from './util.js';

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
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING
    };

    shared_resources.ca_textures = [device.createTexture(ca_texture_descriptor), device.createTexture(ca_texture_descriptor)];

    shared_resources.rule_info_buffer = device.createBuffer({
        label: "Rule Info Buffer",
        size: 8, // 2 * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    /**
     * Need this because dat.gui doesnt check if the value has actually changed before calling the onChange callback.
     * Since I have this I may aswell also use it to automatically update the buffer.
    */
    shared_resources.rule_info = bufferProxyWrapper(device, {
        r: {val: 1, offset: 0, size: 4},
        k: {val: 1, offset: 4, size: 4}
    }, shared_resources.rule_info_buffer, Uint32Array); 

    

    //GUI Settings
    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();
    rule_info_folder.add(shared_resources.rule_info, 'r', 1, 8, 1).name('r (range)');
    rule_info_folder.add(shared_resources.rule_info, 'k', 1, 8, 1).name('k (states)');



    return shared_resources;
}