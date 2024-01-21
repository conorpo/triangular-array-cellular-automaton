/**
 * @module mouse
 * @description This module handles the mouse input.
 */

import { view_info } from "./shared_resources.js";

const CA_TEXTURE_WIDTH = parseInt(import.meta.env.TCA_TEXTURE_WIDTH);

export const mouse = {
    pos: {
        x: 0,
        y: 0
    },
    dragging: false,
    MAX_ZOOM: parseFloat(import.meta.env.TCA_MAX_ZOOM),
    MIN_ZOOM: null,
    calcMinZoom: function(new_canvas_width) {
        this.MIN_ZOOM = new_canvas_width / CA_TEXTURE_WIDTH / 2;
        this.MIN_ZOOM = 1;
    },
    boundsCheck: function(new_origin, new_zoom, element) {
        if(new_origin.x < 0) {
           new_origin.x = 0;
        } else if(new_origin.x + element.width / new_zoom > CA_TEXTURE_WIDTH) {
           new_origin.x = CA_TEXTURE_WIDTH - element.width / new_zoom;
        } 

        if(new_origin.y < 0) {
            new_origin.y = 0;
        }

        if(new_zoom < 1.5) {
            new_origin.x = Math.floor(new_origin.x);
            new_origin.y = Math.floor(new_origin.y);
        }
    },
    setupListeners: function(element) {
        element.addEventListener('mousemove', (event) => {
            const rect = element.getBoundingClientRect();
            
            const next_pos_x = event.clientX - rect.left;
            const next_pos_y = event.clientY - rect.top;

            const delta_x = next_pos_x - this.pos.x;
            const delta_y = next_pos_y - this.pos.y;

            if(this.dragging) {
                view_info.local_resource.origin.x -= delta_x / view_info.local_resource.zoom;
                view_info.local_resource.origin.y -= delta_y / view_info.local_resource.zoom;
                this.boundsCheck(view_info.local_resource.origin, view_info.local_resource.zoom, element);
            } 

        
            this.pos.x = next_pos_x;
            this.pos.y = next_pos_y;
        }, false);

        element.addEventListener('mousedown', (event) => {
            this.dragging = true;
        }, false);

        element.addEventListener('mouseleave', (event) => {
            this.dragging = false;
        }, false);

        element.addEventListener('mouseup', (event) => {
            this.dragging = false;
        }, false);

        element.addEventListener('wheel', (event) => {
            // Is this the worst relative zoom function ever made? Probably.

            const old_zoom = view_info.local_resource.zoom;
            const new_zoom = Math.min(Math.max(old_zoom * (1 - event.deltaY * 0.001), this.MIN_ZOOM), this.MAX_ZOOM);
            
            if(import.meta.env.DEV) console.log(`Zooming from ${old_zoom} to ${new_zoom}`);

            if(Math.abs(new_zoom - old_zoom) < 0.0001) return;

            const zoom_ratio = new_zoom / old_zoom;

            const old_offset = {
                x: this.pos.x / old_zoom,
                y: this.pos.y / old_zoom
            };
            // new_orgin = old_origin + old_offset - old_offset / zoom_ratio =
            //             old_origin + old_offset * (1 - 1 / zoom_ratio) =

            const new_origin = {
                x: view_info.local_resource.origin.x + old_offset.x * (1 - 1/zoom_ratio),
                y: view_info.local_resource.origin.y + old_offset.y * (1 - 1/zoom_ratio)
            };

            this.boundsCheck(new_origin, new_zoom, element);

            if(import.meta.env.DEV) console.log(`old_offset: ${JSON.stringify(old_offset)}, new_origin: ${JSON.stringify(new_origin)}`);

            view_info.local_resource.origin = new_origin;
            view_info.local_resource.zoom = new_zoom;
        });
    }
};