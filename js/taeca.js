/**
 * @module taeca
 * @description This module handles the main loop of the application.
 */

import device_info from "./device.js";
import { rule_info, ruleset, view_info_bindgroup, view_info, ca_textures, read_mapped_ruleset } from "./shared_resources.js";

import initialize_ruletset from "./stages/initialize_ruleset.js";
import iterate from "./stages/iterate.js";
import _render from "./stages/render.js";
import debug_view, { vertex_buffer } from "./stages/debug_view.js";

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
    change_top_row(single_1(rule_info.local_resource.k, parseInt(import.meta.env.TCA_TEXTURE_WIDTH)));
    set_rule_number(BigInt(parseInt(import.meta.env.TCA_INITIAL_RULE_NUMBER)));
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
 * @function new_rule
 * @description Create a new rule. Expects the rule info buffer and ruleset buffer size to be up to date.
 */
export function new_rule () {
  if(import.meta.env.DEV) console.log("New Rule");
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
 * @function get_rule_number
 * @description Get the rule number by copying from the ruleset buffer. VERY SLOW BECAUSE OF BigInt
 */
export async function get_rule_number () {
  const encoder = device_info.device.createCommandEncoder({label: 'Export Rule Command Encoder'});
  encoder.copyBufferToBuffer(ruleset.webgpu_resource, 0, read_mapped_ruleset.webgpu_resource, 0, ruleset.webgpu_resource.size);
  device_info.device.queue.submit([encoder.finish()]);

  await read_mapped_ruleset.webgpu_resource.mapAsync(GPUMapMode.READ);

  const local_ruleset = new Uint32Array(read_mapped_ruleset.webgpu_resource.getMappedRange().slice(0)).reverse();
  read_mapped_ruleset.webgpu_resource.unmap();

  const base = BigInt(rule_info.local_resource.k);
  // local_ruleset.reduce((acc, cur, i) => acc * base + BigInt(cur), 0n);
  // This shit is so huge it breaks the textarea element
  // Speed up:
  return local_ruleset.reduce((acc, cur, i) => {
    acc.condensed = acc.condensed * rule_info.local_resource.k + cur;
    if(i % 20 === 19 || i === local_ruleset.length - 1) {
      acc.total *= base ** BigInt(i % 20 + 1);
      acc.total += BigInt(acc.condensed);
      acc.condensed = 0;
    }
    if(i % 100000 === 99999) console.log(i, local_ruleset.length);
    return acc;
  }, {total: 0n, condensed: 0}).total;
}


/**
 * @function set_rule
 * @description Set the rule number. Expects the rule info buffer and ruleset buffer size to be up to date. 
 * @param {bigint} rule_number - The Rule Number to Set
 */
export async function set_rule_number(rule_number) {
  const k = BigInt(rule_info.local_resource.k);
  const r = BigInt(rule_info.local_resource.r);

  const MAX_RULE_NUMBER = k ** (k ** (2n * r));

  if(rule_number >= MAX_RULE_NUMBER) throw Error("Invalid Rule Number, over the max possible rule for these values of r and k.");

  const condensedBase = k ** (20n);

  let i = 0;
  while(rule_number >= 0n && i < rule_info.local_resource.size) {
    if(i%100000 === 99999) console.log(i, rule_info.local_resource.size);
    let condensed = Number(rule_number % condensedBase)
    rule_number /= condensedBase;

    for(let j = 0; j < 20 && i + j < rule_info.local_resource.size; j++) {
      ruleset.local_resource[i+j] = condensed % rule_info.local_resource.k;
      condensed -= ruleset.local_resource[i+j];
      condensed /= rule_info.local_resource.k;
    }

    i += 20;
  }

  ruleset.update();

  iterate.iterate_settings.local_resource.current_row = 0;
  iterate.iterate_settings.update();
}


/**
 * @function attempt_rule_info_update
 * @description Attempt to update the rule info buffer and ruleset buffer size.
 * @return {boolean} True if the update was successful, false otherwise.
 */
export function attempt_rule_info_update (k_changed) {
  // First see if we can allocate a buffer of the new size
  if (!ruleset.create(rule_info.local_resource.size)) return false;

  // Create the read_mapped_ruleset buffer
  read_mapped_ruleset.create(rule_info.local_resource.size);
  
  // If so, update the rule info buffer and generate a new rule
  rule_info.update();
  new_rule();
  
  // Also update the debug vertex buffer
  vertex_buffer.update(rule_info.local_resource.r);

  // If k has changed we should also re-generate the top row
  if(k_changed) change_top_row()

  return true;
}

export function change_top_row () {
  ca_textures.update();
  iterate.iterate_settings.local_resource.current_row = 0;
  iterate.iterate_settings.update();
}

export default {
    new_rule,
    attempt_rule_info_update,
    change_top_row,
    get_rule_number,
    set_rule_number
}