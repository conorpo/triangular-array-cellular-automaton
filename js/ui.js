import * as dat from 'dat.gui';

import taeca from './taeca.js';

import { ca_textures, rule_info } from './shared_resources.js';
import { color_map } from './stages/render.js';

import { single_1, random_state } from './states.js';

/**
 * @module ui
 */

/**
 * For now UI is handled by each module, so that structures dont need to be passed from each module to the UI module.
 * @function setupUI
 * @returns {dat.GUI} The dat.GUI instance.
*/



export function setupUI() {
    const gui = new dat.GUI({
        name: 'Cellular Automata'
    });

    gui.width = 200;

    //Rule Settings
    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();

    rule_info_folder.add(ca_textures.local_resource, 'top_row_initialization', ['Single k-1', 'Random']).name('Top Row Initialization').onChange(taeca.change_top_row);

    function ui_rule_info_update_attempt(k_changed) {
        if(taeca.attempt_rule_info_update(k_changed)) {
            rule_info_folder.domElement.children[0].style.color = "";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info";
        } else {
            rule_info_folder.domElement.children[0].style.color = "red";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info (Buffer Size Too Large)";
        }
    }
    
    rule_info_folder.add(rule_info.local_resource, 'r', 1, 6, 1).name('r (range)').onFinishChange(() => ui_rule_info_update_attempt(false));
    rule_info_folder.add(rule_info.local_resource, 'k', 2, 6, 1).name('k (states)').onFinishChange(() => ui_rule_info_update_attempt(true));
    rule_info_folder.add(taeca, 'new_rule').name('New Rule');

    gui.mouseOverRuleInfo = false;

    rule_info_folder.domElement.addEventListener('mouseover', () => {
        gui.mouseOverRuleInfo = true;
    });

    rule_info_folder.domElement.addEventListener('mouseout', () => {
        gui.mouseOverRuleInfo = false;
    });


    const style_folder = gui.addFolder('Style');
    style_folder.open();

    for(let i = 0; i < parseInt(import.meta.env.TCA_MAX_STATES); i++) {
        style_folder.addColor(color_map.local_resource, `COLOR_${i}`).name(`State ${i}`).onChange(color_map.update);
    }


    const rule_number_folder = gui.addFolder('Rule Number');
    rule_number_folder.open();
    const loadingGifEle = document.getElementById('loadingGif');

    const ruleNumberTextArea = document.getElementById("ruleTextarea")
    const ruleNumberDiv = document.getElementById("ruleImportExport");
    const closeRuleNumberButton = document.getElementById("closeRuleImportExport");

    closeRuleNumberButton.addEventListener('click', async () => {
        if(import_export.import_in_progress) {
            import_export.import_rule_handler();
        } else {
            ruleNumberDiv.classList.remove("active");
        }
    });

    const import_export = {
        currently_working: false,
        import_in_progress: false,
        export_rule_handler: async () => {
            if(import_export.currently_working) return;
            import_export.toggle_working();
            
            const rule_number = await taeca.get_rule_number();

            import_export.open_rule_number(false);
            ruleNumberTextArea.value = rule_number.toString();
                
            import_export.toggle_working();
        },
        import_rule_handler: async () => {
            if(import_export.currently_working) return;
            import_export.toggle_working();

            try {
                const rule_number = BigInt(ruleNumberTextArea.value);
                await taeca.set_rule_number(rule_number);
                ruleNumberDiv.classList.remove("active");
            } catch (e) {
                console.error(e);
                alert(e);
            } finally {
                import_export.toggle_working();
            }

        },
        open_rule_number: (importing = true) => {
            ruleNumberDiv.classList.add("active");
            ruleNumberTextArea.value = "";
            ruleNumberTextArea.readOnly = !importing;

            ruleNumberDiv.children[0].children[0].innerText = importing ? "Rule Number: (close to import)" : "Rule Number: ";

            import_export.import_in_progress = importing;
        },
        toggle_working: () => {
            import_export.currently_working = !import_export.currently_working;
            loadingGifEle.classList.toggle("active");
        }
    }

    rule_number_folder.add(import_export, 'export_rule_handler').name('Export Rule (SLOW)');
    rule_number_folder.add(import_export, 'open_rule_number').name('Import Rule (SLOWER)');



    return gui;
};
