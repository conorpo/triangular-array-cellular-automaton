/**
 * @module rule
 * @description Contains functions for generating state values, both for rulesets and initial states.
*/

/**
 * Generates a state value, optionally based on the current index in the buffer. 
 * @typedef {function} ValueGenerator
 * @param {number} [index] The current index in the buffer.
 * @returns {number} The generated state.
*/

/**
 * Creates a debug rule set generator
 * @function test_ruleset
 * @param {number} k The number of states.
 * @returns {ValueGenerator} The state generator.
 */
export function test_ruleset(k) {
    const rule = 7;
    const rule_set = rule.toString(k).padStart(4,'0').split('').map((x) => parseInt(x)).reverse();

    return (index) => {
        return rule_set[index % rule_set.length];
    }
}

/**
 * Generates a random rule set.
 * @function random_state
 * @param {number} k The number of states.
 * @returns {ValueGenerator} The state generator.
 */
export function random_state(k) {
    return () => {
        return Math.floor(Math.random() * k);
    }
}

/** 
 * Generates an initial state that is all 0s, with a single max value at the center (k-1)
 * @function single_1
 * @param {number} k The number of states.
 * @returns {ValueGenerator} The state generator.
*/
export function single_1(k, size) {
    return (index) => {
        if(index === Math.floor(size/2)) return k-1;
        return 0;
    }
}