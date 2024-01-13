
/**
 * @typedef {Object} CustomProp
 * @property {any} val The value of the property.
 * @property {number} offset The offset of the property in the buffer.
 * @property {number} size The size of the property in bytes.
*/

/**
 * Wraps an object with a proxy that automatically updates its corresponding buffer with changes, works with dat.gui
 * @function bufferProxyWrapper
 * @param {Object.<string, CustomProp>} obj The object to wrap.
*/
export function bufferProxyWrapper(device, obj, buf, typedArray = Uint32Array) {
    return new Proxy(obj, {
        get: function(target, prop) {
            return target[prop].val;
        },
        set: function(target, prop, value) {
            if(target[prop].val === value) return true; // If the value hasnt changed, dont update the buffer
            target[prop].val = value;
    
            device.queue.writeBuffer(
                buf, 
                target[prop].offset, 
                new typedArray([value])
            );

            return true;
        }
    });
}