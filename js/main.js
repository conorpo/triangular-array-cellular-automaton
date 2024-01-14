import { setupUI } from './ui.js';

import { setupSharedResources } from './shared_resources.js';
import { setupIterateStage } from './stages/iterate.js';
import { setupRenderStage } from './stages/render.js';


import Stats from 'stats.js';

async function init() {
  const { adapter, device, presentation_format } = await initWebGPU();

  const canvas = document.getElementById('webgpu_canvas');
  canvas.style.imageRendering = 'pixelated';
  const context = canvas.getContext('webgpu');
  if (!context) throw ReferenceError('WebGPU not supported');
  context.configure({
    device,
    format: presentation_format
  });

  // Setup Resources and Stages
  const shared_resources = await setupSharedResources(device);
  //const mouse_info = await setupMouse();
  
  //const rule_generator_stage = await setupRuleGenerator(device, shared_resources);
  const iterate_stage = await setupIterateStage(device, shared_resources);
  const render_stage = await setupRenderStage(device, shared_resources, presentation_format);
  
  // Initialze UI prior to populating resources
  const gui = await setupUI(shared_resources, iterate_stage);

  /**
   * Check if the canvas has been resized, re-create the depth texture if so.
   * @function resizeIfNeeded
   * @returns {boolean} True if the resizing was needed, false otherwise.
  */
  function resizeIfNeeded() {
    const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
    const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));

    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;

    console.log(`Resized canvas to ${width}x${height}`);
    
    // I don't think we need a depth texture
    //renderingStage.createDepthTexture(); 

    return true;
  }

  const workgroups = parseInt(import.meta.env.VITE_CA_TEXTURE_WIDTH) / 64;

  // Perf 
  const stats = new Stats();
  stats.dom.classList.add('taeca-stats');
  
  const debugTimings = {};
  if(import.meta.env.VITE_TIMESTAMPS === "true") {
    debugTimings.querySet = device.createQuerySet({
      type: 'timestamp',
      count: 3, //Initial, After Iteration, After Render
    });
    
    debugTimings.timestampBuffer = device.createBuffer({
      label: 'Timestamp Buffer',
      size: 3 * 8,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
    });
    
    debugTimings.timestampReadBuffer = device.createBuffer({
      label: 'Timestamp Read Buffer',
      size: 3 * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });  
    
    stats.iteration = stats.addPanel(new Stats.Panel('µs Iteration', '#ff8', '#221'));
    stats.render = stats.addPanel(new Stats.Panel('µs Render', '#f8f', '#212'));

    render_stage.render_pass_descriptor.timestampWrites = {
      querySet: debugTimings.querySet,
      endOfPassWriteIndex: 2
    }
  };
  
  document.body.appendChild(stats.dom);
  
  async function render() {
    stats.begin();

    // Check for window resize, re create depth texture if so
    resizeIfNeeded();

    const encoder = device.createCommandEncoder({label: 'Frame Command Encoder'});

    if(iterate_stage.iterate_settings.current_row < parseInt(import.meta.env.VITE_CA_TEXTURE_HEIGHT)) {
      // Compute
      const compute_pass = encoder.beginComputePass({
        label: 'Iterate Pass',
        timestampWrites: (import.meta.env.VITE_TIMESTAMPS === "true") ? {

          querySet: debugTimings.querySet,
          beginningOfPassWriteIndex: 0,
          endOfPassWriteIndex: 1
        } : undefined
      });

      compute_pass.setPipeline(iterate_stage.iterate_pipeline);
      compute_pass.setBindGroup(0, iterate_stage.iterate_bindgroup);
      
      for(let i = 0; i < parseInt(import.meta.env.VITE_MAX_ITERATIONS_PER_FRAME); i++) {
        compute_pass.setBindGroup(1, iterate_stage.pingpong_bindgroups[i % 2]);
        compute_pass.dispatchWorkgroups(workgroups);
        iterate_stage.iterate_settings.current_row++;
      }

      compute_pass.end();
    }

    // Render
    render_stage.render_pass_descriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const render_pass = encoder.beginRenderPass(render_stage.render_pass_descriptor);

    render_pass.setPipeline(render_stage.render_pipeline);
    render_pass.setBindGroup(0, render_stage.bindgroup);
    render_pass.draw(6);

    render_pass.end();

    if(import.meta.env.VITE_TIMESTAMPS === "true"){
      encoder.resolveQuerySet(debugTimings.querySet, 0, 3, debugTimings.timestampBuffer, 0);
      encoder.copyBufferToBuffer(debugTimings.timestampBuffer, 0, debugTimings.timestampReadBuffer, 0, 3 * 8);
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    if(import.meta.env.VITE_TIMESTAMPS === "true") {
      await debugTimings.timestampReadBuffer.mapAsync(GPUMapMode.READ)
      const timestamps = new BigUint64Array(debugTimings.timestampReadBuffer.getMappedRange());
      debugTimings.timestampReadBuffer.unmap();
      console.log(timestamps[0], timestamps[1], timestamps[2]);
      stats.iteration.update(Number(timestamps[1] - timestamps[0]) / 1000, 1000);
      stats.render.update(Number(timestamps[2] - timestamps[1]) / 1000, 1000);
    }

    stats.end();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

async function initWebGPU() {
  const adapter = await navigator.gpu?.requestAdapter();
  const presentation_format = navigator.gpu?.getPreferredCanvasFormat();
  const device = (import.meta.env.VITE_TIMESTAMPS === "true") ? await adapter?.requestDevice({ // Debugging
    requiredFeatures: ['timestamp-query']
  }) : await adapter?.requestDevice(); // Production
  
  return {
    adapter,
    presentation_format,
    device
  };
}

// Entry point
try {
  init();
} catch (e) {
  console.error(e);
  alert(e);
}

