
/**
 * @typedef {Object} CustomProp
 * @property {any} val The value of the property.
 * @property {number} offset The offset of the property in the buffer.
 * @property {number} size The size of the property in bytes.
*/

/**
 * @callback ValidateCallback
 * @returns {boolean} True if the buffer should be updated, false otherwise.
/**
 * Wraps an object with a proxy that automatically updates its corresponding buffer with changes, works with dat.gui
 * Also accepts a validate callback that is called before the buffer is updated.
 * @function bufferProxyWrapper
 * @param {Object.<string, CustomProp>} obj The object to wrap.
 * @param {ValidateCallback} validate The validate callback.
*/
export function bufferProxyWrapper(device, obj, buf, typedArray = Uint32Array, validate = () => true) {
    return new Proxy(obj, {
        get: function(target, prop) {
            return target[prop].val;
        },
        set: function(target, prop, value) {
            if(target[prop].val === value) return true; // If the value hasnt changed, dont update the buffer
            target[prop].val = value;

            const start_time = performance.now();

            if(!validate()) return true; // If the validate callback returns false, dont update the buffer

            device.queue.writeBuffer(
                buf, 
                target[prop].offset, 
                new typedArray([value])
            );

            if(import.meta.env.DEV) console.log(`Updated buffer in ${performance.now() - start_time}ms`);

            return true;
        }
    });
}