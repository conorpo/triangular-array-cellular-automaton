/**
 * @module taeca
 * @description This module handles the main loop of the application.
 */

import device_info from "./device.js";
import { rule_info, ruleset, view_info_bindgroup, view_info, ca_textures } from "./shared_resources.js";

import initialize_ruletset from "./stages/initialize_ruleset.js";
import iterate from "./stages/iterate.js";
import _render from "./stages/render.js";
import debug_view from "./stages/debug_view.js";

import { single_1 } from "./states.js";
import Stats from "stats.js";

import { mouse } from "./mouse.js";


/**
 * Check if the canvas has been resized, re-create the depth texture if so.
 * @function resizeIfNeeded
 * @returns {boolean} True if the resizing was needed, false otherwise.
 */
function resizeIfNeeded(canvas_element) {
    const width = Math.max(1, Math.min(device_info.device.limits.maxTextureDimension2D, canvas_element.clientWidth));
    const height = Math.max(1, Math.min(device_info.device.limits.maxTextureDimension2D, canvas_element.clientHeight));

    if (canvas_element.width === width && canvas_element.height === height) return false;
    view_info.local_resource.canvas.width = canvas_element.width = width;
    view_info.local_resource.canvas.height = canvas_element.height = height;

    // Create a new render texture if multi-sampling is enabled
    if(import.meta.env.TCA_SAMPLE_COUNT > 1) _render.render_texture.create(width, height);

    // Calculate the new minimum zoom
    mouse.calcMinZoom(width);

    console.log(`Resized canvas to ${width}x${height}`);

    return true;
}


const ITERATE_WORKGROUPS = parseInt(import.meta.env.TCA_TEXTURE_WIDTH) / 64;
/**
 * @function begin_render_loop
 * @description Begin the render loop.
 * @param {GPUCanvasContext} context
 * @param {Object} stats
 */
export function begin_render_loop(context, stats, gui) {
    const debugTimings = {};
    if(import.meta.env.TCA_TIMESTAMPS === "true") {
        debugTimings.queryCount = 3;

        debugTimings.querySet = device_info.device.createQuerySet({
          type: 'timestamp',
          count: debugTimings.queryCount, //Initial, After Iteration, After Render
        });
        
        debugTimings.resolveBuffer = device_info.device.createBuffer({
          label: 'Timestamp Buffer',
          size: debugTimings.queryCount * BigInt64Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
        });
        
        debugTimings.timestampReadBuffer = device_info.device.createBuffer({
          label: 'Timestamp Read Buffer',
          size: debugTimings.queryCount * BigInt64Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });  
        
        stats.iteration = stats.addPanel(new Stats.Panel('µs Iteration', '#ff8', '#221'));
        stats.render = stats.addPanel(new Stats.Panel('µs Render', '#f8f', '#212'));
    
        _render.stage.render_pass_descriptor.timestampWrites = {
          querySet: debugTimings.querySet,
          endOfPassWriteIndex: 2
        }
    };

    rule_info.update();
    ca_textures.initialize_top_row(single_1(rule_info.local_resource.k, parseInt(import.meta.env.TCA_TEXTURE_WIDTH)));
    set_rule(parseInt(import.meta.env.TCA_INITIAL_RULE_NUMBER));
    _render.color_map.update();

    async function render() {  
        stats.begin();

        //console.log(_render.color_map)
    
        // Check for window resize, re create depth texture if so
        resizeIfNeeded(context.canvas);
    
        const encoder = device_info.device.createCommandEncoder({label: 'Frame Command Encoder'});

        // Update Resources that change every frame
        view_info.update();

        if(iterate.iterate_settings.local_resource.current_row < parseInt(import.meta.env.TCA_TEXTURE_HEIGHT)) {
          // Compute
          const compute_pass = encoder.beginComputePass({
            label: 'Iterate Pass',
            timestampWrites: (import.meta.env.TCA_TIMESTAMPS === "true") ? {
    
              querySet: debugTimings.querySet,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1
            } : undefined
          });
    
          compute_pass.setPipeline(iterate.stage.pipeline);
          compute_pass.setBindGroup(0, iterate.rule_info_bindgroup.bindgroup);
          
          for(let i = 0; i < parseInt(import.meta.env.TCA_MAX_ITERATIONS_PER_FRAME); i++) {
            compute_pass.setBindGroup(1, iterate.pingpong_bindgroups.bindgroup[i % 2]);
            compute_pass.dispatchWorkgroups(ITERATE_WORKGROUPS);
            iterate.iterate_settings.local_resource.current_row++;
          }
    
          compute_pass.end();
        }
    
        // Render
        const attachment_prop = (import.meta.env.TCA_SAMPLE_COUNT > 1) ? "resolveTarget" : "view";
        _render.stage.render_pass_descriptor.colorAttachments[0][attachment_prop] = context.getCurrentTexture().createView();
        const render_pass = encoder.beginRenderPass(_render.stage.render_pass_descriptor);
    
        render_pass.setPipeline(_render.stage.pipeline);
        render_pass.setBindGroup(0, view_info_bindgroup.bindgroup);
        render_pass.setBindGroup(1, _render.texture_bindgroup.bindgroup);
        render_pass.draw(6);

        if(gui.mouseOverRuleInfo) {
          render_pass.setPipeline(debug_view.stage.pipeline);
          render_pass.setBindGroup(0, view_info_bindgroup.bindgroup);
          render_pass.setVertexBuffer(0, debug_view.vertex_buffer.webgpu_resource);
          render_pass.draw(16);
        }

        render_pass.end();
    
        if(import.meta.env.TCA_TIMESTAMPS === "true"){
          encoder.resolveQuerySet(debugTimings.querySet, 0, 3, debugTimings.resolveBuffer, 0);
          encoder.copyBufferToBuffer(debugTimings.resolveBuffer, 0, debugTimings.timestampReadBuffer, 0, 3 * 8);
        }
    
        const commandBuffer = encoder.finish();
        device_info.device.queue.submit([commandBuffer]);
    
        if(import.meta.env.TCA_TIMESTAMPS === "true") {
          await debugTimings.timestampReadBuffer.mapAsync(GPUMapMode.READ)
          const timestamps = new BigUint64Array(debugTimings.timestampReadBuffer.getMappedRange());
          debugTimings.timestampReadBuffer.unmap();
          if(import.meta.env.DEV) console.log(timestamps[0], timestamps[1], timestamps[2]);
          stats.iteration.update(Number(timestamps[1] - timestamps[0]) / 1000, 1000);
          stats.render.update(Number(timestamps[2] - timestamps[1]) / 1000, 1000);
        }
    
        stats.end();
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

/**
 * @function set_rule
 * @description Set the rule number. Expects the rule info buffer and ruleset buffer size to be up to date. 
 * @param {number} rule_number The rule number to set.
 * @todo This is very slow should only be used when ruleset buffer is small, until a new solution is created
 */
export function set_rule(rule_number) {
  for(let i = 0; rule_number > 0; i++) {
    ruleset.local_resource[i] = rule_number % rule_info.local_resource.k;
    rule_number = Math.floor(rule_number / rule_info.local_resource.k);
  }
  if(import.meta.env.DEV) console.log(ruleset.local_resource)

  ruleset.update();
}

/**
 * @function new_rule
 * @description Create a new rule. Expects the rule info buffer and ruleset buffer size to be up to date.
 */
export function new_rule () {
  // Update the random seeds () 
  initialize_ruletset.random_seeds.update();
  
  const encoder = device_info.device.createCommandEncoder({label: 'New Rule Command Encoder'});
  
  const compute_pass = encoder.beginComputePass({label: 'New Rule Compute Pass'});
  
  compute_pass.setPipeline(initialize_ruletset.stage.pipeline);
  compute_pass.setBindGroup(0, initialize_ruletset.rule_info_bindgroup.bindgroup);
  compute_pass.setBindGroup(1, initialize_ruletset.random_seeds_bindgroup.bindgroup);
  
  const workgroups = Math.ceil(rule_info.local_resource.size / (64 * parseInt(import.meta.env.TCA_INIT_KERNEL_SIZE)));
  compute_pass.dispatchWorkgroups(workgroups);
  
  compute_pass.end();
  
  const commandBuffer = encoder.finish();
  device_info.device.queue.submit([commandBuffer]);

  iterate.iterate_settings.local_resource.current_row = 0;
  iterate.iterate_settings.update();
 
}

/**
 * @function attempt_rule_info_update
 * @description Attempt to update the rule info buffer and ruleset buffer size.
 * @return {boolean} True if the update was successful, false otherwise.
 */
export function attempt_rule_info_update () {
  // First see if we can allocate a buffer of the new size
  if (!ruleset.create(rule_info.local_resource.size)) return false;
  
  // If so, update the rule info buffer and generate a new rule
  rule_info.update();
  new_rule();

  return true;

}

export default {
    new_rule,
    attempt_rule_info_update
}